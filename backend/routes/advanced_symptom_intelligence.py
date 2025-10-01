from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import os
import json
import uuid
import re
from datetime import datetime, timezone
from dotenv import load_dotenv

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
    user_id: Optional[str] = None

class SymptomResponse(BaseModel):
    assistant_message: str
    updated_state: Dict[str, Any]
    next_step: str  # followup_questions, conversation_continue, emergency_assessment, assessment_complete
    emergency_detected: bool = False
    all_symptoms_collected: bool = False
    recommendations: Optional[List[Dict[str, Any]]] = None

class ConversationState:
    """Manages conversation state and symptom collection"""
    
    def __init__(self, state_dict: Optional[Dict[str, Any]] = None):
        self.state = state_dict or {
            "collected_symptoms": [],
            "chief_complaint": "",
            "conversation_history": [],
            "emergency_flags": [],
            "symptom_collection_complete": False,
            "assessment_generated": False,
            "session_started": datetime.now(timezone.utc).isoformat()
        }
    
    def add_symptom(self, symptom: str, details: Optional[str] = None):
        """Add a new symptom to the collection"""
        symptom_entry = {
            "symptom": symptom.lower().strip(),
            "details": details or "",
            "collected_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Avoid duplicates
        existing_symptoms = [s["symptom"] for s in self.state["collected_symptoms"]]
        if symptom.lower().strip() not in existing_symptoms:
            self.state["collected_symptoms"].append(symptom_entry)
    
    def add_conversation_turn(self, user_input: str, assistant_response: str):
        """Add conversation turn to history"""
        self.state["conversation_history"].append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user": user_input,
            "assistant": assistant_response
        })
    
    def mark_symptom_collection_complete(self):
        """Mark that all symptoms have been collected"""
        self.state["symptom_collection_complete"] = True
    
    def get_all_symptoms(self) -> List[str]:
        """Get all collected symptoms as list"""
        return [s["symptom"] for s in self.state["collected_symptoms"]]
    
    def is_symptom_collection_complete(self) -> bool:
        """Check if symptom collection is complete"""
        return self.state.get("symptom_collection_complete", False)

class MultiSymptomDetector:
    """Detects multiple symptoms in user input"""
    
    def __init__(self):
        # Phrases that indicate multiple symptoms
        self.multi_symptom_phrases = [
            r"also have",
            r"along with", 
            r"other symptoms",
            r"and also",
            r"additionally",
            r"as well as",
            r"plus i have",
            r"together with",
            r"combined with",
            r"accompanied by",
            r"i also feel",
            r"another thing is"
        ]
        
        # Common symptom keywords
        self.symptom_keywords = [
            "pain", "ache", "hurt", "sore", "burning", "sharp", "dull", "throbbing",
            "fever", "temperature", "chills", "sweating", "hot", "cold",
            "nausea", "vomiting", "throw up", "sick", "queasy",
            "headache", "head pain", "migraine",
            "dizziness", "dizzy", "lightheaded", "spinning", "vertigo",
            "fatigue", "tired", "exhausted", "weak", "weakness",
            "shortness of breath", "breathless", "breathing", "wheezing",
            "cough", "coughing", "phlegm", "congestion",
            "abdominal pain", "stomach pain", "belly pain", "cramping",
            "chest pain", "chest discomfort", "chest tightness",
            "joint pain", "muscle pain", "back pain", "neck pain",
            "rash", "itching", "swelling", "inflammation"
        ]
    
    def detect_multiple_symptoms(self, text: str) -> Dict[str, Any]:
        """Detect if user is describing multiple symptoms"""
        text_lower = text.lower()
        
        # Check for multi-symptom indicator phrases
        has_multi_indicator = any(
            re.search(phrase, text_lower) for phrase in self.multi_symptom_phrases
        )
        
        # Count symptom keywords
        symptom_count = sum(
            1 for keyword in self.symptom_keywords 
            if keyword in text_lower
        )
        
        # Extract individual symptoms
        detected_symptoms = []
        for keyword in self.symptom_keywords:
            if keyword in text_lower:
                # Try to extract context around the symptom
                pattern = rf'(.{{0,20}}){re.escape(keyword)}(.{{0,20}})'
                match = re.search(pattern, text_lower)
                if match:
                    context = match.group(0).strip()
                    detected_symptoms.append({
                        "symptom": keyword,
                        "context": context
                    })
        
        return {
            "has_multiple_symptoms": has_multi_indicator or symptom_count > 1,
            "symptom_count": symptom_count,
            "detected_symptoms": detected_symptoms,
            "multi_symptom_indicators": [
                phrase for phrase in self.multi_symptom_phrases 
                if re.search(phrase, text_lower)
            ]
        }

