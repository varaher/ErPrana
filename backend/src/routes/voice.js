const express = require('express');
const multer = require('multer');
const { authenticateToken, authenticateEmergencyToken } = require('../middleware/auth');
const { applyRateLimit } = require('../middleware/voiceRateLimit');
const { isEmergencyModeEnabled } = require('../middleware/emergencyAuth');
const WhisperService = require('../services/voice/whisperService');
const GoogleSTTService = require('../services/voice/googleSttService');
const GoogleTTSService = require('../services/voice/googleTtsService');
const GoogleTranslateService = require('../services/voice/translateService');
const { getServiceConfig, isServiceEnabled } = require('../config/voice');

const router = express.Router();

// Configure multer for audio file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.VOICE_MAX_AUDIO_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedFormats = (process.env.VOICE_AUDIO_FORMATS || 'webm,mp3,wav,m4a').split(',');
    const fileExtension = file.originalname.split('.').pop().toLowerCase();
    
    if (allowedFormats.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`Audio format not supported. Allowed: ${allowedFormats.join(', ')}`));
    }
  }
});

// Initialize services
const whisperService = new WhisperService();
const googleSTTService = new GoogleSTTService();
const googleTTSService = new GoogleTTSService();
const googleTranslateService = new GoogleTranslateService();

// Helper function to validate audio data
function validateAudioData(audioData, contentType) {
  if (!audioData || audioData.length === 0) {
    throw new Error('No audio data provided');
  }
  
  if (contentType && !contentType.startsWith('audio/')) {
    throw new Error('Invalid content type. Expected audio data.');
  }
  
  return true;
}

