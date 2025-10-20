# routes/triage_feedback.py
# Triage Feedback Collection System for ML Learning

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import os
from pymongo import MongoClient

router = APIRouter()

# ==========================================================
# MongoDB Connection
# ==========================================================
def get_mongo_client():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    return MongoClient(mongo_url)

client = get_mongo_client()
db = client["erprana"]
feedback_logs = db["triage_feedback_logs"]
sessions = db["symptom_sessions"]

# ==========================================================
# Request/Response Models
# ==========================================================
class TriageFeedbackRequest(BaseModel):
    session_id: str
    user_id: str
    feedback_type: str  # "correct", "incorrect", "unsure"
    system_triage: str
    user_comment: Optional[str] = None
    actual_diagnosis: Optional[str] = None
    severity_rating: Optional[int] = None  # 1-5 scale

class TriageFeedbackResponse(BaseModel):
    feedback_id: str
    message: str
    ml_data_updated: bool

class FeedbackStatistics(BaseModel):
    total_feedback: int
    correct_count: int
    incorrect_count: int
    unsure_count: int
    accuracy_rate: float
    by_complaint: dict
    by_triage_level: dict

# ==========================================================
# API Endpoints
# ==========================================================

@router.post("/submit-triage-feedback", response_model=TriageFeedbackResponse)
async def submit_triage_feedback(request: TriageFeedbackRequest):
    """
    Submit feedback on triage decision
    This data will be used for ML model training
    """
    try:
        # Get session details
        session = sessions.find_one({"session_id": request.session_id})
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Create feedback log
        feedback_doc = {
            "feedback_id": f"fb_{request.session_id}_{int(datetime.now(timezone.utc).timestamp())}",
            "session_id": request.session_id,
            "user_id": request.user_id,
            "chief_complaint": session.get("chief_complaint"),
            "collected_slots": session.get("collected_slots", {}),
            "system_triage": request.system_triage,
            "feedback_type": request.feedback_type,
            "user_comment": request.user_comment,
            "actual_diagnosis": request.actual_diagnosis,
            "severity_rating": request.severity_rating,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "ml_training_ready": True
        }
        
        result = feedback_logs.insert_one(feedback_doc)
        
        # Update session with feedback
        sessions.update_one(
            {"session_id": request.session_id},
            {
                "$set": {
                    "feedback_received": True,
                    "feedback_type": request.feedback_type,
                    "feedback_timestamp": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return TriageFeedbackResponse(
            feedback_id=feedback_doc["feedback_id"],
            message="Thank you for your feedback! This helps improve ARYA's accuracy.",
            ml_data_updated=True
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting feedback: {str(e)}")

@router.get("/feedback-statistics", response_model=FeedbackStatistics)
async def get_feedback_statistics():
    """
    Get statistics about triage feedback for accuracy analysis
    """
    try:
        all_feedback = list(feedback_logs.find())
        
        if not all_feedback:
            return FeedbackStatistics(
                total_feedback=0,
                correct_count=0,
                incorrect_count=0,
                unsure_count=0,
                accuracy_rate=0.0,
                by_complaint={},
                by_triage_level={}
            )
        
        # Count feedback types
        correct_count = sum(1 for f in all_feedback if f.get("feedback_type") == "correct")
        incorrect_count = sum(1 for f in all_feedback if f.get("feedback_type") == "incorrect")
        unsure_count = sum(1 for f in all_feedback if f.get("feedback_type") == "unsure")
        
        # Calculate accuracy rate (correct / (correct + incorrect))
        total_definitive = correct_count + incorrect_count
        accuracy_rate = (correct_count / total_definitive * 100) if total_definitive > 0 else 0.0
        
        # Group by complaint
        by_complaint = {}
        for feedback in all_feedback:
            complaint = feedback.get("chief_complaint", "Unknown")
            if complaint not in by_complaint:
                by_complaint[complaint] = {"correct": 0, "incorrect": 0, "unsure": 0}
            
            feedback_type = feedback.get("feedback_type", "unsure")
            by_complaint[complaint][feedback_type] = by_complaint[complaint].get(feedback_type, 0) + 1
        
        # Group by triage level
        by_triage_level = {}
        for feedback in all_feedback:
            triage = feedback.get("system_triage", "Unknown")
            if triage not in by_triage_level:
                by_triage_level[triage] = {"correct": 0, "incorrect": 0, "unsure": 0}
            
            feedback_type = feedback.get("feedback_type", "unsure")
            by_triage_level[triage][feedback_type] = by_triage_level[triage].get(feedback_type, 0) + 1
        
        return FeedbackStatistics(
            total_feedback=len(all_feedback),
            correct_count=correct_count,
            incorrect_count=incorrect_count,
            unsure_count=unsure_count,
            accuracy_rate=round(accuracy_rate, 2),
            by_complaint=by_complaint,
            by_triage_level=by_triage_level
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting statistics: {str(e)}")

@router.get("/feedback-for-ml-training")
async def get_feedback_for_ml_training(limit: int = 100):
    """
    Get feedback data formatted for ML model training
    """
    try:
        feedback_data = list(feedback_logs.find(
            {"ml_training_ready": True}
        ).sort("timestamp", -1).limit(limit))
        
        # Remove MongoDB _id
        for item in feedback_data:
            if "_id" in item:
                del item["_id"]
        
        return {
            "count": len(feedback_data),
            "training_data": feedback_data,
            "message": f"Retrieved {len(feedback_data)} feedback samples for ML training"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving ML training data: {str(e)}")

@router.get("/incorrect-triage-cases")
async def get_incorrect_triage_cases(limit: int = 20):
    """
    Get cases where triage was marked as incorrect
    Useful for improving triage rules
    """
    try:
        incorrect_cases = list(feedback_logs.find(
            {"feedback_type": "incorrect"}
        ).sort("timestamp", -1).limit(limit))
        
        # Remove MongoDB _id
        for case in incorrect_cases:
            if "_id" in case:
                del case["_id"]
        
        return {
            "count": len(incorrect_cases),
            "incorrect_cases": incorrect_cases,
            "message": f"Retrieved {len(incorrect_cases)} incorrect triage cases for review"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving incorrect cases: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check for triage feedback system"""
    try:
        feedback_count = feedback_logs.count_documents({})
        return {
            "status": "healthy",
            "service": "Triage Feedback System",
            "total_feedback": feedback_count,
            "message": "Feedback collection system operational"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
