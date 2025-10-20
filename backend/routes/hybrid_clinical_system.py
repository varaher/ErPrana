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

router = APIRouter()

# Initialize engines
unified_engine = UnifiedClinicalEngine()
conversational_layer = ConversationalLayer()

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
        """Detect if user input matches a chief complaint"""
        user_input_lower = user_input.lower()
        
        # Direct complaint matching
        for complaint in self.available_complaints:
            if complaint in user_input_lower:
                return complaint
        
        # Synonym mapping for common variations
        complaint_synonyms = {
            "chest pain": ["heart pain", "cardiac pain", "chest discomfort"],
            "shortness of breath": ["trouble breathing", "difficulty breathing", "can't breathe", "breathing problem"],
            "fever": ["temperature", "hot", "burning up", "chills"],
            "headache": ["head pain", "migraine", "head hurts"],
            "altered mental status": ["confused", "confusion", "disoriented"],
            "syncope": ["fainted", "passed out", "blacked out"],
            "seizures": ["convulsions", "fits", "shaking"],
            "stroke symptoms": ["face drooping", "arm weakness", "speech slurred"],
            "palpitations": ["heart racing", "irregular heartbeat"],
            "severe abdominal pain": ["stomach pain", "belly pain", "abdominal pain"]
        }
        
        for complaint, synonyms in complaint_synonyms.items():
            for synonym in synonyms:
                if synonym in user_input_lower:
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
                # Continue with structured interview
                return self._continue_structured_interview(active_session, user_input)
        
        # Step 3: Detect chief complaint and start structured interview if available
        chief_complaint = self.detect_chief_complaint(user_input)
        if chief_complaint:
            # Check if this complaint has structured interview
            if chief_complaint in self.available_complaints:
                from symptom_intelligence.symptom_intelligence import get_next_question
                new_session = create_session(chief_complaint, user_id)
                if new_session:
                    # Get first question immediately
                    next_q = get_next_question(new_session["session_id"])
                    first_question = next_q["question"] if next_q else "Can you tell me more about your symptoms?"
                    
                    response_text = f"I understand you're experiencing {chief_complaint}. Let me ask you some important questions to better assess your situation.\n\n{first_question}"
                    
                    return {
                        "response": response_text,
                        "session_id": new_session["session_id"],
                        "next_step": "slot_filling",
                        "needs_followup": True,
                        "collected_slots": {},
                        "pending_slots": new_session.get("pending_slots", [])
                    }
        
        # Step 4: Fall back to unified clinical engine (100-rule system)
        unified_result = self.unified_engine.process_chat_turn(user_input, user_id, session_id)
        
        return {
            "response": unified_result.get("response", "I'm here to help. Can you describe your symptoms?"),
            "session_id": unified_result.get("session_id", session_id),
            "next_step": unified_result.get("next_step", "conversation_continue"),
            "triage_level": unified_result.get("triage_level"),
            "general_analysis": unified_result.get("general_symptom_analysis"),
            "needs_followup": True
        }
    
    def _continue_structured_interview(self, session: Dict[str, Any], user_input: str) -> Dict[str, Any]:
        """Continue with structured symptom intelligence interview"""
        session_id = session["session_id"]
        pending_slots = session.get("pending_slots", [])
        
        if not pending_slots:
            # Interview complete, return triage
            return {
                "response": self._generate_triage_response(session),
                "session_id": session_id,
                "next_step": "assessment_complete",
                "triage_level": session.get("triage_level"),
                "collected_slots": session.get("collected_slots", {}),
                "pending_slots": [],
                "needs_followup": False
            }
        
        # Process the response for current slot
        current_slot = pending_slots[0]
        result = process_user_response(session_id, current_slot, user_input)
        
        if result.get("completed"):
            # Interview completed
            return {
                "response": self._generate_triage_response(result),
                "session_id": session_id,
                "next_step": "assessment_complete",
                "triage_level": result.get("triage_level"),
                "collected_slots": result.get("collected_data", {}),
                "pending_slots": [],
                "needs_followup": False
            }
        else:
            # Ask next question
            next_question = result.get("next_question", "Can you tell me more?")
            return {
                "response": next_question,
                "session_id": session_id,
                "next_step": "slot_filling",
                "collected_slots": session.get("collected_slots", {}),
                "pending_slots": [result.get("next_slot")],
                "needs_followup": True
            }
    
    def _generate_triage_response(self, result: Dict[str, Any]) -> str:
        """Generate appropriate response based on triage level"""
        triage_level = result.get("triage_level", "🟨 Yellow")
        reason = result.get("triage_reason", "")
        
        response = f"\n**Assessment Complete**\n\n"
        response += f"**Triage Level:** {triage_level}\n"
        response += f"**Reason:** {reason}\n\n"
        
        if "🟥 Red" in triage_level:
            response += "**🚨 EMERGENCY: Call 911 or go to the nearest Emergency Department immediately.**\n\n"
            response += "This is a potentially life-threatening situation that requires immediate medical attention."
        elif "🟧 Orange" in triage_level:
            response += "**⚠️ URGENT: Seek medical care within the next few hours.**\n\n"
            response += "This condition requires prompt medical evaluation. Go to an urgent care center or emergency department."
        elif "🟨 Yellow" in triage_level:
            response += "**📋 NON-URGENT: Schedule an appointment with your healthcare provider.**\n\n"
            response += "This condition should be evaluated by a healthcare professional, but it's not immediately urgent."
        else:
            response += "**✅ ROUTINE: Monitor your symptoms and consult your healthcare provider if they worsen.**\n"
        
        return response

hybrid_system = HybridClinicalSystem()

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
