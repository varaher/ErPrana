from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import sys
sys.path.append('/app/backend')
from clinical_engine.unified_clinical_engine import unified_engine

router = APIRouter()

class UnifiedChatRequest(BaseModel):
    user_message: str
    session_id: str
    user_id: Optional[str] = None

class UnifiedChatResponse(BaseModel):
    assistant_message: str
    session_data: Optional[Dict[str, Any]] = None
    conversation_complete: bool = False
    analysis_type: str
    active_rules_used: Optional[int] = None
    emergency_detected: bool = False

@router.post("/unified-clinical-chat", response_model=UnifiedChatResponse)
async def unified_clinical_chat(request: UnifiedChatRequest):
    """
    Unified clinical chat endpoint that actively uses all 100 rules (R1-R100)
    for real-time symptom analysis and conversation flow
    """
    try:
        # Process the chat turn using the unified clinical engine
        result = await unified_engine.process_chat_turn(
            text=request.user_message,
            session_id=request.session_id
        )
        
        # Check for emergency conditions
        emergency_detected = "EMERGENCY" in result["reply"] or "Call 911" in result["reply"]
        
        return UnifiedChatResponse(
            assistant_message=result["reply"],
            session_data=result.get("session"),
            conversation_complete=result["done"],
            analysis_type=result["analysis_type"],
            active_rules_used=result.get("active_rules_used"),
            emergency_detected=emergency_detected
        )
        
    except Exception as e:
        print(f"❌ Error in unified clinical chat: {e}")
        raise HTTPException(status_code=500, detail=f"Clinical analysis error: {str(e)}")

@router.get("/unified-clinical-chat/health")
async def health_check():
    """Health check for unified clinical engine"""
    return {
        "status": "healthy",
        "engine": "unified_clinical_engine",
        "rules_loaded": len(unified_engine.clinical_rules),
        "symptom_mappings": len(unified_engine.symptom_mappings)
    }