// Helper function to convert base64 to buffer
function base64ToBuffer(base64String) {
  try {
    // Remove data URL prefix if present
    const base64Data = base64String.replace(/^data:audio\/[^;]+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    throw new Error('Invalid base64 audio data');
  }
}

// Helper function to get user language preference
function getUserLanguage(req) {
  // Priority: 1. Query param, 2. Header, 3. Default
  return req.query.lang || req.headers['accept-language']?.split(',')[0]?.split(';')[0] || 'en';
}

// Helper function to create error response
function createErrorResponse(res, statusCode, message, details = null) {
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
}

// Helper function to create success response
function createSuccessResponse(res, data, message = 'Success') {
  return res.json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

// Middleware to check if voice services are enabled
const checkVoiceServices = (req, res, next) => {
  const hasAnyService = isServiceEnabled('google') || isServiceEnabled('openai');
  
  if (!hasAnyService) {
    return createErrorResponse(res, 503, 'Voice services are not available');
  }
  
  next();
};

// Authentication middleware - allow either regular auth or emergency tokens
const authenticateVoice = async (req, res, next) => {
  try {
    // Try regular authentication first
    const authResult = await authenticateToken(req, res, (err) => {
      if (err) {
        // If regular auth fails, try emergency token
        if (isEmergencyModeEnabled()) {
          return authenticateEmergencyToken(req, res, next);
        }
        return createErrorResponse(res, 401, 'Authentication required');
      }
      next();
    });
    
    if (authResult) {
      next();
    }
  } catch (error) {
    // If regular auth throws an error, try emergency token
    if (isEmergencyModeEnabled()) {
      return authenticateEmergencyToken(req, res, next);
    }
    return createErrorResponse(res, 401, 'Authentication required');
  }
};

// Health check endpoint
router.get('/health', (req, res) => {
  const services = {
    whisper: whisperService.isAvailable(),
    googleSTT: googleSTTService.isAvailable(),
    googleTTS: googleTTSService.isAvailable(),
    googleTranslate: googleTranslateService.isAvailable()
  };
  
  const overallHealth = Object.values(services).some(available => available);
  
  res.json({
    success: true,
    healthy: overallHealth,
    services,
    timestamp: new Date().toISOString()
  });
});

// Whisper STT endpoint
router.post('/whisper', 
  authenticateVoice,
  applyRateLimit('stt'),
  checkVoiceServices,
  async (req, res) => {
    try {
      if (!isServiceEnabled('openai')) {
        return createErrorResponse(res, 503, 'Whisper service is not enabled');
      }
      
      if (!whisperService.isAvailable()) {
        return createErrorResponse(res, 503, 'Whisper service is not available');
      }
      
      let audioData;
      let options = {};
      
      // Handle different input formats
      if (req.body.audio) {
        // Base64 audio from JSON body
        audioData = base64ToBuffer(req.body.audio);
        options = {
          language: req.body.language || getUserLanguage(req),
          model: req.body.model || 'whisper-1',
          prompt: req.body.prompt,
          responseFormat: req.body.responseFormat || 'json',
          temperature: req.body.temperature || 0
        };
      } else if (req.file) {
        // Audio file upload
        audioData = req.file.buffer;
        options = {
          language: req.body.language || getUserLanguage(req),
          model: req.body.model || 'whisper-1',
          prompt: req.body.prompt,
          responseFormat: req.body.responseFormat || 'json',
          temperature: req.body.temperature || 0
        };
      } else {
        return createErrorResponse(res, 400, 'No audio data provided. Send audio as base64 in JSON body or upload audio file.');
      }
      
      validateAudioData(audioData);
      
      const result = await whisperService.transcribe(audioData, options);
      
      return createSuccessResponse(res, {
        text: result.text,
        language: result.language,
        model: options.model,
        duration: result.duration,
        segments: result.segments
      }, 'Transcription completed successfully');
      
    } catch (error) {
      console.error('Whisper transcription error:', error);
      return createErrorResponse(res, 500, 'Transcription failed', error.message);
    }
  }
);

// Google STT endpoint
router.post('/google-stt',
  authenticateVoice,
  applyRateLimit('stt'),
  checkVoiceServices,
  async (req, res) => {
    try {
      if (!isServiceEnabled('google')) {
        return createErrorResponse(res, 503, 'Google STT service is not enabled');
      }
      
      if (!googleSTTService.isAvailable()) {
        return createErrorResponse(res, 503, 'Google STT service is not available');
      }
      
      let audioData;
      let options = {};
      
      // Handle different input formats
      if (req.body.audio) {
        // Base64 audio from JSON body
        audioData = base64ToBuffer(req.body.audio);
        options = {
          language: req.body.language || getUserLanguage(req),
          encoding: req.body.encoding || 'WEBM_OPUS',
          sampleRateHertz: req.body.sampleRateHertz || 48000,
          model: req.body.model || 'latest_long',
          enableAutomaticPunctuation: req.body.enableAutomaticPunctuation !== false,
          enableWordTimeOffsets: req.body.enableWordTimeOffsets || false,
          enableWordConfidence: req.body.enableWordConfidence || false
        };
      } else if (req.file) {
        // Audio file upload
        audioData = req.file.buffer;
        options = {
          language: req.body.language || getUserLanguage(req),
          encoding: req.body.encoding || 'WEBM_OPUS',
          sampleRateHertz: req.body.sampleRateHertz || 48000,
          model: req.body.model || 'latest_long',
          enableAutomaticPunctuation: req.body.enableAutomaticPunctuation !== false,
          enableWordTimeOffsets: req.body.enableWordTimeOffsets || false,
          enableWordConfidence: req.body.enableWordConfidence || false
        };
      } else {
        return createErrorResponse(res, 400, 'No audio data provided. Send audio as base64 in JSON body or upload audio file.');
      }
      
      validateAudioData(audioData);
      
      const result = await googleSTTService.transcribe(audioData, options);
      
      return createSuccessResponse(res, {
        text: result.text,
        language: result.language,
        confidence: result.confidence,
        alternatives: result.alternatives,
        model: options.model
      }, 'Google STT transcription completed successfully');
      
    } catch (error) {
      console.error('Google STT transcription error:', error);
      return createErrorResponse(res, 500, 'Google STT transcription failed', error.message);
    }
  }
);

// Google TTS endpoint
router.post('/google-tts',
  authenticateVoice,
  applyRateLimit('tts'),
  checkVoiceServices,
  async (req, res) => {
    try {
      if (!isServiceEnabled('google')) {
        return createErrorResponse(res, 503, 'Google TTS service is not enabled');
      }
      
      if (!googleTTSService.isAvailable()) {
        return createErrorResponse(res, 503, 'Google TTS service is not available');
      }
      
      const { text, language, voiceId, rate, pitch, volumeGainDb } = req.body;
      
      if (!text || typeof text !== 'string') {
        return createErrorResponse(res, 400, 'Text is required and must be a string');
      }
      
      const options = {
        language: language || getUserLanguage(req),
        voiceId: voiceId || 'en-US-Wavenet-A',
        rate: rate || 1.0,
        pitch: pitch || 0.0,
        volumeGainDb: volumeGainDb || 0.0,
        effectsProfileId: req.body.effectsProfileId || ['headphone-class-device']
      };
      
      const result = await googleTTSService.synthesize(text, options);
      
      // Check if we should return base64 or save to file
      const returnBase64 = process.env.VOICE_TTS_RETURN_BASE64 === 'true';
      
      if (returnBase64) {
        return createSuccessResponse(res, {
          audio: result.audioContent,
          format: 'MP3',
          text,
          language: options.language,
          voiceId: options.voiceId,
          rate: options.rate,
          pitch: options.pitch
        }, 'TTS synthesis completed successfully');
      } else {
        // Save to temporary file and return URL
        const audioFile = await googleTTSService.saveAudioToFile(result.audioContent, 'MP3');
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const audioUrl = `${baseUrl}/api/voice/audio/${audioFile.filename}`;
        
        return createSuccessResponse(res, {
          audioUrl,
          filename: audioFile.filename,
          format: 'MP3',
          text,
          language: options.language,
          voiceId: options.voiceId,
          rate: options.rate,
          pitch: options.pitch,
          expiresAt: audioFile.expiresAt
        }, 'TTS synthesis completed successfully');
      }
      
    } catch (error) {
      console.error('Google TTS synthesis error:', error);
      return createErrorResponse(res, 500, 'Google TTS synthesis failed', error.message);
    }
  }
);

// Translation endpoint
router.post('/translate',
  authenticateVoice,
  applyRateLimit('translate'),
  checkVoiceServices,
  async (req, res) => {
    try {
      if (!isServiceEnabled('google')) {
        return createErrorResponse(res, 503, 'Google Translate service is not enabled');
      }
      
      if (!googleTranslateService.isAvailable()) {
        return createErrorResponse(res, 503, 'Google Translate service is not available');
      }
      
      const { text, from, to, format } = req.body;
      
      if (!text || typeof text !== 'string') {
        return createErrorResponse(res, 400, 'Text is required and must be a string');
      }
      
      if (!to || typeof to !== 'string') {
        return createErrorResponse(res, 400, 'Target language (to) is required');
      }
      
      const options = {
        from: from || 'auto',
        to,
        format: format || 'text'
      };
      
      const result = await googleTranslateService.translate(text, options);
      
      return createSuccessResponse(res, {
        translatedText: result.translatedText,
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        detectedLanguage: result.detectedLanguage,
        originalText: result.originalText
      }, 'Translation completed successfully');
      
    } catch (error) {
      console.error('Translation error:', error);
      return createErrorResponse(res, 500, 'Translation failed', error.message);
    }
  }
);

// Language detection endpoint
router.post('/detect-language',
  authenticateVoice,
  applyRateLimit('translate'),
  checkVoiceServices,
  async (req, res) => {
    try {
      if (!isServiceEnabled('google')) {
        return createErrorResponse(res, 503, 'Google Translate service is not enabled');
      }
      
      if (!googleTranslateService.isAvailable()) {
        return createErrorResponse(res, 503, 'Google Translate service is not available');
      }
      
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return createErrorResponse(res, 400, 'Text is required and must be a string');
      }
      
      const detectedLanguage = await googleTranslateService.detectLanguage(text);
      const languageName = googleTranslateService.getLanguageName(detectedLanguage);
      const nativeName = googleTranslateService.getNativeLanguageName(detectedLanguage);
      const isRTL = googleTranslateService.isRTL(detectedLanguage);
      const family = googleTranslateService.getLanguageFamily(detectedLanguage);
      
      return createSuccessResponse(res, {
        language: detectedLanguage,
        languageName,
        nativeName,
        isRTL,
        family,
        confidence: 1.0,
        text
      }, 'Language detection completed successfully');
      
    } catch (error) {
      console.error('Language detection error:', error);
      return createErrorResponse(res, 500, 'Language detection failed', error.message);
    }
  }
);

// Get supported languages endpoint
router.get('/languages',
  authenticateVoice,
  applyRateLimit('general'),
  checkVoiceServices,
  async (req, res) => {
    try {
      if (!isServiceEnabled('google')) {
        return createErrorResponse(res, 503, 'Google Translate service is not enabled');
      }
      
      if (!googleTranslateService.isAvailable()) {
        return createErrorResponse(res, 503, 'Google Translate service is not available');
      }
      
      const targetLanguage = req.query.target || 'en';
      const languages = await googleTranslateService.getSupportedLanguages(targetLanguage);
      
      // Add additional metadata for each language
      const enrichedLanguages = languages.map(lang => ({
        ...lang,
        nativeName: googleTranslateService.getNativeLanguageName(lang.code),
        isRTL: googleTranslateService.isRTL(lang.code),
        family: googleTranslateService.getLanguageFamily(lang.code)
      }));
      
      return createSuccessResponse(res, {
        languages: enrichedLanguages,
        targetLanguage,
        count: enrichedLanguages.length
      }, 'Supported languages retrieved successfully');
      
    } catch (error) {
      console.error('Get languages error:', error);
      return createErrorResponse(res, 500, 'Failed to get supported languages', error.message);
    }
  }
);

// Get available voices endpoint
router.get('/voices',
  authenticateVoice,
  applyRateLimit('general'),
  checkVoiceServices,
  async (req, res) => {
    try {
      if (!isServiceEnabled('google')) {
        return createErrorResponse(res, 503, 'Google TTS service is not enabled');
      }
      
      if (!googleTTSService.isAvailable()) {
        return createErrorResponse(res, 503, 'Google TTS service is not available');
      }
      
      const languageCode = req.query.language;
      const voices = await googleTTSService.getVoices(languageCode);
      
      return createSuccessResponse(res, {
        voices,
        languageCode: languageCode || 'all',
        count: voices.length
      }, 'Available voices retrieved successfully');
      
    } catch (error) {
      console.error('Get voices error:', error);
      return createErrorResponse(res, 500, 'Failed to get available voices', error.message);
    }
  }
);

// Batch translation endpoint
router.post('/translate-batch',
  authenticateVoice,
  applyRateLimit('translate'),
  checkVoiceServices,
  async (req, res) => {
    try {
      if (!isServiceEnabled('google')) {
        return createErrorResponse(res, 503, 'Google Translate service is not enabled');
      }
      
      if (!googleTranslateService.isAvailable()) {
        return createErrorResponse(res, 503, 'Google Translate service is not available');
      }
      
      const { texts, from, to, format } = req.body;
      
      if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return createErrorResponse(res, 400, 'Texts array is required and must not be empty');
      }
      
      if (!to || typeof to !== 'string') {
        return createErrorResponse(res, 400, 'Target language (to) is required');
      }
      
      if (texts.length > 100) {
        return createErrorResponse(res, 400, 'Maximum 100 texts allowed per batch request');
      }
      
      const options = {
        from: from || 'auto',
        to,
        format: format || 'text'
      };
      
      const results = await googleTranslateService.batchTranslate(texts, options);
      
      return createSuccessResponse(res, {
        translations: results,
        sourceLanguage: options.from,
        targetLanguage: options.to,
        count: results.length
      }, 'Batch translation completed successfully');
      
    } catch (error) {
      console.error('Batch translation error:', error);
      return createErrorResponse(res, 500, 'Batch translation failed', error.message);
    }
  }
);

