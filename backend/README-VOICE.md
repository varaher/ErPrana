# Backend Voice Services Documentation

This document describes the voice services API endpoints for speech-to-text (STT), text-to-speech (TTS), and translation capabilities.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
- [Examples](#examples)
- [Error Handling](#error-handling)
- [Configuration](#configuration)

## Overview

The voice services provide:
- **Speech-to-Text (STT)**: Convert audio to text using OpenAI Whisper or Google Cloud Speech-to-Text
- **Text-to-Speech (TTS)**: Convert text to speech using Google Cloud Text-to-Speech
- **Translation**: Translate text between languages using Google Translate
- **Language Detection**: Automatically detect the language of input text

## Authentication

All voice endpoints require authentication. Two methods are supported:

1. **Regular JWT Token**: Standard user authentication
2. **Emergency Token**: Short-lived tokens for critical access (when enabled)

### Emergency Mode

Emergency mode allows access to voice services without standard authentication:
- Configured via `EMERGENCY_TOKEN_SECRET` environment variable
- Tokens expire quickly (default: 5 minutes)
- Useful for critical voice interactions

## Rate Limiting

Voice endpoints have configurable rate limits:

- **STT endpoints**: 30 requests per 15 minutes
- **TTS endpoints**: 40 requests per 15 minutes  
- **Translation endpoints**: 40 requests per 15 minutes
- **General endpoints**: 50 requests per 15 minutes
- **WebSocket connections**: 10 per minute

Emergency tokens can bypass rate limits.

## API Endpoints

### Base URL
```
https://your-domain.com/api/voice
```

### Health Check
```http
GET /health
```

### Speech-to-Text

#### OpenAI Whisper
```http
POST /whisper
```

#### Google Cloud STT
```http
POST /google-stt
```

### Text-to-Speech

#### Google Cloud TTS
```http
POST /google-tts
```

### Translation

#### Single Translation
```http
POST /translate
```

#### Batch Translation
```http
POST /translate-batch
```

#### Language Detection
```http
POST /detect-language
```

### Utility Endpoints

#### Supported Languages
```http
GET /languages?target=en
```

#### Available Voices
```http
GET /voices?language=en-US
```

#### Service Status
```http
GET /status
```

## Examples

### 1. Speech-to-Text with Whisper

#### Using Base64 Audio
```bash
curl -X POST "https://your-domain.com/api/voice/whisper" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
    "language": "en",
    "model": "whisper-1"
  }'
```

#### Using File Upload
```bash
curl -X POST "https://your-domain.com/api/voice/whisper" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "audio=@recording.webm" \
  -F "language=en" \
  -F "model=whisper-1"
```

### 2. Speech-to-Text with Google Cloud

```bash
curl -X POST "https://your-domain.com/api/voice/google-stt" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "audio": "UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT",
    "language": "en-US",
    "encoding": "WEBM_OPUS",
    "sampleRateHertz": 48000,
    "model": "latest_long"
  }'
```

### 3. Text-to-Speech

```bash
curl -X POST "https://your-domain.com/api/voice/google-tts" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test of the text-to-speech service.",
    "language": "en-US",
    "voiceId": "en-US-Wavenet-A",
    "rate": 1.0,
    "pitch": 0.0
  }'
```

### 4. Translation

#### Single Translation
```bash
curl -X POST "https://your-domain.com/api/voice/translate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, how are you today?",
    "from": "en",
    "to": "es"
  }'
```

#### Auto-detect Source Language
```bash
curl -X POST "https://your-domain.com/api/voice/translate" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bonjour, comment allez-vous?",
    "to": "en"
  }'
```

#### Batch Translation
```bash
curl -X POST "https://your-domain.com/api/voice/translate-batch" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "texts": [
      "Hello world",
      "Good morning",
      "How are you?"
    ],
    "to": "es"
  }'
```

### 5. Language Detection

```bash
curl -X POST "https://your-domain.com/api/voice/detect-language" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bonjour, comment allez-vous aujourd'hui?"
  }'
```

### 6. Get Supported Languages

```bash
curl -X GET "https://your-domain.com/api/voice/languages?target=en" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 7. Get Available Voices

```bash
curl -X GET "https://your-domain.com/api/voice/voices?language=en-US" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 8. Service Status

```bash
curl -X GET "https://your-domain.com/api/voice/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 9. Health Check

```bash
curl -X GET "https://your-domain.com/api/voice/health"
```

## Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data varies by endpoint
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "details": "Additional error details",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Error Handling

### Common HTTP Status Codes

- **200**: Success
- **400**: Bad Request (invalid input)
- **401**: Unauthorized (authentication required)
- **413**: Payload Too Large (audio file too big)
- **429**: Too Many Requests (rate limit exceeded)
- **500**: Internal Server Error
- **503**: Service Unavailable (service disabled)

### Error Types

1. **Authentication Errors**
   - Missing or invalid JWT token
   - Expired emergency token

2. **Input Validation Errors**
   - Missing required fields
   - Invalid audio format
   - Audio file too large
   - Unsupported language codes

3. **Service Errors**
   - Service not enabled
   - API quota exceeded
   - Network connectivity issues

## Configuration

### Environment Variables

```bash
# Google Cloud Configuration
VOICE_GOOGLE_PROJECT_ID=your_project_id
VOICE_GOOGLE_API_KEY=your_api_key
VOICE_GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
VOICE_ENABLE_GOOGLE=true

# OpenAI Configuration
VOICE_OPENAI_API_KEY=your_openai_api_key
VOICE_ENABLE_WHISPER=true

# Voice Service Settings
VOICE_MAX_AUDIO_SIZE=10485760
VOICE_RATE_LIMIT_WINDOW=900000
VOICE_RATE_LIMIT_MAX=50
VOICE_AUDIO_FORMATS=webm,mp3,wav,m4a
VOICE_TTS_RETURN_BASE64=false
VOICE_TTS_SIGNED_URL_EXPIRY=3600

# Emergency Mode
EMERGENCY_TOKEN_SECRET=your_emergency_secret
EMERGENCY_TOKEN_EXPIRY=300
```

### Audio Format Support

Supported audio formats:
- **WebM** (Opus codec) - Recommended for web
- **MP3** - Widely compatible
- **WAV** - Uncompressed
- **M4A** - Apple format

### Language Support

#### Whisper Models
- **whisper-1**: Latest model with best accuracy
- **whisper-1-large**: Higher accuracy for complex audio

#### Google Cloud STT
- **latest_long**: Best for long-form audio
- **latest_short**: Optimized for short audio
- **command_and_search**: Best for commands
- **phone_call**: Optimized for phone calls

#### Google Cloud TTS Voices
- **Wavenet**: High-quality neural voices
- **Standard**: Traditional TTS voices
- **Studio**: Premium quality voices

## Best Practices

### Audio Quality
1. Use WebM with Opus codec for best compression/quality ratio
2. Sample rate: 48kHz recommended
3. Keep audio files under 10MB
4. Use clear, quiet recording environments

### Performance
1. Batch translations when processing multiple texts
2. Use appropriate language hints for better accuracy
3. Implement client-side caching for repeated requests
4. Monitor rate limits and implement exponential backoff

### Security
1. Always use HTTPS in production
2. Rotate API keys regularly
3. Monitor usage patterns for anomalies
4. Use emergency tokens sparingly

## Troubleshooting

### Common Issues

1. **"Service not available"**
   - Check if service is enabled in environment
   - Verify API keys are valid
   - Check service account permissions

2. **"Audio format not supported"**
   - Ensure audio file extension is in allowed formats
   - Convert audio to supported format if needed

3. **"Rate limit exceeded"**
   - Implement exponential backoff
   - Use batch endpoints when possible
   - Consider upgrading rate limits

4. **"Authentication required"**
   - Verify JWT token is valid and not expired
   - Check if emergency mode is enabled
   - Ensure proper Authorization header format

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
DEBUG=voice:*
```

## Integration Examples

### Frontend Integration

```javascript
// Example: Using the voice API from frontend
class VoiceAPI {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async transcribeAudio(audioBlob, language = 'en') {
    const base64 = await this.blobToBase64(audioBlob);
    
    const response = await fetch(`${this.baseURL}/whisper`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio: base64,
        language: language
      })
    });

    return response.json();
  }

  async synthesizeSpeech(text, language = 'en-US') {
    const response = await fetch(`${this.baseURL}/google-tts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        language: language
      })
    });

    return response.json();
  }

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
```

### WebSocket Streaming (Future)

For real-time streaming, the API supports WebSocket connections:

```javascript
// Example: WebSocket streaming for real-time transcription
class VoiceWebSocket {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.ws = null;
  }

  connect() {
    this.ws = new WebSocket(`${this.url}/stream?token=${this.token}`);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'transcription') {
        console.log('Transcription:', data.text);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  sendAudio(audioData) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
```

## Support

For technical support or questions about the voice services:

1. Check the service status endpoint: `GET /api/voice/status`
2. Review error logs for detailed error information
3. Verify configuration and environment variables
4. Test with the health check endpoint: `GET /api/voice/health`

## Changelog

### Version 1.0.0
- Initial release with Whisper, Google STT, Google TTS, and Google Translate
- Support for base64 and file upload audio input
- Rate limiting and authentication
- Emergency mode support
- Comprehensive error handling
- Audio format validation
- Language detection and translation
- Batch processing capabilities
