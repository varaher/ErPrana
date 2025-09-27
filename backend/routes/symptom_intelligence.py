from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import os
import json
import asyncio
from dotenv import load_dotenv

# Import medical knowledge
import sys
sys.path.append('/app/backend')
from medical_knowledge.chest_pain import analyze_chest_pain_symptoms, CHEST_PAIN_KNOWLEDGE
from medical_knowledge.altered_mental_status import analyze_altered_mental_status, ALTERED_MENTAL_STATUS_KNOWLEDGE
from medical_knowledge.poisoning_toxidromes import analyze_poisoning_symptoms, POISONING_TOXIDROMES_KNOWLEDGE

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

class SymptomResponse(BaseModel):
    assistant_message: str
    updated_state: Dict[str, Any]
    next_question: Optional[str] = None
    assessment_ready: bool = False
    emergency_detected: bool = False

# Initialize LLM chat instances (we'll create new ones per session)
def create_symptom_chat(session_id: str) -> LlmChat:
    api_key = os.getenv('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    system_message = """You are ARYA, an advanced medical intake assistant with emergency medicine knowledge.

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
    ).with_model("openai", "gpt-4o-mini")
    
    return chat

def detect_emergency_keywords(message: str, conversation_state: dict) -> tuple[bool, str]:
    """Detect emergency situations before LLM processing"""
    message_lower = message.lower()
    
    # Critical device emergencies
    if any(device in conversation_state.get('medicalDevices', []) for device in ['LVAD', 'lvad', 'VAD']):
        if any(word in message_lower for word in ['alarm', 'ringing', 'beeping', 'alert']):
            return True, "🚨 **CRITICAL EMERGENCY** - LVAD alarm detected. This indicates a serious device malfunction that requires immediate medical attention. Call 911 or go to the nearest emergency room NOW. LVAD alarms can indicate pump failure, thrombosis, or power issues that can be life-threatening."
    
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
            return True, f"🚨 **MEDICAL EMERGENCY** - Your symptoms suggest a critical condition. Call 911 or go to the nearest emergency room immediately."
    
    # Device-specific keywords
    if 'lvad' in message_lower or 'ventricular assist' in message_lower:
        # Add LVAD to medical devices if not already there
        if 'medicalDevices' not in conversation_state:
            conversation_state['medicalDevices'] = []
        if 'LVAD' not in conversation_state['medicalDevices']:
            conversation_state['medicalDevices'].append('LVAD')
    
    return False, ""

@router.post("/analyze-symptom", response_model=SymptomResponse)
async def analyze_symptom_message(request: SymptomRequest):
    try:
        # Pre-screen for emergencies
        is_emergency, emergency_message = detect_emergency_keywords(request.user_message, request.conversation_state or {})
        
        if is_emergency:
            return SymptomResponse(
                assistant_message=emergency_message,
                updated_state=request.conversation_state or {},
                next_question=None,
                assessment_ready=False,
                emergency_detected=True
            )
        
        # Create chat instance for this session
        chat = create_symptom_chat(request.session_id)
        
        # Simple context message for now 
        context_message = f"""Current state: {json.dumps(request.conversation_state or {})}

User said: "{request.user_message}"

Please analyze this and respond with JSON in this format:
{{
    "message": "your response to the user",
    "updated_state": {{"chiefComplaint": "extracted complaint or existing", "fever": true/false/null, "pain": {{"hasPain": true/false/null}}}},
    "next_question": "next question to ask or null",
    "emergency": false
}}

Be intelligent: If user says "no pain" set pain.hasPain = false. If "no fever" set fever = false."""
        
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
            # Fallback response
            return SymptomResponse(
                assistant_message="I understand. Can you tell me more about when this started?",
                updated_state=request.conversation_state or {"chiefComplaint": request.user_message},
                next_question="When did your symptoms begin?",
                assessment_ready=False,
                emergency_detected=False
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
            emergency_detected=emergency
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