// Service status endpoint
router.get('/status',
  authenticateVoice,
  applyRateLimit('general'),
  async (req, res) => {
    try {
      const status = {
        whisper: {
          enabled: isServiceEnabled('openai'),
          available: await whisperService.isAvailable(),
          config: whisperService.getConfig()
        },
        googleSTT: {
          enabled: isServiceEnabled('google'),
          available: await googleSTTService.isAvailable(),
          config: googleSTTService.getConfig()
        },
        googleTTS: {
          enabled: isServiceEnabled('google'),
          available: await googleTTSService.isAvailable(),
          config: googleTTSService.getConfig()
        },
        googleTranslate: {
          enabled: isServiceEnabled('google'),
          available: await googleTranslateService.isAvailable(),
          config: googleTranslateService.getConfig()
        },
        emergencyMode: isEmergencyModeEnabled(),
        timestamp: new Date().toISOString()
      };
      
      return createSuccessResponse(res, status, 'Service status retrieved successfully');
      
    } catch (error) {
      console.error('Status check error:', error);
      return createErrorResponse(res, 500, 'Failed to get service status', error.message);
    }
  }
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Voice route error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return createErrorResponse(res, 413, 'Audio file too large');
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return createErrorResponse(res, 413, 'Too many files');
    }
    return createErrorResponse(res, 400, 'File upload error', error.message);
  }
  
  if (error.message.includes('Audio format not supported')) {
    return createErrorResponse(res, 400, error.message);
  }
  
  return createErrorResponse(res, 500, 'Internal server error', error.message);
});

module.exports = router;
