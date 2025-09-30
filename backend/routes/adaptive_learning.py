from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
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

class EnhancedFeedbackRequest(BaseModel):
    user_id: str
    session_id: str
    message_id: str
    feedback_type: str  # "thumbs_up", "thumbs_down", "detailed"
    satisfaction_score: Optional[int] = None  # 1-5 scale for detailed feedback
    assistant_message: str
    user_message: str
    conversation_context: Optional[dict] = None
    additional_comments: Optional[str] = None
    medical_accuracy: Optional[int] = None  # 1-5 scale for medical accuracy
    helpfulness: Optional[int] = None  # 1-5 scale for helpfulness
    completeness: Optional[int] = None  # 1-5 scale for response completeness

class LearningPattern(BaseModel):
    pattern_id: str
    user_input_pattern: str
    successful_response: Dict[str, Any]
    satisfaction_metrics: Dict[str, float]
    usage_count: int
    improvement_suggestions: Optional[List[str]] = None

class EnhancedFeedbackResponse(BaseModel):
    feedback_id: str
    status: str
    message: str
    learning_applied: Optional[bool] = None
    improvement_noted: Optional[str] = None

@router.post("/enhanced-submit", response_model=EnhancedFeedbackResponse)
async def submit_enhanced_feedback(feedback: EnhancedFeedbackRequest):
    """Submit enhanced feedback with satisfaction scoring and learning"""
    try:
        db = get_database()
        
        # Create enhanced feedback document
        feedback_doc = {
            "feedback_id": str(uuid.uuid4()),
            "user_id": feedback.user_id,
            "session_id": feedback.session_id,
            "message_id": feedback.message_id,
            "feedback_type": feedback.feedback_type,
            "satisfaction_score": feedback.satisfaction_score,
            "assistant_message": feedback.assistant_message,
            "user_message": feedback.user_message,
            "conversation_context": feedback.conversation_context or {},
            "additional_comments": feedback.additional_comments,
            "medical_accuracy": feedback.medical_accuracy,
            "helpfulness": feedback.helpfulness,
            "completeness": feedback.completeness,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "processed": False
        }
        
        # Insert feedback into database
        result = await db.enhanced_feedback.insert_one(feedback_doc)
        
        # Process learning if satisfaction is high (≥4)
        learning_applied = False
        improvement_noted = None
        
        if feedback.satisfaction_score and feedback.satisfaction_score >= 4:
            learning_applied = await _process_learning_pattern(
                db, 
                feedback.user_message, 
                feedback.assistant_message, 
                feedback.satisfaction_score,
                feedback.medical_accuracy or 0,
                feedback.helpfulness or 0,
                feedback.completeness or 0
            )
            improvement_noted = "Response pattern stored for future similar queries"
        
        elif feedback.satisfaction_score and feedback.satisfaction_score <= 2:
            # Store negative feedback for improvement analysis
            await _store_improvement_opportunity(
                db,
                feedback.user_message,
                feedback.assistant_message,
                feedback.additional_comments or "",
                feedback.satisfaction_score
            )
            improvement_noted = "Feedback noted for response improvement"
        
        if result.inserted_id:
            return EnhancedFeedbackResponse(
                feedback_id=feedback_doc["feedback_id"],
                status="success",
                message="Thank you for your detailed feedback! This helps ARYA provide better medical guidance.",
                learning_applied=learning_applied,
                improvement_noted=improvement_noted
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to save feedback")
            
    except Exception as e:
        print(f"Error submitting enhanced feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Error submitting feedback: {str(e)}")

async def _process_learning_pattern(db, user_input: str, assistant_response: str, 
                                  satisfaction: int, accuracy: int, helpfulness: int, 
                                  completeness: int) -> bool:
    """Process and store successful response patterns for learning"""
    try:
        # Generate pattern key from user input
        pattern_key = _extract_medical_pattern(user_input)
        
        # Create learning pattern document
        learning_doc = {
            "pattern_key": pattern_key,
            "user_input": user_input,
            "successful_response": assistant_response,
            "satisfaction_metrics": {
                "overall_satisfaction": satisfaction,
                "medical_accuracy": accuracy,
                "helpfulness": helpfulness,
                "completeness": completeness,
                "combined_score": (satisfaction + accuracy + helpfulness + completeness) / 4
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "usage_count": 1
        }
        
        # Check if pattern already exists
        existing_pattern = await db.learning_patterns.find_one({"pattern_key": pattern_key})
        
        if existing_pattern:
            # Update existing pattern with new data
            await db.learning_patterns.update_one(
                {"pattern_key": pattern_key},
                {
                    "$push": {
                        "successful_responses": learning_doc["successful_response"],
                        "satisfaction_history": learning_doc["satisfaction_metrics"]
                    },
                    "$inc": {"usage_count": 1},
                    "$set": {"last_updated": learning_doc["timestamp"]}
                }
            )
        else:
            # Create new pattern
            learning_doc["successful_responses"] = [learning_doc["successful_response"]]
            learning_doc["satisfaction_history"] = [learning_doc["satisfaction_metrics"]]
            await db.learning_patterns.insert_one(learning_doc)
        
        return True
        
    except Exception as e:
        print(f"Error processing learning pattern: {e}")
        return False

async def _store_improvement_opportunity(db, user_input: str, assistant_response: str, 
                                       comments: str, satisfaction: int):
    """Store low-satisfaction feedback for improvement analysis"""
    try:
        improvement_doc = {
            "improvement_id": str(uuid.uuid4()),
            "user_input": user_input,
            "poor_response": assistant_response,
            "user_comments": comments,
            "satisfaction_score": satisfaction,
            "improvement_areas": _identify_improvement_areas(comments),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "addressed": False
        }
        
        await db.improvement_opportunities.insert_one(improvement_doc)
        
    except Exception as e:
        print(f"Error storing improvement opportunity: {e}")

def _extract_medical_pattern(user_input: str) -> str:
    """Extract medical pattern from user input for learning"""
    user_lower = user_input.lower()
    
    # Common medical symptom patterns
    symptom_patterns = {
        "chest_pain": ["chest pain", "chest hurt", "heart pain", "chest pressure"],
        "shortness_breath": ["shortness of breath", "can't breathe", "difficulty breathing", "breathing problems"],
        "fever": ["fever", "temperature", "hot", "chills"],
        "headache": ["headache", "head pain", "migraine"],
        "abdominal_pain": ["stomach pain", "abdominal pain", "belly pain", "stomach ache"],
        "nausea_vomiting": ["nausea", "vomiting", "throwing up", "sick to stomach"],
        "dizziness": ["dizzy", "lightheaded", "vertigo", "spinning"],
        "fatigue": ["tired", "exhausted", "fatigue", "weakness"],
        "back_pain": ["back pain", "back hurt", "spine pain"],
        "joint_pain": ["joint pain", "arthritis", "joint ache"]
    }
    
    # Find matching patterns
    matched_patterns = []
    for pattern_name, keywords in symptom_patterns.items():
        if any(keyword in user_lower for keyword in keywords):
            matched_patterns.append(pattern_name)
    
    # Severity modifiers
    severity_modifiers = []
    if any(word in user_lower for word in ["severe", "intense", "unbearable", "worst"]):
        severity_modifiers.append("severe")
    elif any(word in user_lower for word in ["mild", "slight", "little"]):
        severity_modifiers.append("mild")
    
    # Duration modifiers
    duration_modifiers = []
    if any(word in user_lower for word in ["sudden", "suddenly", "acute"]):
        duration_modifiers.append("sudden")
    elif any(word in user_lower for word in ["chronic", "ongoing", "persistent"]):
        duration_modifiers.append("chronic")
    
    # Combine patterns
    pattern_parts = matched_patterns + severity_modifiers + duration_modifiers
    
    return "_".join(pattern_parts) if pattern_parts else "general_symptom"

def _identify_improvement_areas(comments: str) -> List[str]:
    """Identify areas for improvement based on user comments"""
    comments_lower = comments.lower()
    improvement_areas = []
    
    if any(word in comments_lower for word in ["not helpful", "unhelpful", "useless"]):
        improvement_areas.append("response_helpfulness")
    
    if any(word in comments_lower for word in ["wrong", "incorrect", "inaccurate"]):
        improvement_areas.append("medical_accuracy")
    
    if any(word in comments_lower for word in ["incomplete", "missing", "not enough"]):
        improvement_areas.append("response_completeness")
    
    if any(word in comments_lower for word in ["confusing", "unclear", "hard to understand"]):
        improvement_areas.append("clarity")
    
    if any(word in comments_lower for word in ["rude", "insensitive", "cold"]):
        improvement_areas.append("empathy")
    
    if any(word in comments_lower for word in ["slow", "delayed", "took too long"]):
        improvement_areas.append("response_time")
    
    return improvement_areas if improvement_areas else ["general_improvement"]

@router.get("/learning-analytics/{user_id}")
async def get_user_learning_analytics(user_id: str):
    """Get learning analytics for a specific user"""
    try:
        db = get_database()
        
        # Get user's feedback history
        feedback_docs = await db.enhanced_feedback.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).to_list(length=100)
        
        # Calculate analytics
        total_feedback = len(feedback_docs)
        if total_feedback == 0:
            return {"message": "No feedback data available for this user"}
        
        # Satisfaction metrics
        satisfaction_scores = [f.get("satisfaction_score", 0) for f in feedback_docs if f.get("satisfaction_score")]
        avg_satisfaction = sum(satisfaction_scores) / len(satisfaction_scores) if satisfaction_scores else 0
        
        # Detailed metrics
        accuracy_scores = [f.get("medical_accuracy", 0) for f in feedback_docs if f.get("medical_accuracy")]
        helpfulness_scores = [f.get("helpfulness", 0) for f in feedback_docs if f.get("helpfulness")]
        completeness_scores = [f.get("completeness", 0) for f in feedback_docs if f.get("completeness")]
        
        return {
            "user_id": user_id,
            "total_feedback": total_feedback,
            "satisfaction_metrics": {
                "average_overall": round(avg_satisfaction, 2),
                "average_accuracy": round(sum(accuracy_scores) / len(accuracy_scores), 2) if accuracy_scores else 0,
                "average_helpfulness": round(sum(helpfulness_scores) / len(helpfulness_scores), 2) if helpfulness_scores else 0,
                "average_completeness": round(sum(completeness_scores) / len(completeness_scores), 2) if completeness_scores else 0
            },
            "feedback_distribution": _calculate_feedback_distribution(feedback_docs),
            "recent_feedback": feedback_docs[:5]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting user analytics: {str(e)}")

@router.get("/system/learning-insights")
async def get_system_learning_insights():
    """Get system-wide learning insights"""
    try:
        db = get_database()
        
        # Get learning patterns
        patterns = await db.learning_patterns.find().to_list(length=None)
        
        # Get improvement opportunities
        improvements = await db.improvement_opportunities.find(
            {"addressed": False}
        ).to_list(length=20)
        
        # Calculate system metrics
        total_patterns = len(patterns)
        most_successful_patterns = sorted(
            patterns,
            key=lambda x: x.get("usage_count", 0),
            reverse=True
        )[:5]
        
        return {
            "learning_status": {
                "total_learned_patterns": total_patterns,
                "patterns_with_high_satisfaction": len([p for p in patterns 
                    if any(h.get("combined_score", 0) >= 4 for h in p.get("satisfaction_history", []))]),
                "active_improvement_opportunities": len(improvements)
            },
            "most_successful_patterns": [
                {
                    "pattern": p.get("pattern_key", "unknown"),
                    "usage_count": p.get("usage_count", 0),
                    "avg_satisfaction": round(sum(h.get("combined_score", 0) 
                        for h in p.get("satisfaction_history", [])) / 
                        len(p.get("satisfaction_history", [1])), 2)
                }
                for p in most_successful_patterns
            ],
            "improvement_opportunities": [
                {
                    "improvement_id": imp.get("improvement_id"),
                    "areas": imp.get("improvement_areas", []),
                    "satisfaction_score": imp.get("satisfaction_score", 0),
                    "timestamp": imp.get("timestamp")
                }
                for imp in improvements
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting learning insights: {str(e)}")

def _calculate_feedback_distribution(feedback_docs: List[Dict]) -> Dict[str, int]:
    """Calculate distribution of feedback types"""
    distribution = {"thumbs_up": 0, "thumbs_down": 0, "detailed": 0}
    
    for feedback in feedback_docs:
        feedback_type = feedback.get("feedback_type", "unknown")
        if feedback_type in distribution:
            distribution[feedback_type] += 1
    
    return distribution

@router.post("/apply-learning/{pattern_key}")
async def apply_learned_pattern(pattern_key: str, user_input: str):
    """Apply learned patterns to improve responses"""
    try:
        db = get_database()
        
        # Get matching learned pattern
        pattern = await db.learning_patterns.find_one({"pattern_key": pattern_key})
        
        if not pattern:
            return {"status": "no_pattern_found", "message": "No learned pattern available for this query type"}
        
        # Get the best response from successful patterns
        satisfaction_history = pattern.get("satisfaction_history", [])
        if not satisfaction_history:
            return {"status": "no_data", "message": "Pattern found but no satisfaction data available"}
        
        # Find the response with highest satisfaction
        best_response_index = max(
            range(len(satisfaction_history)),
            key=lambda i: satisfaction_history[i].get("combined_score", 0)
        )
        
        best_response = pattern.get("successful_responses", [])[best_response_index]
        best_metrics = satisfaction_history[best_response_index]
        
        # Update usage count
        await db.learning_patterns.update_one(
            {"pattern_key": pattern_key},
            {"$inc": {"usage_count": 1}}
        )
        
        return {
            "status": "pattern_applied",
            "learned_response": best_response,
            "confidence_metrics": best_metrics,
            "usage_count": pattern.get("usage_count", 0) + 1,
            "message": "Applied learned pattern from previous successful interactions"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error applying learned pattern: {str(e)}")