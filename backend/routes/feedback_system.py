from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
import json
from datetime import datetime
import uuid

router = APIRouter()

class FeedbackRequest(BaseModel):
    session_id: str
    feedback_type: str  # "diagnosis_accuracy", "conversation_quality", "overall_experience"
    rating: int  # 1-5 scale
    specific_feedback: Optional[str] = None
    helpful_aspects: Optional[List[str]] = None
    improvement_suggestions: Optional[List[str]] = None
    diagnosis_feedback: Optional[Dict[str, Any]] = None
    conversation_transcript: Optional[List[Dict]] = None

class DiagnosisFeedback(BaseModel):
    session_id: str
    suggested_diagnoses: List[Dict[str, Any]]
    user_rating: Dict[str, int]  # diagnosis_name -> rating (1-5)
    actual_diagnosis: Optional[str] = None
    doctor_notes: Optional[str] = None

@router.post("/submit-feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    Collect user feedback on ARYA's performance
    """
    try:
        # Generate unique feedback ID
        feedback_id = str(uuid.uuid4())
        
        # Structure feedback data
        feedback_data = {
            "feedback_id": feedback_id,
            "session_id": request.session_id,
            "timestamp": datetime.utcnow().isoformat(),
            "feedback_type": request.feedback_type,
            "rating": request.rating,
            "specific_feedback": request.specific_feedback,
            "helpful_aspects": request.helpful_aspects or [],
            "improvement_suggestions": request.improvement_suggestions or [],
            "diagnosis_feedback": request.diagnosis_feedback,
            "conversation_transcript": request.conversation_transcript
        }
        
        # TODO: Store in database (for now, we'll log it)
        print(f"Feedback received: {json.dumps(feedback_data, indent=2)}")
        
        # Analyze feedback patterns
        analysis = analyze_feedback_patterns(feedback_data)
        
        return {
            "status": "success",
            "feedback_id": feedback_id,
            "message": "Thank you for your feedback! This helps ARYA learn and improve.",
            "analysis": analysis
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing feedback: {str(e)}")

@router.post("/diagnosis-feedback")
async def submit_diagnosis_feedback(request: DiagnosisFeedback):
    """
    Collect specific feedback on diagnostic accuracy
    """
    try:
        feedback_id = str(uuid.uuid4())
        
        # Calculate diagnostic accuracy metrics
        accuracy_metrics = calculate_diagnostic_accuracy(request)
        
        diagnosis_feedback = {
            "feedback_id": feedback_id,
            "session_id": request.session_id,
            "timestamp": datetime.utcnow().isoformat(),
            "suggested_diagnoses": request.suggested_diagnoses,
            "user_ratings": request.user_rating,
            "actual_diagnosis": request.actual_diagnosis,
            "doctor_notes": request.doctor_notes,
            "accuracy_metrics": accuracy_metrics
        }
        
        print(f"Diagnostic feedback: {json.dumps(diagnosis_feedback, indent=2)}")
        
        return {
            "status": "success", 
            "feedback_id": feedback_id,
            "message": "Thank you for the diagnostic feedback! This helps improve ARYA's clinical reasoning.",
            "metrics": accuracy_metrics
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing diagnostic feedback: {str(e)}")

@router.get("/feedback-summary/{session_id}")
async def get_feedback_summary(session_id: str):
    """
    Get feedback summary for a session
    """
    try:
        # TODO: Retrieve from database
        # For now, return mock summary
        summary = {
            "session_id": session_id,
            "total_interactions": 12,
            "average_rating": 4.2,
            "common_feedback_themes": [
                "Helpful diagnostic suggestions",
                "Natural conversation flow", 
                "Good emergency detection"
            ],
            "improvement_areas": [
                "More specific follow-up questions",
                "Better understanding of complex cases"
            ],
            "diagnostic_accuracy": {
                "correct_in_top_3": "85%",
                "exact_match": "42%",
                "clinically_relevant": "78%"
            }
        }
        
        return summary
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving feedback summary: {str(e)}")

def analyze_feedback_patterns(feedback_data: dict) -> dict:
    """
    Analyze feedback to identify patterns and improvement opportunities
    """
    
    analysis = {
        "sentiment": "positive" if feedback_data["rating"] >= 4 else "negative" if feedback_data["rating"] <= 2 else "neutral",
        "key_strengths": [],
        "improvement_opportunities": [],
        "clinical_accuracy_notes": []
    }
    
    # Analyze helpful aspects
    if feedback_data.get("helpful_aspects"):
        analysis["key_strengths"] = feedback_data["helpful_aspects"]
    
    # Analyze improvement suggestions
    if feedback_data.get("improvement_suggestions"):
        analysis["improvement_opportunities"] = feedback_data["improvement_suggestions"]
    
    # Analyze specific feedback text
    feedback_text = feedback_data.get("specific_feedback", "").lower()
    
    if "accurate" in feedback_text or "correct" in feedback_text:
        analysis["clinical_accuracy_notes"].append("User found diagnoses accurate")
    
    if "conversation" in feedback_text or "natural" in feedback_text:
        if feedback_data["rating"] >= 4:
            analysis["key_strengths"].append("Natural conversation flow")
        else:
            analysis["improvement_opportunities"].append("Improve conversation naturalness")
    
    if "emergency" in feedback_text or "urgent" in feedback_text:
        analysis["clinical_accuracy_notes"].append("Emergency detection mentioned")
    
    return analysis

def calculate_diagnostic_accuracy(request: DiagnosisFeedback) -> dict:
    """
    Calculate diagnostic accuracy metrics
    """
    
    metrics = {
        "total_suggestions": len(request.suggested_diagnoses),
        "average_user_rating": 0,
        "top_rated_diagnoses": [],
        "accuracy_assessment": "pending"
    }
    
    if request.user_rating:
        # Calculate average rating
        ratings = list(request.user_rating.values())
        metrics["average_user_rating"] = sum(ratings) / len(ratings)
        
        # Find top-rated diagnoses
        sorted_ratings = sorted(request.user_rating.items(), key=lambda x: x[1], reverse=True)
        metrics["top_rated_diagnoses"] = [diag for diag, rating in sorted_ratings[:3] if rating >= 4]
    
    # If actual diagnosis provided, assess accuracy
    if request.actual_diagnosis:
        suggested_names = [diag["condition"].lower() for diag in request.suggested_diagnoses]
        actual_lower = request.actual_diagnosis.lower()
        
        if any(actual_lower in suggested.lower() or suggested in actual_lower for suggested in suggested_names):
            metrics["accuracy_assessment"] = "correct_diagnosis_included"
        else:
            metrics["accuracy_assessment"] = "missed_diagnosis"
    
    return metrics

@router.post("/quick-feedback")
async def quick_feedback(session_id: str, helpful: bool, comment: str = None):
    """
    Quick thumbs up/down feedback
    """
    try:
        feedback_data = {
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat(),
            "helpful": helpful,
            "comment": comment,
            "type": "quick_feedback"
        }
        
        print(f"Quick feedback: {json.dumps(feedback_data)}")
        
        return {
            "status": "success",
            "message": "Thanks for the quick feedback!" if helpful else "Thank you for letting us know. We'll work on improving."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing quick feedback: {str(e)}")

# Feedback prompts and questions
FEEDBACK_PROMPTS = {
    "post_assessment": {
        "title": "How did ARYA do?",
        "questions": [
            {
                "type": "rating",
                "question": "How accurate were the diagnostic suggestions?",
                "scale": "1-5 stars"
            },
            {
                "type": "rating", 
                "question": "How natural did the conversation feel?",
                "scale": "1-5 stars"
            },
            {
                "type": "multiple_choice",
                "question": "What was most helpful?",
                "options": [
                    "Emergency recognition",
                    "Systematic questioning", 
                    "Diagnostic suggestions",
                    "Treatment recommendations",
                    "Conversational flow"
                ]
            },
            {
                "type": "text",
                "question": "Any suggestions for improvement?",
                "optional": True
            }
        ]
    },
    
    "mid_conversation": {
        "title": "Quick check-in",
        "questions": [
            {
                "type": "binary",
                "question": "Are ARYA's questions helping you explain your symptoms?",
                "options": ["Yes, very helpful", "Could be better"]
            }
        ]
    },
    
    "diagnostic_accuracy": {
        "title": "Diagnostic Feedback",
        "questions": [
            {
                "type": "rating_per_diagnosis",
                "question": "Please rate each diagnostic suggestion:",
                "scale": "1-5 stars"
            },
            {
                "type": "text",
                "question": "What was your actual diagnosis? (optional)",
                "optional": True
            },
            {
                "type": "text", 
                "question": "Doctor's notes or additional feedback:",
                "optional": True
            }
        ]
    }
}