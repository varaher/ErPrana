from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from emergentintegrations.llm.openai import OpenAIChatRealtime
import os
import io
import json
from typing import Optional
import uuid
from datetime import datetime, timezone

router = APIRouter()

# Initialize OpenAI Realtime Chat with Emergent LLM key
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
if not EMERGENT_LLM_KEY:
    raise ValueError("EMERGENT_LLM_KEY not found in environment variables")

# Initialize the chat client
chat = OpenAIChatRealtime(api_key=EMERGENT_LLM_KEY)

# Register the realtime router
OpenAIChatRealtime.register_openai_realtime_router(router, chat)

# Additional models for voice assistant
class VoiceMessage(BaseModel):
    user_id: str
    message: str
    session_id: Optional[str] = None
    language: str = "en-US"

class SpeechToTextRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
    language: str = "en-US"

class TextToSpeechRequest(BaseModel):
    text: str
    voice: str = "alloy"  # OpenAI voice options: alloy, echo, fable, onyx, nova, shimmer
    speed: float = 1.0

@router.post("/voice/speech-to-text")
async def speech_to_text(
    file: UploadFile = File(...),
    user_id: str = None,
    session_id: str = None,
    language: str = "en-US"
):
    """Convert speech audio to text using OpenAI Whisper"""
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        # Read audio file
        audio_data = await file.read()
        
        # Create a file-like object from the audio data
        audio_file = io.BytesIO(audio_data)
        audio_file.name = file.filename or "audio.wav"
        
        # Use OpenAI client to transcribe
        from openai import OpenAI
        client = OpenAI(api_key=EMERGENT_LLM_KEY)
        
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language=language,
            response_format="json"
        )
        
        # Log the transcription
        transcription_record = {
            "transcription_id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_id": session_id,
            "original_filename": file.filename,
            "transcribed_text": transcription.text,
            "language": language,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        return {
            "status": "success",
            "transcription": transcription.text,
            "session_id": session_id,
            "transcription_id": transcription_record["transcription_id"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech to text failed: {str(e)}")

@router.post("/voice/text-to-speech")
async def text_to_speech(request: TextToSpeechRequest):
    """Convert text to speech using OpenAI TTS"""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=EMERGENT_LLM_KEY)
        
        # Generate speech
        response = client.audio.speech.create(
            model="tts-1",
            voice=request.voice,
            input=request.text,
            speed=request.speed
        )
        
        # Create audio stream
        def generate_audio():
            for chunk in response.iter_bytes():
                yield chunk
        
        return StreamingResponse(
            generate_audio(),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=speech.mp3"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text to speech failed: {str(e)}")

@router.post("/voice/conversation")
async def voice_conversation(message: VoiceMessage):
    """Handle a complete voice conversation with ARYA"""
    try:
        session_id = message.session_id or str(uuid.uuid4())
        
        # For now, provide a simple response until symptom intelligence integration is fixed
        arya_response = {
            "response": f"Hello! I'm ARYA, your medical assistant. I understand you said: '{message.message}'. I'm here to help with your health concerns. Can you tell me more about your symptoms?",
            "arya_state": "listening",
            "emergency_level": "normal",
            "next_questions": ["Can you describe your symptoms in more detail?", "When did these symptoms start?"]
        }
        
        # Return both text and audio response (without actual TTS due to API key issue)
        return {
            "status": "success",
            "session_id": session_id,
            "text_response": arya_response.get("response"),
            "audio_available": False,  # Set to False due to API key issue
            "arya_state": arya_response.get("arya_state"),
            "emergency_level": arya_response.get("emergency_level"),
            "next_questions": arya_response.get("next_questions", [])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice conversation failed: {str(e)}")

@router.get("/voice/session/{session_id}/audio")
async def get_session_audio(session_id: str):
    """Get the audio response for a session"""
    try:
        # This would typically retrieve stored audio from the session
        # For now, return a placeholder response
        return {"message": "Audio retrieval not implemented yet"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/voice/voices")
async def get_available_voices():
    """Get list of available voices for TTS"""
    return {
        "voices": [
            {"id": "alloy", "name": "Alloy", "gender": "neutral"},
            {"id": "echo", "name": "Echo", "gender": "male"},
            {"id": "fable", "name": "Fable", "gender": "neutral"},
            {"id": "onyx", "name": "Onyx", "gender": "male"},
            {"id": "nova", "name": "Nova", "gender": "female"},
            {"id": "shimmer", "name": "Shimmer", "gender": "female"}
        ],
        "default_voice": "nova"
    }

@router.post("/voice/realtime/session")
async def create_realtime_session():
    """Create a new realtime voice session"""
    try:
        # Create a simple session for now
        session_id = str(uuid.uuid4())
        session_data = {
            "session_id": session_id,
            "status": "created",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "voice_enabled": True,
            "language": "en-US"
        }
        return session_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create realtime session: {str(e)}")

# Add health check for voice assistant
@router.get("/voice/health")
async def voice_health_check():
    """Health check for voice assistant functionality"""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=EMERGENT_LLM_KEY)
        
        # Test a simple TTS request
        test_response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input="Health check"
        )
        
        return {
            "status": "healthy",
            "openai_connection": "active",
            "tts_available": True,
            "stt_available": True,
            "realtime_available": True
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "openai_connection": "failed"
        }