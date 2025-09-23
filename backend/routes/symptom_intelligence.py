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
    
    system_message = """You are ARYA, a medical intake assistant. Your job is to:

1. Parse user messages and extract medical information intelligently
2. Maintain a JSON conversation state
3. Ask appropriate follow-up questions
4. Never repeat questions for information already provided

CONVERSATION STATE FORMAT:
{
    "chiefComplaint": "user's main concern",
    "onset": "when symptoms started",
    "pain": {
        "hasPain": true/false/null,
        "location": "where pain is located",
        "severity": "1-10 or description",
        "character": "sharp/dull/burning etc"
    },
    "fever": true/false/null,
    "cough": true/false/null,
    "breathingDifficulty": true/false/null,
    "nausea": true/false/null,
    "vitals": {
        "temperature": "number or null",
        "heartRate": "number or null",
        "bloodPressure": "string like 120/80 or null"
    },
    "redFlags": ["list of emergency symptoms"],
    "completed": false
}

RULES:
1. If user says "no pain", "don't have pain", "pain free" - set pain.hasPain = false and NEVER ask pain questions again
2. If user says "no fever", "afebrile", "normal temperature" - set fever = false  
3. Extract timing info like "2 hours ago", "yesterday", "this morning" automatically
4. Detect emergency symptoms: chest pain, difficulty breathing, stroke signs, severe bleeding
5. Ask ONE question at a time, not lists
6. Update state from EVERY user message
7. When you have chief complaint + onset + pain status + fever status + cough status, mark completed = true

RESPONSE FORMAT:
Always respond with valid JSON:
{
    "message": "your response to user",
    "updated_state": {conversation state object},
    "next_question": "single next question or null if assessment ready",
    "emergency": true/false
}

Start by asking: "What is your main concern today?"
"""
    
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