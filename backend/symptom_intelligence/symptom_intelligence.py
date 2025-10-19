# symptom_intelligence.py
# Core Symptom Intelligence Engine with state management, slot filling, and triage logic

from datetime import datetime, timezone
from pymongo import MongoClient
import json
import os
import uuid
from typing import Dict, List, Optional, Any

# ==========================================================
# 🔹 MongoDB Setup
# ==========================================================
def get_mongo_client():
    """Get MongoDB client using environment variable"""
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    return MongoClient(mongo_url)

client = get_mongo_client()
db = client["erprana"]
sessions = db["symptom_sessions"]
interactions_log = db["interactions_log"]  # For ML training data

# ==========================================================
# 🔸 Load All Complaint Knowledge Files
# ==========================================================
def load_complaints() -> Dict[str, Any]:
    """Load all complaint JSON files from complaints directory"""
    complaints_path = os.path.join(os.path.dirname(__file__), "complaints")
    complaints = {}
    
    if not os.path.exists(complaints_path):
        print(f"⚠️ Complaints directory not found: {complaints_path}")
        return complaints
    
    for file in os.listdir(complaints_path):
        if file.endswith(".json"):
            try:
                with open(os.path.join(complaints_path, file), "r", encoding="utf-8") as f:
                    data = json.load(f)
                    chief_complaint = data.get("chief_complaint", "").lower()
                    if chief_complaint:
                        complaints[chief_complaint] = data
                        print(f"✅ Loaded complaint: {chief_complaint}")
            except Exception as e:
                print(f"❌ Error loading {file}: {e}")
    
    print(f"📊 Total complaints loaded: {len(complaints)}")
    return complaints

complaint_data = load_complaints()

