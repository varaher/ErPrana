# routes/hybrid_clinical_system.py
# Hybrid Clinical System - Integrates Symptom Intelligence Layer with Unified Clinical Engine

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from symptom_intelligence.symptom_intelligence import (
    create_session,
    get_session,
    process_user_response,
    get_available_complaints,
    get_all_active_sessions
)
from clinical_engine.unified_clinical_engine import UnifiedClinicalEngine
from services.conversational_layer import ConversationalLayer
from services.complaint_detection import complaint_detector
from services.adaptive_interview import (
    adaptive_interview,
    extract_slots_from_text,
    merge_slots,
    decision_ready,
    auto_fill_pending_slots,
    handle_expected_slot,
    next_best_question
)
from clinical_engine.evaluate_rules import RULES

router = APIRouter()

# Initialize engines
unified_engine = UnifiedClinicalEngine()
conversational_layer = ConversationalLayer()

# ==========================================================
# \ud83c\udfa8 URGENCY UI MAPPING (for consistent triage display)
# ==========================================================
URGENCY_UI = {
    "Emergency": {
        "badge": "\ud83d\udfe5 Red",
        "cta": "\ud83d\udea8 EMERGENCY: Call 911 or go to the nearest Emergency Department immediately.",
        "description": "This is a potentially life-threatening situation that requires immediate medical attention."
    },
    "High": {
        "badge": "\ud83d\udfe7 Orange",
        "cta": "\u26a0\ufe0f URGENT: Seek medical care within the next few hours.",
        "description": "This condition requires prompt medical evaluation. Go to an urgent care center or emergency department."
    },
    "Urgent": {
        "badge": "\ud83d\udfe7 Orange",
        "cta": "\u26a0\ufe0f URGENT: Seek medical care within the next few hours.",
        "description": "This condition requires prompt medical evaluation. Go to an urgent care center or emergency department."
    },
    "Moderate": {
        "badge": "\ud83d\udfe8 Yellow",
        "cta": "\ud83d\udccb NON-URGENT: Schedule an appointment with your healthcare provider.",
        "description": "This condition should be evaluated by a healthcare professional, but it's not immediately urgent."
    },
    "Mild": {
        "badge": "\ud83d\udfe9 Green",
        "cta": "\u2705 ROUTINE: Monitor your symptoms and consult your healthcare provider if they worsen.",
        "description": "Self-care measures may be appropriate with routine follow-up."
    },
    # Legacy emoji-based keys (for backwards compatibility)
    "\ud83d\udfe5 Red": {
        "badge": "\ud83d\udfe5 Red",
        "cta": "\ud83d\udea8 EMERGENCY: Call 911 or go to the nearest Emergency Department immediately.",
        "description": "This is a potentially life-threatening situation that requires immediate medical attention."
    },
    "\ud83d\udfe7 Orange": {
        "badge": "\ud83d\udfe7 Orange",
        "cta": "\u26a0\ufe0f URGENT: Seek medical care within the next few hours.",
        "description": "This condition requires prompt medical evaluation. Go to an urgent care center or emergency department."
    },
    "\ud83d\udfe8 Yellow": {
        "badge": "\ud83d\udfe8 Yellow",
        "cta": "\ud83d\udccb NON-URGENT: Schedule an appointment with your healthcare provider.",
        "description": "This condition should be evaluated by a healthcare professional, but it's not immediately urgent."
    },
    "\ud83d\udfe9 Green": {
        "badge": "\ud83d\udfe9 Green",
        "cta": "\u2705 ROUTINE: Monitor your symptoms and consult your healthcare provider if they worsen.",
        "description": "Self-care measures may be appropriate with routine follow-up."
    }
}

# ==========================================================
# 📋 Request/Response Models
# ==========================================================
class HybridChatRequest(BaseModel):
    user_input: str
    user_id: str
    session_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = []

class HybridChatResponse(BaseModel):
    response: str
    session_id: Optional[str] = None
    next_step: str  # "conversation_continue", "slot_filling", "assessment_complete", "emergency"
    triage_level: Optional[str] = None
    collected_slots: Optional[Dict[str, Any]] = None
    pending_slots: Optional[List[str]] = []
    general_analysis: Optional[Dict[str, Any]] = None
    needs_followup: bool = True

