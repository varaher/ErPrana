/**
 * Voice Services Configuration
 * Loads and validates voice-related environment variables
 */

const voiceConfig = {
  // Google Cloud Configuration
  google: {
    projectId: process.env.VOICE_GOOGLE_PROJECT_ID,
    apiKey: process.env.VOICE_GOOGLE_API_KEY,
    credentialsPath: process.env.VOICE_GOOGLE_APPLICATION_CREDENTIALS,
    enabled: process.env.VOICE_ENABLE_GOOGLE === 'true',
    speech: {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: false,
      enableWordConfidence: false,
      model: 'latest_long'
    },
    tts: {
      voice: 'en-US-Wavenet-A',
      audioEncoding: 'MP3',
      speakingRate: 1.0,
      pitch: 0.0,
      effectsProfileId: ['headphone-class-device']
    }
  },

  // OpenAI Configuration
  openai: {
    apiKey: process.env.VOICE_OPENAI_API_KEY,
    enabled: process.env.VOICE_ENABLE_WHISPER === 'true',
    model: 'whisper-1',
    responseFormat: 'json',
    temperature: 0.0
  },

  // General Voice Settings
  audio: {
    maxSize: parseInt(process.env.VOICE_MAX_AUDIO_SIZE) || 10 * 1024 * 1024, // 10MB default
    supportedFormats: (process.env.VOICE_AUDIO_FORMATS || 'webm,mp3,wav,m4a').split(','),
    chunkSize: 1024 * 1024, // 1MB chunks
    tempDir: process.env.TEMP_DIR || '/tmp'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.VOICE_RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.VOICE_RATE_LIMIT_MAX) || 50, // 50 requests per window
    message: 'Too many voice requests, please try again later.'
  },

  // TTS Output Settings
  tts: {
    returnBase64: process.env.VOICE_TTS_RETURN_BASE64 === 'true',
    signedUrlExpiry: parseInt(process.env.VOICE_TTS_SIGNED_URL_EXPIRY) || 3600, // 1 hour
    storageBucket: process.env.VOICE_TTS_STORAGE_BUCKET
  },

  // Emergency Mode
  emergency: {
    secret: process.env.EMERGENCY_TOKEN_SECRET,
    expiry: parseInt(process.env.EMERGENCY_TOKEN_EXPIRY) || 300, // 5 minutes
    enabled: !!process.env.EMERGENCY_TOKEN_SECRET
  },

  // WebSocket Settings
  websocket: {
    enabled: true,
    pingInterval: 30000, // 30 seconds
    pingTimeout: 5000,   // 5 seconds
    maxPayload: 1024 * 1024 // 1MB
  }
};

/**
 * Validate voice configuration
 */
function validateConfig() {
  const errors = [];

  // Check Google Cloud configuration if enabled
  if (voiceConfig.google.enabled) {
    if (!voiceConfig.google.projectId) {
      errors.push('VOICE_GOOGLE_PROJECT_ID is required when Google services are enabled');
    }
    if (!voiceConfig.google.apiKey && !voiceConfig.google.credentialsPath) {
      errors.push('Either VOICE_GOOGLE_API_KEY or VOICE_GOOGLE_APPLICATION_CREDENTIALS is required for Google services');
    }
  }

  // Check OpenAI configuration if enabled
  if (voiceConfig.openai.enabled) {
    if (!voiceConfig.openai.apiKey) {
      errors.push('VOICE_OPENAI_API_KEY is required when Whisper is enabled');
    }
  }

  // Check emergency mode configuration
  if (voiceConfig.emergency.enabled && !voiceConfig.emergency.secret) {
    errors.push('EMERGENCY_TOKEN_SECRET is required when emergency mode is enabled');
  }

  if (errors.length > 0) {
    throw new Error(`Voice configuration errors:\n${errors.join('\n')}`);
  }
}

/**
 * Get configuration for specific service
 */
function getServiceConfig(service) {
  switch (service) {
    case 'google':
      return voiceConfig.google;
    case 'openai':
      return voiceConfig.openai;
    case 'audio':
      return voiceConfig.audio;
    case 'tts':
      return voiceConfig.tts;
    case 'websocket':
      return voiceConfig.websocket;
    case 'rateLimit':
      return voiceConfig.rateLimit;
    default:
      throw new Error(`Unknown service: ${service}`);
  }
}

/**
 * Check if service is enabled
 */
function isServiceEnabled(service) {
  switch (service) {
    case 'google':
      return voiceConfig.google.enabled;
    case 'openai':
      return voiceConfig.openai.enabled;
    default:
      return false;
  }
}

module.exports = {
  voiceConfig,
  validateConfig,
  getServiceConfig,
  isServiceEnabled
};