# ==========================================================
# 🧠 Session Management
# ==========================================================
def create_session(chief_complaint: str, user_id: str = "anonymous") -> Optional[Dict[str, Any]]:
    """Create a new symptom intelligence session"""
    cc = chief_complaint.lower()
    
    if cc not in complaint_data:
        print(f"⚠️ No complaint data found for: {cc}")
        return None
    
    data = complaint_data[cc]
    sid = str(uuid.uuid4())
    
    doc = {
        "session_id": sid,
        "user_id": user_id,
        "chief_complaint": cc,
        "collected_slots": {},
        "pending_slots": data["slots"].copy(),
        "completed": False,
        "triage_level": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    sessions.insert_one(doc)
    print(f"✅ Created session {sid} for {cc}")
    
    # Log for ML training
    log_interaction(sid, user_id, "session_created", {"chief_complaint": cc})
    
    return doc

def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve session by ID"""
    return sessions.find_one({"session_id": session_id})

def update_slot(session_id: str, slot: str, value: Any) -> Optional[Dict[str, Any]]:
    """Update a specific slot in the session"""
    s = get_session(session_id)
    if not s:
        print(f"⚠️ Session not found: {session_id}")
        return None
    
    collected = s["collected_slots"]
    collected[slot] = value
    
    pending = [x for x in s["pending_slots"] if x != slot]
    
    sessions.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "collected_slots": collected,
                "pending_slots": pending,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    print(f"✅ Updated slot '{slot}' = '{value}' for session {session_id}")
    
    # Log for ML training
    log_interaction(session_id, s.get("user_id", "anonymous"), "slot_filled", {
        "slot": slot,
        "value": value
    })
    
    return get_session(session_id)

def get_all_active_sessions(user_id: str) -> List[Dict[str, Any]]:
    """Get all active sessions for a user"""
    return list(sessions.find({
        "user_id": user_id,
        "completed": False
    }).sort("updated_at", -1))

# ==========================================================
# 🩺 Question Queue
# ==========================================================
def get_next_question(session_id: str) -> Optional[Dict[str, str]]:
    """Get the next question to ask based on pending slots"""
    s = get_session(session_id)
    if not s:
        return None
    
    cc = s["chief_complaint"]
    pending = s["pending_slots"]
    
    if not pending:
        print(f"ℹ️ No pending slots for session {session_id}")
        return None
    
    next_slot = pending[0]
    q_text = complaint_data[cc]["questions"].get(next_slot, f"Can you tell me about {next_slot}?")
    
    print(f"❓ Next question for session {session_id}: {q_text} (slot: {next_slot})")
    
    return {
        "slot": next_slot,
        "question": q_text
    }

# ==========================================================
# 🚦 Completion & Triage Logic
# ==========================================================
def evaluate_triage_rule(rule: Dict[str, Any], collected: Dict[str, Any]) -> bool:
    """Evaluate a single triage rule against collected data"""
    try:
        expression = rule.get("expression", "False")
        # Safe evaluation with collected slots as context
        result = eval(expression, {"__builtins__": {}}, collected)
        return bool(result)
    except Exception as e:
        print(f"⚠️ Error evaluating rule: {e}")
        return False

def check_completion_and_triage(session_id: str) -> Dict[str, Any]:
    """Check if session has enough data and determine triage level"""
    s = get_session(session_id)
    if not s:
        return {"completed": False, "triage_level": None, "reason": "Session not found"}
    
    cc = s["chief_complaint"]
    data = complaint_data[cc]
    collected = s["collected_slots"]
    
    # Check completion threshold
    threshold = data.get("completion_threshold", 3)
    if len(collected) < threshold:
        print(f"ℹ️ Session {session_id}: {len(collected)}/{threshold} slots filled")
        return {
            "completed": False,
            "triage_level": None,
            "reason": f"Need {threshold - len(collected)} more slots"
        }
    
    # Evaluate triage rules
    triage = "🟨 Yellow"  # default
    triage_reason = "Routine care recommended"
    
    for rule in data.get("triage_rules", []):
        if evaluate_triage_rule(rule, collected):
            triage = rule.get("level", "🟨 Yellow")
            triage_reason = rule.get("reason", "Triage rule matched")
            print(f"✅ Triage rule matched: {triage} - {triage_reason}")
            break
    
    # Update session
    sessions.update_one(
        {"session_id": session_id},
        {
            "$set": {
                "triage_level": triage,
                "completed": True,
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Log for ML training
    log_interaction(session_id, s.get("user_id", "anonymous"), "triage_completed", {
        "triage_level": triage,
        "triage_reason": triage_reason,
        "collected_slots": collected
    })
    
    print(f"✅ Session {session_id} completed with triage: {triage}")
    
    return {
        "completed": True,
        "triage_level": triage,
        "reason": triage_reason
    }

# ==========================================================
# 🧩 Main Processing Logic
# ==========================================================
def process_user_response(session_id: str, slot: str, value: Any) -> Dict[str, Any]:
    """Process user response and determine next action"""
    # Update slot
    session = update_slot(session_id, slot, value)
    if not session:
        return {
            "error": "Session not found",
            "completed": False
        }
    
    # Check completion and triage
    triage_status = check_completion_and_triage(session_id)
    
    # If not completed, get next question
    if not triage_status["completed"]:
        next_q = get_next_question(session_id)
        return {
            "completed": False,
            "triage_level": None,
            "next_slot": next_q["slot"] if next_q else None,
            "next_question": next_q["question"] if next_q else None,
            "session_id": session_id
        }
    
    # If completed, return triage result
    return {
        "completed": True,
        "triage_level": triage_status["triage_level"],
        "triage_reason": triage_status.get("reason", ""),
        "collected_data": session["collected_slots"],
        "session_id": session_id
    }

# ==========================================================
# 📊 ML Data Logging
# ==========================================================
def log_interaction(session_id: str, user_id: str, event_type: str, data: Dict[str, Any]):
    """Log interaction for ML training data collection"""
    try:
        log_entry = {
            "session_id": session_id,
            "user_id": user_id,
            "event_type": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        interactions_log.insert_one(log_entry)
    except Exception as e:
        print(f"⚠️ Error logging interaction: {e}")

def get_session_logs(session_id: str) -> List[Dict[str, Any]]:
    """Retrieve all logs for a session"""
    return list(interactions_log.find({"session_id": session_id}).sort("timestamp", 1))

# ==========================================================
# 🔍 Utility Functions
# ==========================================================
def get_available_complaints() -> List[str]:
    """Get list of all available complaint types"""
    return list(complaint_data.keys())

def get_complaint_details(chief_complaint: str) -> Optional[Dict[str, Any]]:
    """Get details for a specific complaint"""
    return complaint_data.get(chief_complaint.lower())

def expire_old_sessions(hours: int = 24):
    """Expire sessions older than specified hours"""
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    result = sessions.delete_many({
        "updated_at": {"$lt": cutoff},
        "completed": False
    })
    print(f"🗑️ Expired {result.deleted_count} old sessions")
    return result.deleted_count
