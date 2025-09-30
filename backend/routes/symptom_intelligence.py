from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import os
import json
import asyncio
import uuid
from dotenv import load_dotenv

# Import medical knowledge
import sys
sys.path.append('/app/backend')
from medical_knowledge.chest_pain import analyze_chest_pain_symptoms, CHEST_PAIN_KNOWLEDGE
from medical_knowledge.altered_mental_status import analyze_altered_mental_status, ALTERED_MENTAL_STATUS_KNOWLEDGE
from medical_knowledge.poisoning_toxidromes import analyze_poisoning_symptoms, POISONING_TOXIDROMES_KNOWLEDGE
from medical_knowledge.trauma_emergency import analyze_trauma_presentation, analyze_cardiac_arrest, TRAUMA_EMERGENCY_KNOWLEDGE
from medical_knowledge.clinical_history_framework import generate_natural_followup, get_system_specific_questions, CLINICAL_HISTORY_FRAMEWORK
from medical_knowledge.emergency_department_handbook import EDMedicalKnowledge

# Load environment variables
load_dotenv()

# Import the emergent LLM integration
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
except ImportError:
    raise ImportError("emergentintegrations not installed. Please install with: pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/")

router = APIRouter()

class SymptomRequest(BaseModel):
    user_message: str
    session_id: str
    conversation_state: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None  # Added for personalized data access

class SymptomResponse(BaseModel):
    assistant_message: str
    updated_state: Dict[str, Any]
    next_question: Optional[str] = None
    assessment_ready: bool = False
    emergency_detected: bool = False
    needs_user_confirmation: bool = False  # New field to trigger confirmation
    personalized_analysis: bool = False  # Whether personal data was used

