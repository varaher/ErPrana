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

# Question priority list (ordered by importance)
PRIORITY_QUESTIONS = [
    {
        "id": "main_symptom",
        "text": "What single symptom is troubling you most right now? (e.g., chest pain, fever, headache, dizziness)",
        "need": lambda s: not s.get("symptoms")
    },
    {
        "id": "onset",
        "text": "Did it start suddenly or gradually?",
        "need": lambda s: s.get("symptoms") and not s.get("onset")
    },
    {
        "id": "duration",
        "text": "How long has this been going on? (minutes, hours, or days)",
        "need": lambda s: s.get("symptoms") and not s.get("duration_text")
    },
    {
        "id": "severity",
        "text": "On a scale of 1-10, how severe is it right now?",
        "need": lambda s: s.get("symptoms") and not s.get("severity")
    },
    {
        "id": "radiation",
        "text": "Does the pain spread to other areas (like your arm, jaw, or back)?",
        "need": lambda s: "pain" in str(s.get("symptoms", [])).lower() and not s.get("radiation")
    },
    {
        "id": "pattern",
        "text": "Is it constant or does it come and go?",
        "need": lambda s: s.get("symptoms") and not s.get("pattern")
    }
]

def pick_next_question(session: SessionState) -> Optional[str]:
    """
    Pick the next unasked question based on priority
    NEVER returns a question that was already asked
    """
    for q in PRIORITY_QUESTIONS:
        if q["need"](session.slots) and q["id"] not in session.asked_ids:
            session.asked_ids.add(q["id"])
            return q["text"]
    
    return None

@router.post("/chat", response_model=EnhancedChatResponse)
async def enhanced_hybrid_chat(request: EnhancedChatRequest):
    """
    Enhanced chat endpoint with fact extraction and loop prevention
    """
    # Get or create session
    session_id = request.session_id or str(uuid.uuid4())
    session = get_session(session_id)
    
    # Step 1: ALWAYS extract facts from user input
    new_facts = extract_facts(request.message)
    
    # Merge into session slots
    session.slots = merge_facts(session.slots, new_facts)
    
    print(f"📊 Extracted facts: {new_facts.to_dict()}")
    print(f"🗂️ Current slots: {session.slots}")
    
    # Step 2: Evaluate rules IMMEDIATELY on every turn
    if session.slots.get("symptoms"):  # Only evaluate if we have at least one symptom
        match = evaluate_rules_from_facts(session.slots, LOADED_RULES)
        
        if match and match.score >= 0.5:  # Sufficient confidence
            # Clear ask queue; return triage
            session.asked_ids.clear()
            session.repeat_count = 0
            
            triage_badge = get_triage_badge(match.urgency)
            next_steps_text = get_next_steps(match.urgency)
            
            triage_msg = (
                f"**Assessment Complete**\n\n"
                f"**Triage Level:** {triage_badge}\n"
                f"**Reason:** {match.likely_condition}\n"
                f"**Confidence:** {int(match.score * 100)}%\n\n"
                f"{next_steps_text}"
            )
            
            print(f"✅ Rule matched: {match.matched_rule_id} - {match.likely_condition} ({match.urgency})")
            
            return EnhancedChatResponse(
                reply=triage_msg,
                session_id=session_id,
                done=True,
                rule_id=match.matched_rule_id,
                triage_level=triage_badge,
                facts=session.slots
            )
    
    # Step 3: No rule fired yet → ask the NEXT unseen question
    next_q = pick_next_question(session)
    
    if not next_q:
        # No more questions, but no rule matched - provide summary
        summary = summarize_facts(session.slots)
        reply = f"{summary}\n\nBased on what you've shared, I recommend scheduling an appointment with your healthcare provider for proper evaluation."
    else:
        # Acknowledge what we extracted, then ask next question
        if not new_facts.is_empty():
            acknowledgment = f"Got it. I noted: {', '.join(new_facts.to_dict().keys())}.\n\n"
        else:
            acknowledgment = ""
        
        reply = acknowledgment + next_q
    
    # Step 4: Loop guard - NEVER repeat the same question
    if reply == session.last_bot_text:
        session.repeat_count += 1
    else:
        session.repeat_count = 0
    
    session.last_bot_text = reply
    
    # Step 5: Recovery mechanism - if stuck, summarize and pivot
    if session.repeat_count >= 2:
        summary = summarize_facts(session.slots)
        session.repeat_count = 0
        reply = f"{summary}\n\nDoes that summary look right? If yes, type **OK**. Otherwise, tell me the single main symptom to focus on now."
    
    return EnhancedChatResponse(
        reply=reply,
        session_id=session_id,
        done=False,
        facts=session.slots
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