class EmergencyDetector:
    """Detects emergency situations"""
    
    def __init__(self):
        self.emergency_keywords = {
            "cardiac": [
                "chest pain", "heart attack", "cardiac arrest", "no pulse",
                "severe chest pain", "crushing chest pain", "chest tightness with sweating"
            ],
            "respiratory": [
                "can't breathe", "cannot breathe", "choking", "severe shortness of breath",
                "turning blue", "gasping for air"
            ],
            "neurological": [
                "stroke", "facial droop", "sudden weakness", "sudden confusion",
                "severe headache", "unconscious", "seizure", "convulsion"
            ],
            "trauma": [
                "severe bleeding", "heavy bleeding", "major accident", "head injury",
                "broken bones", "unconscious from fall"
            ],
            "overdose": [
                "overdose", "too many pills", "poisoning", "ingested poison"
            ]
        }
    
    def detect_emergency(self, text: str, symptoms: List[str]) -> Dict[str, Any]:
        """Detect if emergency care is needed"""
        text_lower = text.lower()
        all_symptoms_text = " ".join(symptoms + [text_lower])
        
        emergency_flags = []
        
        for category, keywords in self.emergency_keywords.items():
            for keyword in keywords:
                if keyword in all_symptoms_text:
                    emergency_flags.append({
                        "category": category,
                        "keyword": keyword,
                        "severity": "high"
                    })
        
        is_emergency = len(emergency_flags) > 0
        
        return {
            "is_emergency": is_emergency,
            "emergency_flags": emergency_flags,
            "emergency_message": self._generate_emergency_message(emergency_flags) if is_emergency else None
        }
    
    def _generate_emergency_message(self, flags: List[Dict[str, Any]]) -> str:
        """Generate appropriate emergency message"""
        if not flags:
            return ""
        
        primary_flag = flags[0]
        category = primary_flag["category"]
        
        base_message = "🚨 **MEDICAL EMERGENCY DETECTED** 🚨\n\n"
        
        if category == "cardiac":
            return base_message + "Your symptoms suggest a possible cardiac emergency. **Call 911 immediately** or go to the nearest emergency room. Do not drive yourself."
        elif category == "respiratory":
            return base_message + "Severe breathing difficulties require immediate medical attention. **Call 911 now** - this could be life-threatening."
        elif category == "neurological":
            return base_message + "Neurological symptoms like these need immediate evaluation. **Call 911 immediately** - time is critical for conditions like stroke."
        elif category == "trauma":
            return base_message + "Severe trauma requires immediate emergency care. **Call 911 now** and do not move unless in immediate danger."
        elif category == "overdose":
            return base_message + "Suspected overdose is a medical emergency. **Call 911 immediately** or contact Poison Control: 1-800-222-1222."
        
        return base_message + "**Call 911 immediately** - your symptoms require immediate medical evaluation."