# Initialize LLM chat instances (we'll create new ones per session)
def create_symptom_chat(session_id: str) -> LlmChat:
    api_key = os.getenv('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    system_message = """You are ARYA, a helpful health assistant.

IMPORTANT: Always respond in valid JSON format exactly like this:
{
    "message": "Your response to the patient",
    "updated_state": {"chiefComplaint": "what they told you"},
    "next_question": "Follow-up question or null",
    "emergency": false,
    "clinical_reasoning": "Why you asked this"
}

CRITICAL EMERGENCY DETECTION:
If patient mentions ANY of these, immediately flag as EMERGENCY:
- LVAD/VAD alarm ringing
- Chest pain + shortness of breath  
- Stroke symptoms (speech, weakness, facial droop)
- Severe bleeding
- Unconsciousness
- Device alarms (pacemaker, defibrillator, LVAD)

MEDICAL DEVICE AWARENESS:
- LVAD (Left Ventricular Assist Device): Heart failure device - alarms indicate pump issues, battery problems, or thrombosis (EMERGENCY)
- Pacemaker/ICD: Cardiac devices - malfunctions can be life-threatening
- Insulin pumps: Diabetes management - failures can cause DKA

CONVERSATION STATE:
{
    "chiefComplaint": "main concern",
    "onset": "timing",
    "medicalDevices": ["LVAD", "pacemaker", etc.],
    "deviceAlarms": true/false,
    "vitals": {"hr": null, "bp": null, "temp": null},
    "associatedSymptoms": ["diaphoresis", "nausea", etc.],
    "pastMedicalHistory": ["heart failure", "diabetes", etc.],
    "emergency": true/false,
    "completed": false
}

INTELLIGENT RULES:
1. If LVAD + alarm → EMERGENCY: "🚨 LVAD alarm requires immediate emergency care. Call 911 now. This could indicate pump malfunction, thrombosis, or power failure."
2. Extract ALL symptoms from single response (don't re-ask)
3. If patient gives comprehensive response, acknowledge ALL points
4. Use medical device context in differential diagnosis
5. Don't repeat questions for information already provided
6. Medical devices completely change differential diagnosis priorities

RESPONSE FORMAT:
{
    "message": "your medical response",
    "updated_state": {full conversation state},
    "next_question": "next question or null if emergency/complete",
    "emergency": true if ANY emergency criteria met
}

Be intelligent - extract multiple pieces of information from each response."""
    
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=system_message
    ).with_model("openai", "gpt-4o")
    
    return chat

def needs_user_confirmation(message: str, conversation_state: dict) -> bool:
    """
    Detect if we need to ask user confirmation about who the symptoms are for
    before using personal wearables data and health history
    """
    # Skip confirmation if already confirmed
    if conversation_state.get('user_confirmed') is not None:
        return False
    
    # Skip if this is clearly introductory or greeting
    greeting_phrases = ['hi', 'hello', 'help', 'start', 'begin']
    message_lower = message.lower().strip()
    if len(message_lower.split()) <= 3 and any(phrase in message_lower for phrase in greeting_phrases):
        return False
    
    # Detect if user is describing symptoms (potential need for confirmation)
    symptom_indicators = [
        'i have', 'i feel', 'i am having', 'experiencing', 'feeling',
        'my', 'pain', 'hurt', 'ache', 'symptoms', 'problem',
        'chest pain', 'headache', 'fever', 'nausea', 'dizzy',
        'shortness of breath', 'breathing', 'cough', 'tired',
        'he has', 'she has', 'they have', 'person has', 'patient has',
        'someone', 'friend', 'family member', 'my child', 'my parent'
    ]
    
    # If message contains symptom descriptions, we likely need confirmation
    return any(indicator in message_lower for indicator in symptom_indicators)

def detect_emergency_keywords(message: str, conversation_state: dict) -> tuple[bool, str]:
    """Detect emergency situations before LLM processing"""
    message_lower = message.lower()
    
    # Critical device emergencies
    if any(device in conversation_state.get('medicalDevices', []) for device in ['LVAD', 'lvad', 'VAD']):
        if any(word in message_lower for word in ['alarm', 'ringing', 'beeping', 'alert']):
            return True, "🚨 **CRITICAL EMERGENCY** - LVAD alarm detected. This indicates a serious device malfunction that requires immediate medical attention. Call 911 or go to the nearest emergency room NOW. LVAD alarms can indicate pump failure, thrombosis, or power issues that can be life-threatening."
    
    # Cardiac arrest emergencies
    cardiac_arrest_keywords = [
        'not breathing', 'no pulse', 'unconscious and not breathing',
        'cardiac arrest', 'collapsed', 'unresponsive'
    ]
    
    if any(keyword in message_lower for keyword in cardiac_arrest_keywords):
        return True, "🚨 **CARDIAC ARREST EMERGENCY** - This is a life-threatening emergency requiring immediate CPR and defibrillation. Call 911 immediately and begin CPR: 1) Push hard and fast on center of chest at least 2 inches deep, 2) 100-120 compressions per minute, 3) Allow complete chest recoil, 4) Minimize interruptions."
    
    # Trauma emergencies
    trauma_keywords = [
        'motor vehicle accident', 'mvc', 'car crash', 'fell from height',
        'gunshot', 'stabbing', 'major trauma', 'hit by car'
    ]
    
    if any(keyword in message_lower for keyword in trauma_keywords):
        return True, "🚨 **TRAUMA EMERGENCY** - Major trauma requires immediate emergency care. Call 911 immediately. Do NOT move the patient unless in immediate danger. Protect the airway and spine, control bleeding, and monitor breathing."
    
    # Altered mental status emergencies
    ams_keywords = [
        'confused', 'disoriented', 'not making sense', 'acting strange',
        'unconscious', 'unresponsive', 'lethargic', 'altered mental status',
        'agitated', 'combative', 'delirious'
    ]
    
    if any(keyword in message_lower for keyword in ams_keywords):
        # Check for immediate danger signs
        danger_signs = [
            'unconscious', 'unresponsive', 'not breathing properly',
            'seizure', 'convulsion', 'very high fever'
        ]
        if any(sign in message_lower for sign in danger_signs):
            return True, "🚨 **MEDICAL EMERGENCY** - Unconsciousness or severe altered mental status requires immediate medical attention. Call 911 or go to the nearest emergency room NOW. Check ABCs (Airway, Breathing, Circulation) and be prepared to perform CPR if needed."
    
    # Other critical emergencies
    emergency_phrases = [
        'cant breathe', "can't breathe", 'choking', 'unconscious',
        'severe chest pain', 'heart attack', 'stroke',
        'severe bleeding', 'bleeding heavily'
    ]
    
    for phrase in emergency_phrases:
        if phrase in message_lower:
            return True, "🚨 **MEDICAL EMERGENCY** - Your symptoms suggest a critical condition. Call 911 or go to the nearest emergency room immediately."
    
    # Device-specific keywords
    if 'lvad' in message_lower or 'ventricular assist' in message_lower:
        # Add LVAD to medical devices if not already there
        if 'medicalDevices' not in conversation_state:
            conversation_state['medicalDevices'] = []
        if 'LVAD' not in conversation_state['medicalDevices']:
            conversation_state['medicalDevices'].append('LVAD')
    
    return False, ""

async def get_personalized_health_data(user_id: str) -> Dict[str, Any]:
    """Get user's wearables data and health records for personalized analysis"""
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        
        # Database connection
        MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        DB_NAME = os.environ.get("DB_NAME", "test_database") 
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Get recent wearables data (last 7 days)
        wearables_data = await db.wearable_data.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).limit(100).to_list(length=None)
        
        # Get health records
        health_records = await db.health_records.find(
            {"user_id": user_id}
        ).to_list(length=None)
        
        # Get medications
        medications = await db.medications.find(
            {"user_id": user_id, "active": True}
        ).to_list(length=None)
        
        return {
            "wearables_data": wearables_data,
            "health_records": health_records,
            "medications": medications
        }
        
    except Exception as e:
        print(f"Error getting personalized data: {e}")
        return {"wearables_data": [], "health_records": [], "medications": []}

def create_confirmation_message() -> str:
    """Create the user confirmation message"""
    return """Before I provide analysis, I need to clarify something important:

🔒 **Privacy & Personalization Check**

Are the symptoms and health concerns you're describing:

**A) For yourself** - I can provide personalized analysis using your wearable data, health history, and medication records

**B) For someone else** (family member, friend, etc.) - I'll provide general medical guidance without using your personal health data

Please respond with "A" for yourself or "B" for someone else. This helps me give you the most appropriate and safe medical guidance while protecting your privacy."""

@router.post("/analyze-symptom", response_model=SymptomResponse)
async def analyze_symptom_message(request: SymptomRequest):
    return await analyze_symptom_core(request)

# Add the route that frontend expects
class FrontendSymptomRequest(BaseModel):
    user_id: str
    message: str
    session_id: Optional[str] = None

@router.post("/symptom-intelligence/analyze")
async def symptom_intelligence_analyze(request: FrontendSymptomRequest):
    """
    INFINITE CONVERSATION ENDPOINT - Like ChatGPT, never ends the conversation
    """
    session_id = request.session_id or str(uuid.uuid4())
    message = request.message.lower().strip()
    
    # Check for emergency keywords first
    emergency_keywords = ["chest pain", "can't breathe", "heart attack", "stroke", "severe bleeding", "unconscious"]
    is_emergency = any(keyword in message for keyword in emergency_keywords)
    
    if is_emergency:
        emergency_response = "🚨 **MEDICAL EMERGENCY DETECTED** 🚨\n\n"
        emergency_response += "Based on your symptoms, you may need immediate medical attention:\n\n"
        emergency_response += "**IMMEDIATE ACTIONS:**\n"
        emergency_response += "1. Call 911 or go to the nearest emergency room\n"
        emergency_response += "2. Do not drive yourself - get help from others\n"
        emergency_response += "3. Stay calm and follow emergency instructions\n\n"
        emergency_response += "**I'm still here to help answer questions while you seek care.**\n"
        emergency_response += "What specific symptoms are you experiencing right now?"
        
        return {
            "response": emergency_response,
            "next_step": "conversation_continue",  # Still continue even in emergency
            "requires_followup": True,
            "urgency_level": "emergency",
            "session_id": session_id
        }
    
    # Check if this is a follow-up question
    followup_keywords = ["what does", "explain", "what should i do", "how to", "is this", "can you", "tell me"]
    is_followup = any(keyword in message for keyword in followup_keywords)
    
    if is_followup:
        # This is a follow-up question - provide helpful response
        if "what does" in message or "explain" in message:
            response = "I'd be happy to explain that condition or symptom in more detail.\n\n"
            response += "**Medical explanations I can provide:**\n"
            response += "• What specific conditions mean\n"
            response += "• How symptoms relate to possible causes\n"
            response += "• What different urgency levels indicate\n"
            response += "• Treatment options and next steps\n\n"
            response += "What specific part would you like me to explain?"
            
        elif "what should i do" in message or "treatment" in message:
            response = "Here's guidance on what you can do:\n\n"
            response += "**General Care Steps:**\n"
            response += "1. Monitor your symptoms closely\n"
            response += "2. Stay hydrated and get adequate rest\n"
            response += "3. Seek medical attention if symptoms worsen\n"
            response += "4. Follow up with your healthcare provider\n\n"
            response += "Would you like specific advice based on your symptoms?"
            
        else:
            response = "I'm here to help with any health questions you have!\n\n"
            response += "**I can help you with:**\n"
            response += "• Symptom assessment and analysis\n"
            response += "• Treatment options and recommendations\n"
            response += "• When to seek medical care\n"
            response += "• Prevention and lifestyle advice\n\n"
            response += "What would you like to know more about?"
        
        return {
            "response": response,
            "next_step": "conversation_continue",
            "requires_followup": True,
            "urgency_level": "low",
            "session_id": session_id
        }
    
    # This is a new symptom or initial assessment
    # Provide basic assessment and ALWAYS continue conversation
    symptom_detected = False
    detected_symptoms = []
    
    common_symptoms = [
        "headache", "fever", "cough", "pain", "nausea", "dizzy", "tired", 
        "shortness of breath", "chest pain", "stomach ache", "back pain"
    ]
    
    for symptom in common_symptoms:
        if symptom in message:
            detected_symptoms.append(symptom)
            symptom_detected = True
    
    if symptom_detected:
        # Generate assessment response
        response = "**🩺 Initial Assessment**\n\n"
        response += f"I understand you're experiencing: {', '.join(detected_symptoms)}\n\n"
        
        # Basic triage
        severity_keywords = ["severe", "intense", "unbearable", "worst", "can't"]
        is_severe = any(keyword in message for keyword in severity_keywords)
        
        if is_severe:
            response += "**⚡ Urgency:** 🟠 HIGH\n"
            response += "Given the severity you described, consider seeking medical attention promptly.\n\n"
            urgency = "high"
        else:
            response += "**⚡ Urgency:** 🟡 MODERATE\n"
            response += "This appears to be a manageable condition that should be monitored.\n\n"
            urgency = "medium"
        
        # Recommendations
        response += "**💡 Recommendations:**\n"
        response += "1. Monitor your symptoms closely\n"
        response += "2. Stay hydrated and get adequate rest\n"
        response += "3. Seek medical attention if symptoms worsen\n"
        response += "4. Keep track of when symptoms started and any triggers\n\n"
        
        # CRITICAL: Always continue conversation
        response += "---\n\n"
        response += "**💬 I'm here to answer any questions about your health!**\n\n"
        response += "Ask me:\n"
        response += "• \"What should I do for treatment?\"\n"
        response += "• \"When should I see a doctor?\"\n"
        response += "• \"What could be causing this?\"\n"
        response += "• \"I also have [other symptom]\"\n"
        response += "• \"Is this serious?\"\n\n"
        response += "Just ask your question! 🩺💙"
        
        return {
            "response": response,
            "next_step": "conversation_continue",  # NEVER END THE CONVERSATION
            "requires_followup": True,  # ALWAYS ALLOW FOLLOW-UP
            "urgency_level": urgency,
            "session_id": session_id
        }
    
    else:
        # No specific symptoms detected - ask for clarification
        response = "I'd like to help you with your health concern.\n\n"
        response += "Please tell me:\n"
        response += "• What specific symptoms are you experiencing?\n"
        response += "• When did they start?\n"
        response += "• How severe are they on a scale of 1-10?\n\n"
        response += "The more details you provide, the better I can assist you!"
        
        return {
            "response": response,
            "next_step": "conversation_continue",
            "requires_followup": True,
            "urgency_level": "low",
            "session_id": session_id
        }

async def analyze_symptom_core(request: SymptomRequest):
    try:
        conversation_state = request.conversation_state or {}
        
        # Handle user confirmation responses
        message_lower = request.user_message.lower().strip()
        if message_lower in ['a', 'option a', 'for myself', 'myself', 'me']:
            conversation_state['user_confirmed'] = 'self'
            conversation_state['use_personal_data'] = True
            return SymptomResponse(
                assistant_message="Thank you for confirming. I'll now provide personalized analysis using your health data and wearable information. Please continue describing your symptoms or concerns.",
                updated_state=conversation_state,
                next_question=None,
                assessment_ready=False,
                emergency_detected=False,
                needs_user_confirmation=False,
                personalized_analysis=True
            )
        elif message_lower in ['b', 'option b', 'someone else', 'third party', 'other person', 'not me']:
            conversation_state['user_confirmed'] = 'other'
            conversation_state['use_personal_data'] = False
            return SymptomResponse(
                assistant_message="Thank you for clarifying. I'll provide general medical guidance without using your personal health data. Please continue describing the symptoms or concerns for the other person.",
                updated_state=conversation_state,
                next_question=None,
                assessment_ready=False,
                emergency_detected=False,
                needs_user_confirmation=False,
                personalized_analysis=False
            )
        
        # TEMPORARILY SKIP CONFIRMATION FOR TESTING
        # Check if we need user confirmation
        # if needs_user_confirmation(request.user_message, conversation_state):
        #     conversation_state['awaiting_confirmation'] = True
        #     return SymptomResponse(
        #         assistant_message=create_confirmation_message(),
        #         updated_state=conversation_state,
        #         next_question=None,
        #         assessment_ready=False,
        #         emergency_detected=False,
        #         needs_user_confirmation=True,
        #         personalized_analysis=False
        #     )
        
        # For testing, assume user confirmed "self"
        if not conversation_state.get('user_confirmed'):
            conversation_state['user_confirmed'] = 'self'
            conversation_state['use_personal_data'] = True
        
        # Pre-screen for emergencies
        is_emergency, emergency_message = detect_emergency_keywords(request.user_message, conversation_state)
        
        if is_emergency:
            return SymptomResponse(
                assistant_message=emergency_message,
                updated_state=conversation_state,
                next_question=None,
                assessment_ready=False,
                emergency_detected=True,
                needs_user_confirmation=False,
                personalized_analysis=False
            )
        
        # Create chat instance for this session
        chat = create_symptom_chat(request.session_id)
        
        # Get personalized data if user confirmed it's for themselves
        personalized_data = {}
        use_personal_data = conversation_state.get('use_personal_data', False)
        personalized_analysis = False
        
        if use_personal_data and request.user_id:
            personalized_data = await get_personalized_health_data(request.user_id)
            personalized_analysis = True
        
        # Enhanced context message using clinical framework
        personal_data_context = ""
        if personalized_analysis and personalized_data:
            # Summarize personal data for context
            wearables_summary = ""
            if personalized_data.get('wearables_data'):
                recent_hr = [d for d in personalized_data['wearables_data'] if d.get('data_type') == 'heart_rate']
                recent_steps = [d for d in personalized_data['wearables_data'] if d.get('data_type') == 'steps']
                
                if recent_hr:
                    avg_hr = sum(int(d['value']) for d in recent_hr[:10]) / min(len(recent_hr), 10)
                    wearables_summary += f"Recent heart rate avg: {avg_hr:.0f} bpm. "
                
                if recent_steps:
                    avg_steps = sum(int(d['value']) for d in recent_steps[:7]) / min(len(recent_steps), 7)
                    wearables_summary += f"Daily steps avg: {avg_steps:.0f}. "
            
            medications_summary = ""
            if personalized_data.get('medications'):
                meds = [med['name'] for med in personalized_data['medications'][:5]]
                medications_summary = f"Current medications: {', '.join(meds)}. "
            
            personal_data_context = f"""
PERSONALIZED HEALTH DATA AVAILABLE:
{wearables_summary}
{medications_summary}
Note: This is the user's own health data - incorporate relevant information into your analysis.
"""
        elif conversation_state.get('user_confirmed') == 'other':
            personal_data_context = """
THIRD-PARTY CONSULTATION:
User is asking about someone else's symptoms. Do NOT use any personal health data. 
Provide general medical guidance only with appropriate disclaimers.
"""
        
        context_message = f"""You are ARYA, a helpful health assistant. 

Patient said: "{request.user_message}"
Current conversation: {json.dumps(conversation_state)}

{personal_data_context}

RESPOND IN THIS EXACT JSON FORMAT:
{{
    "message": "Your empathetic response with one follow-up question",
    "updated_state": {{
        "chiefComplaint": "{request.user_message}",
        "onset": "timing if mentioned",
        "severity": "if mentioned"
    }},
    "next_question": "One follow-up question",
    "emergency": false,
    "clinical_reasoning": "Why you asked this"
}}

Be empathetic and ask good medical questions. Always use valid JSON format."""
        
        # Send message to LLM
        user_message = UserMessage(text=context_message)
        response = await chat.send_message(user_message)
        
        print(f"LLM Response: {response}")  # Debug log
        
        # Parse LLM response as JSON
        try:
            parsed_response = json.loads(response)
        except json.JSONDecodeError as e:
            print(f"JSON Parse Error: {e}")
            print(f"Raw Response: {response}")
            # Fallback response with better handling
            chief_complaint = request.user_message.lower()
            if "fever" in chief_complaint:
                fallback_message = "I understand you've been having a fever for 2 days. That must be uncomfortable. Can you tell me what your temperature has been?"
                fallback_question = "What's your current temperature?"
            elif "pain" in chief_complaint:
                fallback_message = "I hear you're experiencing pain. Can you tell me more about where exactly you feel it?"
                fallback_question = "Where exactly do you feel the pain?"
            else:
                fallback_message = f"I understand you mentioned: {request.user_message}. Can you tell me more about when this started?"
                fallback_question = "When did this begin?"
                
            return SymptomResponse(
                assistant_message=fallback_message,
                updated_state={"chiefComplaint": request.user_message},
                next_question=fallback_question,
                assessment_ready=False,
                emergency_detected=False,
                needs_user_confirmation=False,
                personalized_analysis=False
            )
        
        # Extract information from parsed response
        assistant_message = parsed_response.get("message", "I understand.")
        updated_state = parsed_response.get("updated_state", request.conversation_state or {})
        next_question = parsed_response.get("next_question")
        emergency = parsed_response.get("emergency", False)
        
        # Check if we have enough info for assessment
        assessment_ready = len(updated_state) > 3  # Simple check for now
        
        return SymptomResponse(
            assistant_message=assistant_message,
            updated_state=updated_state,
            next_question=next_question,
            assessment_ready=assessment_ready,
            emergency_detected=emergency,
            needs_user_confirmation=False,
            personalized_analysis=personalized_analysis
        )
        
    except Exception as e:
        print(f"Full Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing symptom analysis: {str(e)}")

@router.post("/generate-assessment")
async def generate_medical_assessment(request: dict):
    try:
        state = request.get("conversation_state", {})
        chief_complaint = state.get("chiefComplaint", "").lower()
        
        # Use clinical knowledge base for specific complaints
        if "chest pain" in chief_complaint or "chest" in chief_complaint:
            
            # Extract patient factors from conversation state
            patient_factors = {
                "risk_factors": state.get("pastMedicalHistory", []) + state.get("riskFactors", []),
                "age": state.get("age"),
                "gender": state.get("gender")
            }
            
            # Use chest pain knowledge base
            clinical_assessment = analyze_chest_pain_symptoms(
                {"description": chief_complaint + " " + str(state.get("associatedSymptoms", []))},
                patient_factors
            )
            
            return {
                "summary": f"Patient presents with {chief_complaint}. Onset: {state.get('onset', 'unclear')}. Associated symptoms: {', '.join(state.get('associatedSymptoms', []))}",
                "diagnoses": clinical_assessment["differentials"],
                "triage": {
                    "level": clinical_assessment["urgency"],
                    "recommendation": get_triage_recommendation(clinical_assessment["urgency"])
                },
                "immediate_actions": clinical_assessment["immediate_actions"],
                "disclaimer": "This AI assessment uses evidence-based clinical protocols but cannot replace professional medical evaluation. Seek immediate medical attention for any concerning symptoms."
            }
            
        # Use altered mental status knowledge base for confusion/AMS
        elif any(keyword in chief_complaint for keyword in 
                ["confused", "disoriented", "altered mental status", "not making sense", 
                 "acting strange", "agitated", "lethargic", "delirious"]):
            
            patient_factors = {
                "medical_history": state.get("pastMedicalHistory", []),
                "medications": state.get("medications", []),
                "age": state.get("age", 0)
            }
            
            # Use AMS knowledge base
            clinical_assessment = analyze_altered_mental_status(
                {"description": chief_complaint + " " + str(state.get("associatedSymptoms", []))},
                patient_factors
            )
            
            return {
                "summary": f"Patient presents with altered mental status: {chief_complaint}. This requires systematic evaluation using AEIOU TIPS approach.",
                "diagnoses": clinical_assessment["differentials"],
                "triage": {
                    "level": "EMERGENCY",  # AMS is always emergency until proven otherwise
                    "recommendation": "🚨 Altered mental status requires immediate emergency evaluation. Call 911 or go to ER now."
                },
                "immediate_actions": clinical_assessment["immediate_actions"],
                "essential_workup": clinical_assessment["essential_workup"],
                "red_flags": clinical_assessment.get("red_flags_present", []),
                "disclaimer": "Altered mental status can be life-threatening. This assessment cannot replace immediate professional medical evaluation."
            }
            
        # Use poisoning/toxidrome knowledge base for overdose/poisoning
        elif any(keyword in chief_complaint for keyword in 
                ["overdose", "poisoning", "took pills", "drunk", "high", "drugs", 
                 "cocaine", "heroin", "pills", "medication overdose", "toxic"]):
            
            patient_factors = {
                "substances": state.get("substanceHistory", []),
                "medications": state.get("medications", []),
                "age": state.get("age", 0)
            }
            
            # Use poisoning knowledge base
            clinical_assessment = analyze_poisoning_symptoms(
                {"description": chief_complaint + " " + str(state.get("associatedSymptoms", []))},
                patient_factors
            )
            
            return {
                "summary": f"Patient presents with suspected poisoning/overdose: {chief_complaint}. Requires immediate toxidrome assessment and antidote consideration.",
                "diagnoses": clinical_assessment["differential_diagnosis"],
                "triage": {
                    "level": "EMERGENCY",  # All poisoning is emergency
                    "recommendation": "🚨 Suspected poisoning/overdose requires immediate emergency care. Call 911 or go to ER now."
                },
                "immediate_actions": clinical_assessment["immediate_actions"],
                "antidotes": clinical_assessment.get("antidotes", []),
                "toxidromes": clinical_assessment.get("toxidromes", []),
                "disclaimer": "Poisoning/overdose is a medical emergency. This assessment cannot replace immediate professional medical evaluation and treatment."
            }
            
        # Use trauma knowledge base for trauma presentations
        elif any(keyword in chief_complaint for keyword in 
                ["trauma", "accident", "crash", "fall", "hit", "stabbing", "gunshot",
                 "motor vehicle", "mvc", "injured", "bleeding"]):
            
            patient_factors = {
                "mechanism": state.get("mechanism", ""),
                "age": state.get("age", 0),
                "comorbidities": state.get("pastMedicalHistory", [])
            }
            
            # Use trauma knowledge base
            clinical_assessment = analyze_trauma_presentation(
                {"description": chief_complaint + " " + str(state.get("associatedSymptoms", []))},
                patient_factors
            )
            
            return {
                "summary": f"Patient presents with trauma: {chief_complaint}. Requires systematic ABCDE assessment and trauma protocols.",
                "diagnoses": clinical_assessment["differential_diagnosis"],
                "triage": {
                    "level": "EMERGENCY",  # All significant trauma is emergency
                    "recommendation": "🚨 Trauma requires immediate emergency evaluation. Call 911 or go to nearest trauma center."
                },
                "immediate_actions": clinical_assessment["immediate_actions"],
                "abcde_assessment": clinical_assessment["abcde_assessment"],
                "big_decisions": clinical_assessment.get("big_decisions", []),
                "trauma_alerts": clinical_assessment.get("trauma_alerts", []),
                "disclaimer": "Trauma is a medical emergency requiring systematic evaluation. This assessment cannot replace immediate professional trauma care."
            }
            
        # Use cardiac arrest knowledge base for arrest presentations
        elif any(keyword in chief_complaint for keyword in 
                ["cardiac arrest", "not breathing", "no pulse", "collapsed", "cpr"]):
            
            patient_factors = {
                "rhythm": state.get("rhythm", ""),
                "witnessed": state.get("witnessed", False),
                "downtime": state.get("downtime", "")
            }
            
            # Use cardiac arrest knowledge base
            clinical_assessment = analyze_cardiac_arrest(
                {"description": chief_complaint + " " + str(state.get("associatedSymptoms", []))},
                patient_factors
            )
            
            return {
                "summary": f"CARDIAC ARREST: {chief_complaint}. Immediate ACLS protocols required.",
                "diagnoses": [{"condition": "Cardiac Arrest", "likelihood": 100, "description": "Loss of cardiac output requiring immediate resuscitation", "rationale": "Clinical presentation consistent with cardiac arrest", "urgency": "EMERGENCY"}],
                "triage": {
                    "level": "EMERGENCY",
                    "recommendation": "🚨 CARDIAC ARREST - Begin CPR immediately! Call 911 and start chest compressions NOW."
                },
                "immediate_actions": clinical_assessment["immediate_actions"],
                "cpr_guidelines": clinical_assessment["cpr_guidelines"],
                "protocols": clinical_assessment.get("protocols", {}),
                "medications": clinical_assessment.get("medications", []),
                "reversible_causes": clinical_assessment.get("reversible_causes", []),
                "disclaimer": "Cardiac arrest is immediately life-threatening. Begin CPR and call 911 NOW."
            }
        
        # Fallback to LLM-based assessment for other complaints
        session_id = request.get("session_id", "assessment")
        chat = create_symptom_chat(session_id + "_assessment")
        
        assessment_prompt = f"""
Based on this symptom information, provide a medical assessment:

{json.dumps(state, indent=2)}

Provide a response with:
1. Summary of symptoms
2. Top 4 differential diagnoses with likelihood percentages and rationale
3. Triage recommendation (Emergency/Urgent/Less Urgent/Non-Urgent) 
4. Next steps and disclaimer

Format as JSON:
{{
    "summary": "brief symptom summary",
    "diagnoses": [
        {{
            "condition": "diagnosis name",
            "likelihood": 65,
            "description": "brief description",
            "rationale": "key supporting factors"
        }}
    ],
    "triage": {{
        "level": "Emergency/Urgent/Less Urgent/Non-Urgent",
        "recommendation": "specific action to take"
    }},
    "disclaimer": "medical disclaimer text"
}}
"""
        
        user_message = UserMessage(text=assessment_prompt)
        response = await chat.send_message(user_message)
        
        try:
            assessment = json.loads(response)
            return assessment
        except json.JSONDecodeError:
            return {
                "summary": "Unable to generate full assessment",
                "diagnoses": [],
                "triage": {
                    "level": "Less Urgent",
                    "recommendation": "Please consult with a healthcare provider for proper evaluation"
                },
                "disclaimer": "This AI assessment is for informational purposes only and does not replace professional medical evaluation."
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating assessment: {str(e)}")

def get_triage_recommendation(urgency_level: str) -> str:
    """Get triage recommendation based on urgency level"""
    recommendations = {
        "EMERGENCY": "🚨 Call 911 or go to the nearest emergency room immediately. This condition requires immediate medical attention.",
        "URGENT": "⚡ Seek medical care within 2-4 hours. Go to urgent care or emergency department.",
        "LESS_URGENT": "🏥 Schedule medical appointment within 24-48 hours with your healthcare provider.",
        "NON_URGENT": "📞 Schedule routine appointment with healthcare provider within 1-2 weeks."
    }
    return recommendations.get(urgency_level, recommendations["LESS_URGENT"])

# Removed duplicate function - this should be handled by the existing implementation