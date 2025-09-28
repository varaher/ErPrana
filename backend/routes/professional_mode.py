from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Dict, Optional
import uuid
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Pydantic models for Professional Mode
class ProfessionalProfile(BaseModel):
    professional_id: str
    user_id: str
    license_number: str
    specialty: str
    institution: str
    verified: bool = False
    verification_date: Optional[str] = None

class PatientRecord(BaseModel):
    patient_id: str
    professional_id: str
    patient_name: str
    patient_age: int
    patient_gender: str
    chief_complaint: str
    history_present_illness: str
    medical_history: List[str]
    medications: List[str]
    allergies: List[str]
    vital_signs: Dict[str, str]
    assessment: str
    plan: str
    notes: str

class ClinicalAssessment(BaseModel):
    assessment_id: str
    patient_id: str
    professional_id: str
    symptoms: List[str]
    differential_diagnosis: List[str]
    recommended_tests: List[str]
    treatment_plan: str
    urgency_level: str  # low, medium, high, critical
    created_at: str

class TeachingCase(BaseModel):
    case_id: str
    professional_id: str
    title: str
    specialty: str
    case_description: str
    patient_presentation: str
    diagnostic_workup: List[str]
    final_diagnosis: str
    learning_objectives: List[str]
    discussion_points: List[str]
    references: List[str]

class ProfessionalModeRequest(BaseModel):
    user_id: str
    license_number: str
    specialty: str
    institution: str

@router.post("/professional/register")
async def register_professional(request: ProfessionalModeRequest):
    """Register a healthcare professional"""
    try:
        professional_id = str(uuid.uuid4())
        
        professional_profile = {
            "professional_id": professional_id,
            "user_id": request.user_id,
            "license_number": request.license_number,
            "specialty": request.specialty,
            "institution": request.institution,
            "verified": False,  # Would require actual verification process
            "verification_date": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.professional_profiles.insert_one(professional_profile)
        
        return {
            "status": "success",
            "professional_id": professional_id,
            "message": "Professional registration submitted. Verification pending."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/professional/profile/{user_id}")
async def get_professional_profile(user_id: str):
    """Get professional profile by user ID"""
    try:
        profile = await db.professional_profiles.find_one({"user_id": user_id})
        if not profile:
            raise HTTPException(status_code=404, detail="Professional profile not found")
        
        # Convert ObjectId to string for JSON serialization
        if "_id" in profile:
            profile["_id"] = str(profile["_id"])
        
        return {"profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/professional/patients")
async def create_patient_record(record: PatientRecord):
    """Create a new patient record"""
    try:
        record_dict = record.dict()
        record_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        record_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.patient_records.insert_one(record_dict)
        
        return {
            "status": "success",
            "patient_id": record.patient_id,
            "message": "Patient record created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/professional/patients/{professional_id}")
async def get_professional_patients(professional_id: str, limit: int = 50):
    """Get all patients for a professional"""
    try:
        patients = await db.patient_records.find(
            {"professional_id": professional_id}
        ).sort("created_at", -1).limit(limit).to_list(length=None)
        
        return {
            "professional_id": professional_id,
            "patient_count": len(patients),
            "patients": patients
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/professional/patient/{patient_id}")
async def get_patient_record(patient_id: str):
    """Get detailed patient record"""
    try:
        patient = await db.patient_records.find_one({"patient_id": patient_id})
        if not patient:
            raise HTTPException(status_code=404, detail="Patient record not found")
        
        # Get all assessments for this patient
        assessments = await db.clinical_assessments.find(
            {"patient_id": patient_id}
        ).sort("created_at", -1).to_list(length=None)
        
        return {
            "patient_record": patient,
            "assessments": assessments
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/professional/assessment")
async def create_clinical_assessment(assessment: ClinicalAssessment):
    """Create a clinical assessment"""
    try:
        assessment_dict = assessment.dict()
        assessment_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        assessment_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.clinical_assessments.insert_one(assessment_dict)
        
        return {
            "status": "success",
            "assessment_id": assessment.assessment_id,
            "message": "Clinical assessment created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/professional/assessments/{professional_id}")
async def get_professional_assessments(professional_id: str, limit: int = 50):
    """Get all assessments by a professional"""
    try:
        assessments = await db.clinical_assessments.find(
            {"professional_id": professional_id}
        ).sort("created_at", -1).limit(limit).to_list(length=None)
        
        return {
            "professional_id": professional_id,
            "assessment_count": len(assessments),
            "assessments": assessments
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/professional/teaching-case")
async def create_teaching_case(case: TeachingCase):
    """Create a teaching case"""
    try:
        case_dict = case.dict()
        case_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        case_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.teaching_cases.insert_one(case_dict)
        
        return {
            "status": "success",
            "case_id": case.case_id,
            "message": "Teaching case created successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/professional/teaching-cases")
async def get_teaching_cases(specialty: Optional[str] = None, limit: int = 20):
    """Get teaching cases, optionally filtered by specialty"""
    try:
        query = {}
        if specialty:
            query["specialty"] = specialty
        
        cases = await db.teaching_cases.find(query).sort("created_at", -1).limit(limit).to_list(length=None)
        
        return {
            "case_count": len(cases),
            "specialty_filter": specialty,
            "cases": cases
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/professional/teaching-case/{case_id}")
async def get_teaching_case(case_id: str):
    """Get detailed teaching case"""
    try:
        case = await db.teaching_cases.find_one({"case_id": case_id})
        if not case:
            raise HTTPException(status_code=404, detail="Teaching case not found")
        
        return {"case": case}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/professional/patient/{patient_id}")
async def update_patient_record(patient_id: str, updates: Dict):
    """Update patient record"""
    try:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.patient_records.update_one(
            {"patient_id": patient_id},
            {"$set": updates}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Patient record not found")
        
        return {
            "status": "success",
            "message": "Patient record updated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/professional/dashboard/{professional_id}")
async def get_professional_dashboard(professional_id: str):
    """Get dashboard data for healthcare professional"""
    try:
        # Get summary statistics
        total_patients = await db.patient_records.count_documents({"professional_id": professional_id})
        total_assessments = await db.clinical_assessments.count_documents({"professional_id": professional_id})
        total_cases = await db.teaching_cases.count_documents({"professional_id": professional_id})
        
        # Get recent patients
        recent_patients = await db.patient_records.find(
            {"professional_id": professional_id}
        ).sort("created_at", -1).limit(5).to_list(length=None)
        
        # Get recent assessments
        recent_assessments = await db.clinical_assessments.find(
            {"professional_id": professional_id}
        ).sort("created_at", -1).limit(5).to_list(length=None)
        
        return {
            "professional_id": professional_id,
            "statistics": {
                "total_patients": total_patients,
                "total_assessments": total_assessments,
                "total_teaching_cases": total_cases
            },
            "recent_patients": recent_patients,
            "recent_assessments": recent_assessments
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/professional/verify/{professional_id}")
async def verify_professional(professional_id: str, verification_data: Dict):
    """Verify a healthcare professional (admin function)"""
    try:
        updates = {
            "verified": True,
            "verification_date": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        result = await db.professional_profiles.update_one(
            {"professional_id": professional_id},
            {"$set": updates}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Professional profile not found")
        
        return {
            "status": "success",
            "message": "Professional verified successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))