class RecommendationGenerator:
    """Generates point-wise recommendations with reasoning"""
    
    def generate_recommendations(self, symptoms: List[str], emergency_detected: bool = False) -> List[Dict[str, Any]]:
        """Generate numbered recommendations grouped by timeframe"""
        
        if emergency_detected:
            return [{
                "number": 1,
                "timeframe": "immediate",
                "recommendation": "Call 911 or go to nearest emergency room immediately",
                "reasoning": "Emergency symptoms detected that require immediate medical intervention",
                "priority": "critical"
            }]
        
        recommendations = []
        counter = 1
        
        # Immediate recommendations (0-1 hour)
        immediate_recs = self._get_immediate_recommendations(symptoms)
        for rec in immediate_recs:
            recommendations.append({
                "number": counter,
                "timeframe": "immediate",
                "recommendation": rec["text"],
                "reasoning": rec["reason"],
                "priority": "high"
            })
            counter += 1
        
        # Short-term recommendations (1-24 hours) 
        short_term_recs = self._get_short_term_recommendations(symptoms)
        for rec in short_term_recs:
            recommendations.append({
                "number": counter,
                "timeframe": "short-term",
                "recommendation": rec["text"],
                "reasoning": rec["reason"],
                "priority": "medium"
            })
            counter += 1
        
        # Long-term recommendations (1+ days)
        long_term_recs = self._get_long_term_recommendations(symptoms)
        for rec in long_term_recs:
            recommendations.append({
                "number": counter,
                "timeframe": "long-term", 
                "recommendation": rec["text"],
                "reasoning": rec["reason"],
                "priority": "low"
            })
            counter += 1
        
        return recommendations
    
    def _get_immediate_recommendations(self, symptoms: List[str]) -> List[Dict[str, str]]:
        """Get immediate action recommendations"""
        recs = []
        symptoms_text = " ".join(symptoms).lower()
        
        if any(symptom in symptoms_text for symptom in ["fever", "temperature", "chills"]):
            recs.append({
                "text": "Monitor your temperature and stay hydrated",
                "reason": "Fever can lead to dehydration and needs monitoring for changes"
            })
        
        if any(symptom in symptoms_text for symptom in ["nausea", "vomiting", "stomach"]):
            recs.append({
                "text": "Stay hydrated with small sips of clear fluids",
                "reason": "Nausea and vomiting can quickly lead to dehydration"
            })
        
        if any(symptom in symptoms_text for symptom in ["pain", "ache", "hurt"]):
            recs.append({
                "text": "Apply appropriate pain management (ice, heat, or over-the-counter medication as appropriate)",
                "reason": "Early pain management can prevent worsening and improve comfort"
            })
        
        # Always include general immediate care
        recs.append({
            "text": "Rest and avoid strenuous activities",
            "reason": "Rest allows your body to focus energy on healing and recovery"
        })
        
        return recs[:2]  # Limit to top 2 immediate recommendations
    
    def _get_short_term_recommendations(self, symptoms: List[str]) -> List[Dict[str, str]]:
        """Get short-term recommendations (within 24 hours)"""
        recs = []
        symptoms_text = " ".join(symptoms).lower()
        
        # If multiple symptoms or concerning combinations
        if len(symptoms) > 1:
            recs.append({
                "text": "Contact your healthcare provider or seek medical evaluation",
                "reason": "Multiple symptoms together may indicate a condition requiring professional assessment"
            })
        
        if any(symptom in symptoms_text for symptom in ["abdominal", "stomach", "belly"]):
            recs.append({
                "text": "Follow a bland diet (BRAT: bananas, rice, applesauce, toast)",
                "reason": "Bland foods are easier to digest and less likely to worsen gastrointestinal symptoms"
            })
        
        if any(symptom in symptoms_text for symptom in ["headache", "head pain"]):
            recs.append({
                "text": "Ensure adequate hydration and consider tension-reducing activities",
                "reason": "Dehydration and tension are common headache triggers that can be addressed"
            })
        
        return recs
    
    def _get_long_term_recommendations(self, symptoms: List[str]) -> List[Dict[str, str]]:
        """Get long-term management recommendations"""
        recs = []
        
        recs.append({
            "text": "Schedule follow-up with your primary healthcare provider",
            "reason": "Ongoing symptoms should be evaluated by a healthcare professional for proper diagnosis"
        })
        
        recs.append({
            "text": "Keep a symptom diary to track patterns and triggers",
            "reason": "Tracking symptoms helps identify patterns that can aid in diagnosis and treatment"
        })
        
        recs.append({
            "text": "Maintain healthy lifestyle habits (adequate sleep, nutrition, stress management)",
            "reason": "Good lifestyle habits support immune function and overall recovery"
        })
        
        return recs

