from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
import uuid

# Load environment variables
load_dotenv()

# Database imports
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# Database connection
def get_database():
    MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    DB_NAME = os.environ.get("DB_NAME", "test_database")
    client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]

class FeedbackRequest(BaseModel):
    user_id: str
    session_id: str
    message_id: str
    feedback_type: str  # "thumbs_up" or "thumbs_down"
    assistant_message: str
    user_message: str
    conversation_context: Optional[dict] = None
    additional_comments: Optional[str] = None

class FeedbackResponse(BaseModel):
    feedback_id: str
    status: str
    message: str

@router.post("/submit", response_model=FeedbackResponse)
async def submit_feedback(feedback: FeedbackRequest):
    """Submit feedback for ARYA's response"""
    try:
        db = get_database()
        
        # Create feedback document
        feedback_doc = {
            "feedback_id": str(uuid.uuid4()),
            "user_id": feedback.user_id,
            "session_id": feedback.session_id,
            "message_id": feedback.message_id,
            "feedback_type": feedback.feedback_type,
            "assistant_message": feedback.assistant_message,
            "user_message": feedback.user_message,
            "conversation_context": feedback.conversation_context or {},
            "additional_comments": feedback.additional_comments,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "processed": False
        }
        
        # Insert feedback into database
        result = await db.feedback.insert_one(feedback_doc)
        
        if result.inserted_id:
            return FeedbackResponse(
                feedback_id=feedback_doc["feedback_id"],
                status="success",
                message="Thank you for your feedback! This helps me improve my medical guidance."
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to save feedback")
            
    except Exception as e:
        print(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Error submitting feedback: {str(e)}")

@router.get("/analytics/{user_id}")
async def get_user_feedback_analytics(user_id: str):
    """Get feedback analytics for a specific user"""
    try:
        db = get_database()
        
        # Get all feedback for user
        feedback_docs = await db.feedback.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).to_list(length=100)
        
        # Calculate analytics
        total_feedback = len(feedback_docs)
        thumbs_up = sum(1 for f in feedback_docs if f.get("feedback_type") == "thumbs_up")
        thumbs_down = sum(1 for f in feedback_docs if f.get("feedback_type") == "thumbs_down")
        
        satisfaction_rate = (thumbs_up / total_feedback * 100) if total_feedback > 0 else 0
        
        return {
            "user_id": user_id,
            "total_feedback": total_feedback,
            "thumbs_up": thumbs_up,
            "thumbs_down": thumbs_down,
            "satisfaction_rate": round(satisfaction_rate, 1),
            "recent_feedback": feedback_docs[:5]  # Last 5 feedback items
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting feedback analytics: {str(e)}")

@router.get("/system/analytics")
async def get_system_feedback_analytics():
    """Get overall system feedback analytics (admin only)"""
    try:
        db = get_database()
        
        # Aggregate feedback data
        pipeline = [
            {
                "$group": {
                    "_id": "$feedback_type",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        results = await db.feedback.aggregate(pipeline).to_list(length=None)
        
        # Format results
        analytics = {
            "thumbs_up": 0,
            "thumbs_down": 0,
            "total": 0
        }
        
        for result in results:
            if result["_id"] == "thumbs_up":
                analytics["thumbs_up"] = result["count"]
            elif result["_id"] == "thumbs_down":
                analytics["thumbs_down"] = result["count"]
            analytics["total"] += result["count"]
        
        # Calculate satisfaction rate
        analytics["satisfaction_rate"] = (
            analytics["thumbs_up"] / analytics["total"] * 100
        ) if analytics["total"] > 0 else 0
        
        # Get recent feedback with user context
        recent_feedback = await db.feedback.find().sort("timestamp", -1).limit(10).to_list(length=None)
        
        return {
            "system_analytics": analytics,
            "recent_feedback": recent_feedback,
            "improvement_areas": await _identify_improvement_areas(db)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting system analytics: {str(e)}")

async def _identify_improvement_areas(db):
    """Identify areas where ARYA needs improvement based on feedback"""
    try:
        # Find patterns in negative feedback
        negative_feedback = await db.feedback.find(
            {"feedback_type": "thumbs_down"}
        ).limit(50).to_list(length=None)
        
        improvement_areas = []
        
        # Analyze common themes in negative feedback
        if negative_feedback:
            # Look for common patterns in assistant messages that received negative feedback
            common_issues = {}
            
            for feedback in negative_feedback:
                assistant_msg = feedback.get("assistant_message", "").lower()
                
                # Identify potential issue categories
                if "emergency" in assistant_msg and "call 911" in assistant_msg:
                    common_issues["emergency_detection"] = common_issues.get("emergency_detection", 0) + 1
                elif "assessment" in assistant_msg:
                    common_issues["medical_assessment"] = common_issues.get("medical_assessment", 0) + 1
                elif "question" in assistant_msg:
                    common_issues["question_quality"] = common_issues.get("question_quality", 0) + 1
                else:
                    common_issues["general_response"] = common_issues.get("general_response", 0) + 1
            
            # Convert to improvement suggestions
            for issue, count in common_issues.items():
                if count >= 3:  # At least 3 occurrences to be significant
                    improvement_areas.append({
                        "area": issue.replace("_", " ").title(),
                        "frequency": count,
                        "suggestion": _get_improvement_suggestion(issue)
                    })
        
        return improvement_areas
        
    except Exception as e:
        print(f"Error identifying improvement areas: {e}")
        return []

def _get_improvement_suggestion(issue_type):
    """Get improvement suggestions based on issue type"""
    suggestions = {
        "emergency_detection": "Review emergency detection algorithms and thresholds",
        "medical_assessment": "Improve medical knowledge integration and diagnostic reasoning",
        "question_quality": "Enhance follow-up question generation for better symptom gathering",
        "general_response": "Review general response quality and empathy in communication"
    }
    return suggestions.get(issue_type, "Review this area for potential improvements")