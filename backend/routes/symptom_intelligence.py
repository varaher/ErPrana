from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import os
import json
import asyncio
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

@router.post("/analyze-symptom", response_model=SymptomResponse)
async def analyze_symptom_message(request: SymptomRequest):
    try:
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
        
        # Create assessment chat
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