class FallbackSystem:
    """Handles responses when LLM is unavailable"""
    
    def __init__(self):
        self.symptom_responses = {
            "fever": "I understand you have a fever. This can be concerning, especially if it's high or persistent. Can you tell me what your temperature has been and how long you've had it?",
            "pain": "I hear you're experiencing pain. Pain can be your body's way of signaling something needs attention. Where exactly is the pain located, and how would you describe it?",
            "headache": "Headaches can have many causes. Can you describe the type of pain (throbbing, sharp, dull) and where exactly it's located?",
            "nausea": "Nausea can be quite uncomfortable. Are you also experiencing vomiting, and do you have any idea what might have triggered it?",
            "dizziness": "Dizziness can be concerning. Can you describe if it feels like the room is spinning, or more like lightheadedness?"
        }
    
    def generate_fallback_response(self, user_message: str, symptoms: List[str]) -> Dict[str, Any]:
        """Generate response when LLM is unavailable"""
        
        # Detect emergency even without LLM
        emergency_detector = EmergencyDetector()
        emergency_result = emergency_detector.detect_emergency(user_message, symptoms)
        
        if emergency_result["is_emergency"]:
            return {
                "message": emergency_result["emergency_message"],
                "next_step": "emergency_assessment",
                "emergency_detected": True
            }
        
        # Detect symptoms in message
        multi_detector = MultiSymptomDetector()
        symptom_analysis = multi_detector.detect_multiple_symptoms(user_message)
        
        # Generate basic response
        message = "I understand you're experiencing some health concerns. "
        
        if symptom_analysis["has_multiple_symptoms"]:
            message += "It sounds like you have several symptoms. Let me help you work through them one by one. "
            message += f"I can see you mentioned: {', '.join([s['symptom'] for s in symptom_analysis['detected_symptoms'][:3]])}. "
            
            # Ask for more details about the most concerning symptom
            primary_symptom = symptom_analysis['detected_symptoms'][0]['symptom'] if symptom_analysis['detected_symptoms'] else ""
            if primary_symptom in self.symptom_responses:
                message += self.symptom_responses[primary_symptom]
            else:
                message += f"Can you tell me more about your {primary_symptom}? When did it start and how severe is it?"
        else:
            # Single symptom handling
            detected = False
            for symptom_key, response in self.symptom_responses.items():
                if symptom_key in user_message.lower():
                    message += response
                    detected = True
                    break
            
            if not detected:
                message += "Can you tell me more about what you're experiencing? When did it start, and how would you describe it?"
        
        return {
            "message": message,
            "next_step": "conversation_continue",
            "emergency_detected": False
        }

# Initialize systems
multi_symptom_detector = MultiSymptomDetector()
emergency_detector = EmergencyDetector()
recommendation_generator = RecommendationGenerator()
fallback_system = FallbackSystem()

