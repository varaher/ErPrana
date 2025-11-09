from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime

# Import all routers
from routes.symptom_intelligence import router as symptom_router
from routes.advanced_symptom_intelligence import router as advanced_symptom_router
from routes.structured_medical_interview import router as structured_interview_router
from routes.integrated_medical_ai import router as integrated_ai_router
from routes.unified_clinical_chat import router as unified_router
from routes.natural_language_processor import router as nlu_router
from routes.feedback_system import router as feedback_router
from routes.feedback import router as feedback_new_router
from routes.adaptive_learning import router as adaptive_learning_router
from routes.wearable_intelligence import router as wearable_intelligence_router
from routes.wearables_sync import router as wearables_router
from routes.voice_assistant import router as voice_router
from routes.professional_mode import router as professional_router
from routes.medication_management import router as medication_router
from routes.symptom_intelligence_routes import router as symptom_intelligence_layer_router
from routes.hybrid_clinical_system import router as hybrid_clinical_router
from routes.triage_feedback import router as triage_feedback_router


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class SymptomFeedback(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sessionId: str = None
    symptoms: List[str] = []
    diagnosis: List = []  # More flexible to handle any type
    feedback: str  # 'positive' or 'negative'
    additionalFeedback: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SymptomFeedbackCreate(BaseModel):
    sessionId: str = None
    symptoms: List[str] = []
    diagnosis: List = []  # More flexible to handle any type
    feedback: str
    additionalFeedback: str = ""
    timestamp: str = None  # Accept timestamp as string from frontend

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Backend is running"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

@api_router.post("/symptom-feedback", response_model=SymptomFeedback)
async def create_symptom_feedback(input: SymptomFeedbackCreate):
    feedback_dict = input.dict()
    # Remove the frontend timestamp and let backend generate it
    if 'timestamp' in feedback_dict:
        del feedback_dict['timestamp']
    feedback_obj = SymptomFeedback(**feedback_dict)
    _ = await db.symptom_feedback.insert_one(feedback_obj.dict())
    logger.info(f"Symptom feedback saved: {feedback_obj.feedback} for session {feedback_obj.sessionId}")
    return feedback_obj

@api_router.get("/symptom-feedback", response_model=List[SymptomFeedback])
async def get_symptom_feedback():
    feedback_list = await db.symptom_feedback.find().to_list(1000)
    return [SymptomFeedback(**feedback) for feedback in feedback_list]

# Include the routers in the main app
app.include_router(api_router)
app.include_router(symptom_router, prefix="/api")
app.include_router(advanced_symptom_router, prefix="/api/advanced")
app.include_router(structured_interview_router, prefix="/api/structured")
app.include_router(integrated_ai_router, prefix="/api/integrated")
app.include_router(unified_router, prefix="/api/unified")
app.include_router(nlu_router, prefix="/api/nlu")
app.include_router(feedback_router, prefix="/api/feedback")
app.include_router(feedback_new_router, prefix="/api/feedback-new")
app.include_router(adaptive_learning_router, prefix="/api/learning")
app.include_router(wearable_intelligence_router, prefix="/api/wearable-intelligence")
app.include_router(wearables_router, prefix="/api")
app.include_router(voice_router, prefix="/api")
app.include_router(professional_router, prefix="/api")
app.include_router(medication_router, prefix="/api")
app.include_router(symptom_intelligence_layer_router, prefix="/api/symptom-intelligence-layer")
app.include_router(hybrid_clinical_router, prefix="/api/hybrid")
app.include_router(triage_feedback_router, prefix="/api/triage-feedback")

# Enhanced hybrid chat with loop prevention
from routes.enhanced_hybrid_chat import router as enhanced_hybrid_router
app.include_router(enhanced_hybrid_router, prefix="/api/enhanced-hybrid")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
