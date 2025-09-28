from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Dict, Optional
import uuid
from datetime import datetime, timezone, time
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Pydantic models
class Medication(BaseModel):
    medication_id: str
    user_id: str
    name: str
    dosage: str
    frequency: str  # "daily", "twice_daily", "three_times_daily", "weekly", etc.
    times: List[str]  # List of times in HH:MM format
    instructions: str
    prescribing_doctor: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    active: bool = True
    reminders_enabled: bool = True
    notes: Optional[str] = None

class MedicationReminder(BaseModel):
    reminder_id: str
    medication_id: str
    user_id: str
    scheduled_time: str
    taken: bool = False
    taken_time: Optional[str] = None
    skipped: bool = False
    reminder_sent: bool = False

class MedicationLog(BaseModel):
    log_id: str
    medication_id: str
    user_id: str
    taken_time: str
    dosage_taken: str
    notes: Optional[str] = None

class MedicationRequest(BaseModel):
    user_id: str
    name: str
    dosage: str
    frequency: str
    times: List[str]
    instructions: str
    prescribing_doctor: Optional[str] = None
    start_date: Optional[str] = None

@router.post("/medications")
async def add_medication(request: MedicationRequest):
    """Add a new medication for a user"""
    try:
        medication_id = str(uuid.uuid4())
        
        medication = {
            "medication_id": medication_id,
            "user_id": request.user_id,
            "name": request.name,
            "dosage": request.dosage,
            "frequency": request.frequency,
            "times": request.times,
            "instructions": request.instructions,
            "prescribing_doctor": request.prescribing_doctor,
            "start_date": request.start_date or datetime.now(timezone.utc).isoformat(),
            "end_date": None,
            "active": True,
            "reminders_enabled": True,
            "notes": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.medications.insert_one(medication)
        
        # Create reminders for the medication
        await create_medication_reminders(medication_id, request.user_id, request.times)
        
        return {
            "status": "success",
            "medication_id": medication_id,
            "message": f"Medication '{request.name}' added successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/medications/{user_id}")
async def get_user_medications(user_id: str, active_only: bool = True):
    """Get all medications for a user"""
    try:
        query = {"user_id": user_id}
        if active_only:
            query["active"] = True
        
        medications = await db.medications.find(query).sort("created_at", -1).to_list(length=None)
        
        # Convert ObjectId to string for JSON serialization
        for medication in medications:
            if "_id" in medication:
                medication["_id"] = str(medication["_id"])
        
        return {
            "user_id": user_id,
            "medication_count": len(medications),
            "medications": medications
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/medications/{medication_id}")
async def update_medication(medication_id: str, updates: Dict):
    """Update medication details"""
    try:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.medications.update_one(
            {"medication_id": medication_id},
            {"$set": updates}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Medication not found")
        
        # Update reminders if times changed
        if "times" in updates:
            medication = await db.medications.find_one({"medication_id": medication_id})
            if medication:
                await create_medication_reminders(medication_id, medication["user_id"], updates["times"])
        
        return {
            "status": "success",
            "message": "Medication updated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/medications/{medication_id}")
async def deactivate_medication(medication_id: str):
    """Deactivate a medication (soft delete)"""
    try:
        result = await db.medications.update_one(
            {"medication_id": medication_id},
            {"$set": {
                "active": False,
                "end_date": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Medication not found")
        
        # Deactivate future reminders
        await db.medication_reminders.update_many(
            {"medication_id": medication_id, "taken": False},
            {"$set": {"active": False}}
        )
        
        return {
            "status": "success",
            "message": "Medication deactivated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def create_medication_reminders(medication_id: str, user_id: str, times: List[str]):
    """Create daily reminders for a medication"""
    try:
        # Remove existing future reminders
        await db.medication_reminders.delete_many({
            "medication_id": medication_id,
            "taken": False,
            "skipped": False
        })
        
        # Create reminders for next 30 days
        for day_offset in range(30):
            future_date = datetime.now(timezone.utc) + timedelta(days=day_offset)
            
            for time_str in times:
                try:
                    # Parse time string (HH:MM)
                    hour, minute = map(int, time_str.split(':'))
                    scheduled_datetime = future_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                    
                    reminder = {
                        "reminder_id": str(uuid.uuid4()),
                        "medication_id": medication_id,
                        "user_id": user_id,
                        "scheduled_time": scheduled_datetime.isoformat(),
                        "taken": False,
                        "taken_time": None,
                        "skipped": False,
                        "reminder_sent": False,
                        "active": True,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    
                    await db.medication_reminders.insert_one(reminder)
                    
                except (ValueError, IndexError):
                    print(f"Invalid time format: {time_str}")
                    continue
                    
    except Exception as e:
        print(f"Error creating reminders: {e}")

@router.get("/medications/{user_id}/reminders")
async def get_medication_reminders(user_id: str, date: Optional[str] = None):
    """Get medication reminders for a user for a specific date"""
    try:
        if date:
            # Parse date and get reminders for that day
            target_date = datetime.fromisoformat(date).date()
            start_time = datetime.combine(target_date, time.min).replace(tzinfo=timezone.utc)
            end_time = datetime.combine(target_date, time.max).replace(tzinfo=timezone.utc)
            
            query = {
                "user_id": user_id,
                "scheduled_time": {
                    "$gte": start_time.isoformat(),
                    "$lte": end_time.isoformat()
                },
                "active": True
            }
        else:
            # Get today's reminders
            today = datetime.now(timezone.utc).date()
            start_time = datetime.combine(today, time.min).replace(tzinfo=timezone.utc)
            end_time = datetime.combine(today, time.max).replace(tzinfo=timezone.utc)
            
            query = {
                "user_id": user_id,
                "scheduled_time": {
                    "$gte": start_time.isoformat(),
                    "$lte": end_time.isoformat()
                },
                "active": True
            }
        
        reminders = await db.medication_reminders.find(query).sort("scheduled_time", 1).to_list(length=None)
        
        # Get medication details for each reminder
        enriched_reminders = []
        for reminder in reminders:
            if "_id" in reminder:
                reminder["_id"] = str(reminder["_id"])
            
            medication = await db.medications.find_one({"medication_id": reminder["medication_id"]})
            if medication:
                if "_id" in medication:
                    medication["_id"] = str(medication["_id"])
                reminder["medication"] = medication
            
            enriched_reminders.append(reminder)
        
        return {
            "user_id": user_id,
            "date": date or today.isoformat(),
            "reminder_count": len(enriched_reminders),
            "reminders": enriched_reminders
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/medications/reminders/{reminder_id}/taken")
async def mark_medication_taken(reminder_id: str, notes: Optional[str] = None):
    """Mark a medication reminder as taken"""
    try:
        result = await db.medication_reminders.update_one(
            {"reminder_id": reminder_id},
            {"$set": {
                "taken": True,
                "taken_time": datetime.now(timezone.utc).isoformat(),
                "skipped": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Reminder not found")
        
        # Log the medication intake
        reminder = await db.medication_reminders.find_one({"reminder_id": reminder_id})
        if reminder:
            medication = await db.medications.find_one({"medication_id": reminder["medication_id"]})
            if medication:
                log_entry = {
                    "log_id": str(uuid.uuid4()),
                    "medication_id": reminder["medication_id"],
                    "user_id": reminder["user_id"],
                    "taken_time": datetime.now(timezone.utc).isoformat(),
                    "dosage_taken": medication["dosage"],
                    "notes": notes,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.medication_logs.insert_one(log_entry)
        
        return {
            "status": "success",
            "message": "Medication marked as taken"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/medications/reminders/{reminder_id}/skip")
async def skip_medication(reminder_id: str, reason: Optional[str] = None):
    """Mark a medication reminder as skipped"""
    try:
        result = await db.medication_reminders.update_one(
            {"reminder_id": reminder_id},
            {"$set": {
                "skipped": True,
                "taken": False,
                "skip_reason": reason,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Reminder not found")
        
        return {
            "status": "success", 
            "message": "Medication marked as skipped"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/medications/{user_id}/adherence")
async def get_medication_adherence(user_id: str, days: int = 30):
    """Get medication adherence statistics for a user"""
    try:
        # Calculate date range
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        # Get all reminders in the date range
        total_reminders = await db.medication_reminders.count_documents({
            "user_id": user_id,
            "scheduled_time": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            },
            "active": True
        })
        
        taken_reminders = await db.medication_reminders.count_documents({
            "user_id": user_id,
            "scheduled_time": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            },
            "taken": True,
            "active": True
        })
        
        skipped_reminders = await db.medication_reminders.count_documents({
            "user_id": user_id,
            "scheduled_time": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            },
            "skipped": True,
            "active": True
        })
        
        adherence_rate = (taken_reminders / total_reminders * 100) if total_reminders > 0 else 0
        
        return {
            "user_id": user_id,
            "period_days": days,
            "total_scheduled": total_reminders,
            "taken": taken_reminders,
            "skipped": skipped_reminders,
            "missed": total_reminders - taken_reminders - skipped_reminders,
            "adherence_rate": round(adherence_rate, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Import timedelta for reminder creation
from datetime import timedelta