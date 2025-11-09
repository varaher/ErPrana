# routes/enhanced_hybrid_chat.py
"""
Enhanced hybrid chat with:
1. Always extract facts before asking
2. Run rules on every turn
3. Loop prevention & recovery
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Set
import uuid
from datetime import datetime

from services.universal_orchestrator import orchestrate_message

router = APIRouter()

# Session state storage (in production, use Redis/MongoDB)
class SessionState:
    def __init__(self):
        self.facts: Dict[str, Any] = {}
        self.asked_questions: Set[str] = set()
        self.last_reply: Optional[str] = None
        self.repeat_count: int = 0
        self.completed: bool = False
        self.matched_rule: Optional[str] = None
        self.created_at: str = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "facts": self.facts,
            "asked_questions": self.asked_questions,
            "last_reply": self.last_reply,
            "repeat_count": self.repeat_count,
            "completed": self.completed,
            "matched_rule": self.matched_rule,
            "created_at": self.created_at
        }

sessions: Dict[str, SessionState] = {}

def get_session(session_id: str) -> SessionState:
    """Get or create session"""
    if session_id not in sessions:
        sessions[session_id] = SessionState()
    return sessions[session_id]

# Request/Response models
class EnhancedChatRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    message: str

class EnhancedChatResponse(BaseModel):
    reply: str
    session_id: str
    done: bool = False
    rule_id: Optional[str] = None
    triage_level: Optional[str] = None
    facts: Optional[Dict] = None

# Removed old helper functions - now using universal orchestrator

@router.post("/chat", response_model=EnhancedChatResponse)
async def enhanced_hybrid_chat(request: EnhancedChatRequest):
    """
    Universal orchestrator endpoint - works for ALL 100+ rules automatically
    No more complaint-specific routing or fallback loops
    """
    # Get or create session
    session_id = request.session_id or str(uuid.uuid4())
    session = get_session(session_id)
    
    # Use universal orchestrator
    result = orchestrate_message(
        user_id=request.user_id,
        message=request.message,
        session_state=session.to_dict()
    )
    
    # Update session from result
    if "facts" in result:
        session.facts = result["facts"]
    
    if result.get("type") == "triage":
        session.completed = True
        session.matched_rule = result.get("rule_id")
    
    return EnhancedChatResponse(
        reply=result["text"],
        session_id=session_id,
        done=result.get("done", False),
        rule_id=result.get("rule_id"),
        triage_level=result.get("triage_level"),
        facts=result.get("facts")
    )

@router.post("/reset")
async def reset_session(request: Dict[str, str]):
    """Reset session for new concern"""
    session_id = request.get("session_id")
    if session_id and session_id in sessions:
        del sessions[session_id]
        return {"ok": True, "message": "Session reset successfully"}
    return {"ok": False, "message": "Session not found"}

@router.get("/health")
async def health_check():
    """Health check for enhanced hybrid system"""
    return {
        "status": "healthy",
        "service": "Enhanced Hybrid Clinical System",
        "rules_loaded": len(LOADED_RULES),
        "active_sessions": len(sessions),
        "features": [
            "Always extract facts before asking",
            "Run rules on every turn",
            "Loop prevention & recovery",
            "Never ask same question twice"
        ]
    }