def create_llm_chat(session_id: str) -> LlmChat:
    """Create LLM chat instance"""
    api_key = os.getenv('EMERGENT_LLM_KEY')
    if not api_key:
        raise ValueError("LLM API key not configured")
    
    system_message = """You are ARYA, an advanced medical AI assistant. Focus on comprehensive symptom collection and analysis.

PRIMARY GOAL: Collect ALL symptoms before making any assessment.

CORE RULES:
1. Be empathetic and professional
2. Ask one clear follow-up question at a time  
3. Acknowledge what the user has told you
4. Don't repeat questions about information already provided
5. If user mentions multiple symptoms, acknowledge ALL of them
6. Never provide recommendations until you have complete symptom picture

TEMPERATURE RECOGNITION:
- Accept: "102f", "102 degree", "102 fahrenheit", "102F", "102°F", "102 faranheet"
- Convert and acknowledge: "That's a significant fever at 102°F (38.9°C)"

CONVERSATION FLOW:
- Symptom Collection → Details → More symptoms? → Assessment
- Always ask: "Are there any other symptoms?" before final assessment

RESPONSE STYLE:
- Natural, conversational responses
- Acknowledge their specific details
- Ask targeted follow-up questions
- Show medical understanding

Example responses:
"I understand you've had a fever of 102°F for 2 days. That must be quite uncomfortable. Since paracetamol helps temporarily, it suggests your body is fighting something. Are you experiencing any other symptoms along with the fever - such as headache, body aches, nausea, or changes in appetite?"

Be natural and helpful, not robotic."""
    
    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=system_message
    ).with_model("openai", "gpt-4o")
    
    return chat

@router.post("/symptom-intelligence/analyze", response_model=SymptomResponse)
async def advanced_symptom_analysis(request: SymptomRequest):
    """Advanced symptom intelligence with comprehensive multi-symptom handling"""
    
    try:
        # Initialize conversation state
        conv_state = ConversationState(request.conversation_state)
        user_message = request.user_message.strip()
        
        # Multi-symptom detection
        symptom_analysis = multi_symptom_detector.detect_multiple_symptoms(user_message)
        
        # Extract and add new symptoms
        for symptom_info in symptom_analysis["detected_symptoms"]:
            conv_state.add_symptom(symptom_info["symptom"], symptom_info["context"])
        
        # Emergency detection
        all_symptoms = conv_state.get_all_symptoms()
        emergency_result = emergency_detector.detect_emergency(user_message, all_symptoms)
        
        # If emergency detected, return immediate emergency response
        if emergency_result["is_emergency"]:
            conv_state.state["emergency_flags"] = emergency_result["emergency_flags"]
            conv_state.add_conversation_turn(user_message, emergency_result["emergency_message"])
            
            return SymptomResponse(
                assistant_message=emergency_result["emergency_message"],
                updated_state=conv_state.state,
                next_step="emergency_assessment",
                emergency_detected=True,
                all_symptoms_collected=False
            )
        
        # Try LLM analysis first
        try:
            chat = create_llm_chat(request.session_id)
            
            # Create enhanced prompt with symptom collection context
            enhanced_prompt = f"""Patient says: "{user_message}"

Context:
- Current symptoms collected: {', '.join(all_symptoms) if all_symptoms else 'None yet'}
- Conversation turn: {len(conv_state.state['conversation_history']) + 1}
- New symptoms detected: {[s['symptom'] for s in symptom_analysis['detected_symptoms']]}

Please provide an empathetic, medical response that:
1. Acknowledges what they've shared
2. Asks one specific follow-up question
3. Recognizes temperature formats like "102f", "102 degree", etc.

Keep it natural and conversational."""
            
            user_msg = UserMessage(text=enhanced_prompt)
            llm_response = await chat.send_message(user_msg)
            
            # Use the LLM response directly (no JSON parsing)
            assistant_message = llm_response.strip()
            
            # Enhanced conversation logic
            turn_count = len(conv_state.state['conversation_history'])
            
            # Determine if we should generate recommendations
            should_assess = False
            
            # Check if user is asking for advice/recommendations
            asking_for_advice = any(phrase in user_message.lower() for phrase in [
                "what should i do", "what do you recommend", "help me", "advice", 
                "treatment", "medication", "doctor", "hospital"
            ])
            
            # Generate recommendations if they're asking for advice and we have symptoms
            if asking_for_advice and len(all_symptoms) > 0:
                should_assess = True
                conv_state.mark_symptom_collection_complete()
            
            # Or if we have multiple conversation turns with symptoms
            elif len(all_symptoms) > 0 and turn_count >= 3:
                should_assess = True
                conv_state.mark_symptom_collection_complete()
            
            conv_state.add_conversation_turn(user_message, assistant_message)
            
            # Generate recommendations if appropriate
            recommendations = None
            next_step = "conversation_continue"
            
            if should_assess:
                recommendations = recommendation_generator.generate_recommendations(
                    all_symptoms, emergency_result["is_emergency"]
                )
                next_step = "assessment_ready"
            
            return SymptomResponse(
                assistant_message=assistant_message,
                updated_state=conv_state.state,
                next_step=next_step,
                emergency_detected=False,
                all_symptoms_collected=should_assess,
                recommendations=recommendations
            )
            
        except Exception as llm_error:
            print(f"LLM error: {llm_error}, falling back to rule-based system")
            
            # Use fallback system
            fallback_response = fallback_system.generate_fallback_response(user_message, all_symptoms)
            conv_state.add_conversation_turn(user_message, fallback_response["message"])
            
            return SymptomResponse(
                assistant_message=fallback_response["message"],
                updated_state=conv_state.state,
                next_step=fallback_response["next_step"],
                emergency_detected=fallback_response["emergency_detected"],
                all_symptoms_collected=False
            )
        
    except Exception as e:
        print(f"Error in advanced symptom analysis: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing symptom analysis: {str(e)}")

