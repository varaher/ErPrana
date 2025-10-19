# routes/symptom_intelligence_routes.py
# API routes for the Symptom Intelligence Layer

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from symptom_intelligence.symptom_intelligence import (
    create_session,
    get_session,
    update_slot,
    process_user_response,
    get_next_question,
    check_completion_and_triage,
    get_available_complaints,
    get_complaint_details,
    get_all_active_sessions,
    get_session_logs
)

router = APIRouter()

# ==========================================================
# 📋 Request/Response Models
# ==========================================================
class StartSessionRequest(BaseModel):
    chief_complaint: str
    user_id: Optional[str] = "anonymous"

class SessionResponse(BaseModel):
    session_id: str
    chief_complaint: str
    next_question: Optional[str] = None
    next_slot: Optional[str] = None
    message: str

class UserResponseRequest(BaseModel):
    session_id: str
    slot: str
    value: str

class AnalysisResponse(BaseModel):
    session_id: str
    completed: bool
    triage_level: Optional[str] = None
    triage_reason: Optional[str] = None
    next_question: Optional[str] = None
    next_slot: Optional[str] = None
    collected_data: Optional[Dict[str, Any]] = None

# ==========================================================
# 🚀 API Endpoints
# ==========================================================

@router.post("/start-session", response_model=SessionResponse)
async def start_symptom_session(request: StartSessionRequest):
    """
    Start a new symptom intelligence session for a specific chief complaint
    """
    try:
        session = create_session(request.chief_complaint, request.user_id)
        
        if not session:
            raise HTTPException(
                status_code=404,
                detail=f"No interview available for complaint: {request.chief_complaint}"
            )
        
        # Get first question
        next_q = get_next_question(session["session_id"])
        
        return SessionResponse(
            session_id=session["session_id"],
            chief_complaint=session["chief_complaint"],
            next_question=next_q["question"] if next_q else None,
            next_slot=next_q["slot"] if next_q else None,
            message=f"Started session for {request.chief_complaint}. Please answer the following questions."
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting session: {str(e)}")

@router.post("/process-response", response_model=AnalysisResponse)
async def process_response(request: UserResponseRequest):
    """
    Process user's response to a question and return next action
    """
    try:
        result = process_user_response(
            request.session_id,
            request.slot,
            request.value
        )
        
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        
        return AnalysisResponse(**result)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing response: {str(e)}")

@router.get("/session/{session_id}")
async def get_session_details(session_id: str):
    """
    Get details of an existing session
    """
    try:
        session = get_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Remove MongoDB _id for JSON serialization
        if "_id" in session:
            del session["_id"]
        
        return session
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving session: {str(e)}")

@router.get("/available-complaints")
async def list_available_complaints():
    """
    Get list of all available complaint types
    """
    try:
        complaints = get_available_complaints()
        return {
            "complaints": complaints,
            "count": len(complaints),
            "message": f"Found {len(complaints)} available complaint types"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing complaints: {str(e)}")

@router.get("/complaint-details/{chief_complaint}")
async def get_complaint_info(chief_complaint: str):
    """
    Get detailed information about a specific complaint type
    """
    try:
        details = get_complaint_details(chief_complaint)
        
        if not details:
            raise HTTPException(
                status_code=404,
                detail=f"No information found for complaint: {chief_complaint}"
            )
        
        return details
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving complaint details: {str(e)}")

@router.get("/user-sessions/{user_id}")
async def get_user_sessions(user_id: str):
    """
    Get all active sessions for a user
    """
    try:
        sessions = get_all_active_sessions(user_id)
        
        # Remove MongoDB _id for JSON serialization
        for session in sessions:
            if "_id" in session:
                del session["_id"]
        
        return {
            "user_id": user_id,
            "active_sessions": sessions,
            "count": len(sessions)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving user sessions: {str(e)}")

@router.get("/session-logs/{session_id}")
async def get_session_interaction_logs(session_id: str):
    """
    Get all interaction logs for a session (for ML training data review)
    """
    try:
        logs = get_session_logs(session_id)
        
        # Remove MongoDB _id for JSON serialization
        for log in logs:
            if "_id" in log:
                del log["_id"]
        
        return {
            "session_id": session_id,
            "logs": logs,
            "count": len(logs)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving session logs: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Health check endpoint for symptom intelligence system
    """
    try:
        complaints = get_available_complaints()
        return {
            "status": "healthy",
            "service": "Symptom Intelligence Layer",
            "complaints_loaded": len(complaints),
            "message": "Symptom Intelligence System operational"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