# ==========================================================
# 🧠 Hybrid Clinical System Logic
# ==========================================================
class HybridClinicalSystem:
    """
    Orchestrates between:
    1. Symptom Intelligence Layer (structured interviews)
    2. Unified Clinical Engine (100-rule system)
    3. Conversational Layer (small talk)
    """
    
    def __init__(self):
        self.unified_engine = UnifiedClinicalEngine()
        self.conversational_layer = ConversationalLayer()
        self.available_complaints = get_available_complaints()
    
    def detect_chief_complaint(self, user_input: str) -> Optional[str]:
        """
        Detect if user input matches a chief complaint
        Uses enhanced complaint detection with synonym mapping and fuzzy matching
        Prioritizes HIGH-URGENCY complaints (chest pain, stroke, etc.)
        """
        user_input_lower = user_input.lower()
        
        # PRIORITY 1: Check for HIGH-URGENCY complaints first (Red-level)
        high_priority = [
            "chest pain", "chest tightness", "stroke symptoms", "unconsciousness",
            "seizures", "hematemesis", "severe bleeding", "anaphylaxis"
        ]
        for complaint in high_priority:
            if complaint in user_input_lower or any(word in user_input_lower for word in complaint.split()):
                if complaint in self.available_complaints:
                    print(f"🚨 HIGH PRIORITY: '{complaint}' detected")
                    return complaint
        
        # PRIORITY 2: Check other available complaints
        for complaint in self.available_complaints:
            if complaint in user_input_lower:
                print(f"✅ Direct match: '{complaint}' found in input")
                return complaint
        
        # Then use the general complaint detector
        detected_complaint = complaint_detector.detect_complaint(user_input)
        
        # Verify detected complaint is available in our system
        if detected_complaint and detected_complaint in self.available_complaints:
            return detected_complaint
        
        # If detected but not available, try to find close match
        if detected_complaint:
            for complaint in self.available_complaints:
                if detected_complaint in complaint or complaint in detected_complaint:
                    print(f"✅ Mapped '{detected_complaint}' → '{complaint}'")
                    return complaint
        
        return None
    
    def process_turn(self, user_input: str, user_id: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Main orchestration logic for hybrid system
        """
        # Step 1: Check for conversational input (greetings, small talk)
        conversational_response = self.conversational_layer.check_small_talk(user_input)
        if conversational_response:
            return {
                "response": conversational_response,
                "session_id": session_id,
                "next_step": "conversation_continue",
                "needs_followup": True,
                "collected_slots": {},
                "pending_slots": []
            }
        
        # Step 2: Check if there's an active symptom intelligence session
        if session_id:
            active_session = get_session(session_id)
            if active_session and not active_session.get("completed", False):
                # Check if user is mentioning NEW chief complaint mid-conversation
                current_complaint = active_session.get("chief_complaint", "")
                new_complaint = adaptive_interview.detect_new_chief_complaint_in_conversation(
                    user_input, current_complaint
                )
                
                if new_complaint:
                    # User mentioned a high-priority NEW symptom - acknowledge and ask which to focus on
                    return {
                        "response": f"I understand you're now experiencing {new_complaint} along with {current_complaint}. This is concerning. Since {new_complaint} is a high-priority symptom, would you like me to focus on that first? Or should we continue with {current_complaint}?",
                        "session_id": session_id,
                        "next_step": "clarification_needed",
                        "needs_followup": True
                    }
                
                # Continue with structured interview (with adaptive symptom capture)
                return self._continue_structured_interview(active_session, user_input)
        
        # Step 3: Detect chief complaint and start structured interview if available
        chief_complaint = self.detect_chief_complaint(user_input)
        if chief_complaint:
            # Check if this complaint has structured interview
            if chief_complaint in self.available_complaints:
                from symptom_intelligence.symptom_intelligence import get_next_question, sessions
                new_session = create_session(chief_complaint, user_id)
                if new_session:
                    session_id = new_session["session_id"]
                    
                    # SMART START: Extract slots from initial message
                    extracted_slots = extract_slots_from_text(user_input)
                    print(f"🚀 Initial extraction from '{user_input}': {extracted_slots}")
                    
                    if extracted_slots:
                        # Merge into new session
                        collected_slots = merge_slots({}, extracted_slots)
                        pending_slots = auto_fill_pending_slots(
                            new_session.get("pending_slots", []),
                            collected_slots
                        )
                        
                        # Update session with extracted info
                        sessions.update_one(
                            {"session_id": session_id},
                            {"$set": {
                                "collected_slots": collected_slots,
                                "pending_slots": pending_slots
                            }}
                        )
                        
                        # Check if we already have enough for early completion
                        if decision_ready(chief_complaint, collected_slots):
                            print(f"🎯 Early completion on first message!")
                            from symptom_intelligence.symptom_intelligence import check_completion_and_triage
                            triage_result = check_completion_and_triage(session_id)
                            
                            return {
                                "response": self._generate_triage_response({
                                    "triage_level": triage_result.get("triage_level"),
                                    "triage_reason": triage_result.get("reason"),
                                    "collected_data": collected_slots
                                }),
                                "session_id": session_id,
                                "next_step": "assessment_complete",
                                "triage_level": triage_result.get("triage_level"),
                                "collected_slots": collected_slots,
                                "pending_slots": [],
                                "needs_followup": False
                            }
                    
                    # Get first question
                    next_q = get_next_question(session_id)
                    first_question = next_q["question"] if next_q else "Can you tell me more about your symptoms?"
                    
                    # Acknowledge what was captured
                    ack = ""
                    if extracted_slots:
                        ack = f"I noted: {', '.join(f'{k}' for k in extracted_slots.keys() if k != 'raw_text')}. "
                    
                    response_text = f"I understand you're experiencing {chief_complaint}. {ack}Let me ask a few more questions.\n\n{first_question}"
                    
                    return {
                        "response": response_text,
                        "session_id": session_id,
                        "next_step": "slot_filling",
                        "needs_followup": True,
                        "collected_slots": collected_slots if extracted_slots else {},
                        "pending_slots": new_session.get("pending_slots", [])
                    }
        
        # Step 4: Fall back to unified clinical engine (100-rule system)
        try:
            unified_result = self.unified_engine.process_chat_turn(user_input, session_id or f"session_{user_id}")
            
            return {
                "response": unified_result.get("response", "I'm here to help. Can you describe your symptoms?"),
                "session_id": unified_result.get("session_id", session_id),
                "next_step": unified_result.get("next_step", "conversation_continue"),
                "triage_level": unified_result.get("triage_level"),
                "general_analysis": unified_result.get("general_symptom_analysis"),
                "needs_followup": True
            }
        except Exception as e:
            print(f"Error in unified clinical engine: {e}")
            # Fallback response
            return {
                "response": "I understand you're experiencing symptoms. Can you describe your main concern in more detail? For example, do you have chest pain, fever, headache, or shortness of breath?",
                "session_id": session_id,
                "next_step": "conversation_continue",
                "needs_followup": True
            }
    
    def _continue_structured_interview(self, session: Dict[str, Any], user_input: str) -> Dict[str, Any]:
        """Continue with structured symptom intelligence interview (with EXPECTED SLOT logic)"""
        session_id = session["session_id"]
        chief_complaint = session.get("chief_complaint", "")
        collected_slots = session.get("collected_slots", {})
        pending_slots = session.get("pending_slots", [])
        
        # Initialize asked_slots if not present
        if "asked_slots" not in session:
            session["asked_slots"] = set()
        
        # STEP 1: Check if we're waiting for a specific expected slot answer
        consumed, slot_data = handle_expected_slot(session, user_input)
        if consumed:
            if slot_data:
                # Merge the answered slot
                collected_slots.update(slot_data)
                print(f"✅ Expected slot answered: {slot_data}")
            else:
                print(f"⚠️  Expected slot not properly answered, retrying or moving on")
            
            # Update session in DB
            from symptom_intelligence.symptom_intelligence import sessions
            sessions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "collected_slots": collected_slots,
                    "expected_slot": session.get("expected_slot"),
                    "asked_slots": list(session.get("asked_slots", set()))
                }}
            )
        
        # STEP 2: Extract ALL possible slots from user's current input (comprehensive messages)
        current_asking_slot = pending_slots[0] if pending_slots else None
        extracted_slots = extract_slots_from_text(user_input, context_slot=current_asking_slot)
        print(f"📝 Extracted slots from '{user_input}': {extracted_slots}")
        
        # STEP 2: Merge extracted slots into collected slots
        collected_slots = merge_slots(collected_slots, extracted_slots)
        
        # STEP 3: Update pending slots (remove ones that are now filled)
        pending_slots = auto_fill_pending_slots(pending_slots, collected_slots)
        
        # STEP 4: Check if we have enough info for early completion (70% threshold)
        if decision_ready(chief_complaint, collected_slots):
            print(f"✅ Early completion triggered! Collected: {collected_slots}")
            
            # Update session in database
            from symptom_intelligence.symptom_intelligence import sessions, check_completion_and_triage
            sessions.update_one(
                {"session_id": session_id},
                {"$set": {"collected_slots": collected_slots, "pending_slots": []}}
            )
            
            # Force triage evaluation
            triage_result = check_completion_and_triage(session_id)
            
            return {
                "response": self._generate_triage_response({
                    "triage_level": triage_result.get("triage_level"),
                    "triage_reason": triage_result.get("reason"),
                    "collected_data": collected_slots
                }),
                "session_id": session_id,
                "next_step": "assessment_complete",
                "triage_level": triage_result.get("triage_level"),
                "collected_slots": collected_slots,
                "pending_slots": [],
                "needs_followup": False
            }
        
        # STEP 5: If no pending slots but not enough for completion, interview done anyway
        if not pending_slots:
            print(f"ℹ️  No more pending slots, completing interview")
            from symptom_intelligence.symptom_intelligence import sessions, check_completion_and_triage
            sessions.update_one(
                {"session_id": session_id},
                {"$set": {"collected_slots": collected_slots, "pending_slots": []}}
            )
            triage_result = check_completion_and_triage(session_id)
            
            return {
                "response": self._generate_triage_response({
                    "triage_level": triage_result.get("triage_level"),
                    "triage_reason": triage_result.get("reason"),
                    "collected_data": collected_slots
                }),
                "session_id": session_id,
                "next_step": "assessment_complete",
                "triage_level": triage_result.get("triage_level"),
                "collected_slots": collected_slots,
                "pending_slots": [],
                "needs_followup": False
            }
        
        # STEP 6: Try CSV rules evaluation (if enough info)
        if RULES and len(collected_slots) >= 2:
            # Build feature map for rules
            features = {
                "chief_complaint": chief_complaint,
                "symptoms": [chief_complaint],
                "associated_symptoms": collected_slots.get("associated_symptoms", ""),
                "onset": collected_slots.get("onset"),
                "radiation": collected_slots.get("radiation"),
                "severity": collected_slots.get("severity"),
                "duration": collected_slots.get("duration"),
                "pattern": collected_slots.get("pattern"),
                "temperature": collected_slots.get("temperature"),
            }
            
            matches = RULES.evaluate(features)
            if matches and matches[0]["score"] >= 0.66:
                # High confidence match from rules
                print(f"🎯 Rules match: {matches[0]['likely_condition']} (score: {matches[0]['score']})")
                
                top = matches[0]
                # Map urgency to UI badge using URGENCY_UI
                urgency_key = top["urgency"]  # "Emergency", "High", "Urgent", "Moderate", etc.
                ui_config = URGENCY_UI.get(urgency_key, URGENCY_UI["Moderate"])
                triage_level = ui_config["badge"]
                
                from symptom_intelligence.symptom_intelligence import sessions
                sessions.update_one(
                    {"session_id": session_id},
                    {"$set": {
                        "collected_slots": collected_slots,
                        "completed": True,
                        "triage_level": triage_level
                    }}
                )
                
                return {
                    "response": self._generate_triage_response({
                        "triage_level": urgency_key,  # Pass raw urgency key (will be mapped in _generate_triage_response)
                        "triage_reason": f"{top['likely_condition']} (confidence: {top['score']:.0%})",
                        "collected_data": collected_slots
                    }),
                    "session_id": session_id,
                    "next_step": "assessment_complete",
                    "triage_level": triage_level,
                    "collected_slots": collected_slots,
                    "needs_followup": False
                }
        
        # STEP 7: Ask next best question (no loops - use next_best_question)
        next_result = next_best_question(session)
        if next_result:
            question_text, slot_name = next_result
            
            # Set expected slot
            session["expected_slot"] = slot_name
            
            # Update session
            from symptom_intelligence.symptom_intelligence import sessions
            sessions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "collected_slots": collected_slots,
                    "expected_slot": slot_name,
                    "asked_slots": list(session.get("asked_slots", set()))
                }}
            )
            
            return {
                "response": question_text,
                "session_id": session_id,
                "next_step": "slot_filling",
                "collected_slots": collected_slots,
                "needs_followup": True
            }
        
        # STEP 8: No more questions, force completion
        from symptom_intelligence.symptom_intelligence import sessions, check_completion_and_triage
        sessions.update_one(
            {"session_id": session_id},
            {"$set": {"collected_slots": collected_slots, "pending_slots": [], "completed": True}}
        )
        triage_result = check_completion_and_triage(session_id)
        
        return {
            "response": self._generate_triage_response({
                "triage_level": triage_result.get("triage_level"),
                "triage_reason": triage_result.get("reason"),
                "collected_data": collected_slots
            }),
            "session_id": session_id,
            "next_step": "assessment_complete",
            "triage_level": triage_result.get("triage_level"),
            "collected_slots": collected_slots,
            "pending_slots": [],
            "needs_followup": False
        }
    
    def _generate_triage_response(self, result: Dict[str, Any]) -> str:
        """Generate appropriate response based on triage level"""
        triage_level = result.get("triage_level", "🟨 Yellow")
        reason = result.get("triage_reason", "")
        
        # Find matching UI config (handle both "Red" and "🟥 Red" formats)
        ui_config = URGENCY_UI.get(triage_level)
        if not ui_config:
            # Try to extract text urgency (e.g., "Red" from "🟥 Red")
            for key in ["Emergency", "Red", "High", "Urgent", "Moderate", "Yellow", "Mild", "Green"]:
                if key.lower() in triage_level.lower():
                    ui_config = URGENCY_UI.get(key, URGENCY_UI["Moderate"])
                    break
        
        if not ui_config:
            ui_config = URGENCY_UI["Moderate"]  # Default fallback
        
        response = f"\n**Assessment Complete**\n\n"
        response += f"**Triage Level:** {ui_config['badge']}\n"
        response += f"**Reason:** {reason}\n\n"
        response += f"**{ui_config['cta']}**\n\n"
        response += ui_config['description']
        
        return response

hybrid_system = HybridClinicalSystem()

# ==========================================================
# \ud83d\udee0\ufe0f SESSION MANAGEMENT HELPERS
# ==========================================================

def _hard_reset_for_switch(session: Dict[str, Any], new_cc: str) -> Dict[str, Any]:
    """
    Complete session reset when switching chief complaints
    Clears all stale state to prevent loop issues
    """
    session["chief_complaint"] = new_cc
    session["collected_slots"] = {}
    session["asked_slots"] = set()
    session["expected_slot"] = None
    session["pending_question"] = None
    session["completed"] = False
    session.pop("context_switch_offer", None)
    session.pop("expected_confirmation", None)
    session["last_user_input"] = ""
    
    print(f"\ud83d\udd04 Hard reset completed for switch to: {new_cc}")
    return session

def mark_completed(session: Dict[str, Any], reason: str = "triage_delivered"):
    """Mark session as completed with reason"""
    session["completed"] = True
    session["completed_reason"] = reason
    session["completed_at"] = datetime.now().isoformat()
    print(f"\u2705 Session marked as completed: {reason}")

def archive_session(session: Dict[str, Any]):
    """Archive completed session (for future reference)"""
    from symptom_intelligence.symptom_intelligence import sessions
    sessions.update_one(
        {"session_id": session.get("session_id")},
        {"$set": {
            "archived": True,
            "archived_at": datetime.now().isoformat()
        }}
    )
    print(f"\ud83d\uddc4\ufe0f Session archived: {session.get('session_id')}")

def create_new_session_for_user(user_id: str, chief_complaint: str) -> Dict[str, Any]:
    """Create a fresh session for a new complaint"""
    from symptom_intelligence.symptom_intelligence import create_session
    new_session = create_session(chief_complaint, user_id)
    print(f"\ud83c\udd95 New session created: {new_session.get('session_id')} for {chief_complaint}")
    return new_session

# ==========================================================
# 🚀 API Endpoints
# ==========================================================

@router.post("/chat", response_model=HybridChatResponse)
async def hybrid_clinical_chat(request: HybridChatRequest):
    """
    Main endpoint for hybrid clinical chat system
    Integrates symptom intelligence layer with unified clinical engine
    """
    try:
        result = hybrid_system.process_turn(
            request.user_input,
            request.user_id,
            request.session_id
        )
        
        return HybridChatResponse(**result)
    
    except Exception as e:
        print(f"Error in hybrid clinical chat: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@router.get("/active-interviews/{user_id}")
async def get_active_interviews(user_id: str):
    """Get all active symptom intelligence interviews for a user"""
    try:
        sessions = get_all_active_sessions(user_id)
        
        # Remove MongoDB _id
        for session in sessions:
            if "_id" in session:
                del session["_id"]
        
        return {
            "user_id": user_id,
            "active_interviews": sessions,
            "count": len(sessions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving interviews: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check for hybrid clinical system"""
    try:
        complaints_count = len(hybrid_system.available_complaints)
        return {
            "status": "healthy",
            "service": "Hybrid Clinical System",
            "symptom_intelligence_complaints": complaints_count,
            "unified_clinical_engine": "operational",
            "conversational_layer": "operational",
            "message": "All systems integrated and operational"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