@router.post("/conversation/continue")
async def continue_conversation(request: SymptomRequest):
    """Continue the conversation flow"""
    return await advanced_symptom_analysis(request)

@router.post("/followup-questions")
async def generate_followup_questions(request: SymptomRequest):
    """Generate targeted follow-up questions"""
    
    conv_state = ConversationState(request.conversation_state)
    symptoms = conv_state.get_all_symptoms()
    
    # Generate follow-up questions based on symptoms
    questions = []
    
    if not symptoms:
        questions.append("Can you describe your main concern or symptoms?")
    else:
        for symptom in symptoms[:2]:  # Focus on top 2 symptoms
            if "pain" in symptom:
                questions.append(f"Can you describe the {symptom} - is it sharp, dull, throbbing? When did it start?")
            elif "fever" in symptom:
                questions.append(f"What's your temperature been, and how long have you had the fever?")
            elif "nausea" in symptom:
                questions.append(f"Are you also vomiting? What might have triggered the nausea?")
        
        questions.append("Are there any other symptoms you'd like to mention?")
    
    return {
        "questions": questions,
        "current_symptoms": symptoms,
        "next_step": "conversation_continue"
    }

@router.post("/emergency-assessment")
async def emergency_assessment(request: SymptomRequest):
    """Provide emergency assessment and recommendations"""
    
    conv_state = ConversationState(request.conversation_state)
    symptoms = conv_state.get_all_symptoms()
    
    # Check for emergency
    emergency_result = emergency_detector.detect_emergency(request.user_message, symptoms)
    
    if emergency_result["is_emergency"]:
        recommendations = [{
            "number": 1,
            "timeframe": "immediate",
            "recommendation": "Call 911 or go to nearest emergency room immediately",
            "reasoning": "Emergency symptoms detected requiring immediate medical intervention",
            "priority": "critical"
        }]
        
        return {
            "emergency_detected": True,
            "emergency_message": emergency_result["emergency_message"],
            "recommendations": recommendations,
            "next_step": "emergency_care"
        }
    
    # Non-emergency assessment
    recommendations = recommendation_generator.generate_recommendations(symptoms, False)
    
    return {
        "emergency_detected": False,
        "recommendations": recommendations,
        "symptoms_assessed": symptoms,
        "next_step": "follow_recommendations"
    }

# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check for the advanced symptom intelligence system"""
    return {
        "status": "healthy",
        "service": "advanced_symptom_intelligence",
        "version": "1.0",
        "capabilities": [
            "multi_symptom_detection",
            "emergency_detection", 
            "conversation_flow_management",
            "point_wise_recommendations",
            "fallback_system"
        ]
    }