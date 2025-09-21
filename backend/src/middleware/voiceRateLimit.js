const rateLimit = require('express-rate-limit');
const { getServiceConfig, isServiceEnabled } = require('../config/voice');
const { validateEmergencyToken } = require('./emergencyAuth');

/**
 * Create rate limiter for voice services
 * Allows emergency tokens to bypass rate limits
 */
const createVoiceRateLimiter = (options = {}) => {
  const config = getServiceConfig('rateLimit');
  
  return rateLimit({
    windowMs: options.windowMs || config.windowMs,
    max: options.max || config.max,
    message: {
      error: options.message || config.message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: options.windowMs || config.windowMs
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for emergency tokens
      if (isEmergencyModeEnabled()) {
        const authHeader = req.headers['authorization'];
        if (authHeader) {
          const token = authHeader.split(' ')[1];
          const emergencyToken = validateEmergencyToken(token);
          if (emergencyToken) {
            return true; // Skip rate limiting
          }
        }
      }
      return false;
    },
    keyGenerator: (req) => {
      // Use emergency token ID if available, otherwise use IP
      if (req.emergency && req.emergency.tokenId) {
        return `emergency:${req.emergency.tokenId}`;
      }
      return req.ip;
    },
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many voice requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((options.windowMs || config.windowMs) / 1000),
        message: 'Please wait before making more voice requests'
      });
    }
  });
};

/**
 * Specific rate limiters for different voice services
 */
const voiceRateLimiters = {
  // STT services (more restrictive)
  stt: createVoiceRateLimiter({
    max: 30, // 30 requests per window
    message: 'Too many speech-to-text requests'
  }),

  // TTS services (moderate)
  tts: createVoiceRateLimiter({
    max: 40, // 40 requests per window
    message: 'Too many text-to-speech requests'
  }),

  // Translation services (moderate)
  translate: createVoiceRateLimiter({
    max: 40, // 40 requests per window
    message: 'Too many translation requests'
  }),

  // General voice services
  general: createVoiceRateLimiter({
    max: 50, // 50 requests per window
    message: 'Too many voice service requests'
  }),

  // WebSocket connections (very restrictive)
  websocket: createVoiceRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 connections per minute
    message: 'Too many WebSocket connections'
  })
};

/**
 * Get rate limiter for specific service
 */
const getRateLimiter = (service) => {
  return voiceRateLimiters[service] || voiceRateLimiters.general;
};

/**
 * Apply rate limiting to route based on service type
 */
const applyRateLimit = (service) => {
  return (req, res, next) => {
    const limiter = getRateLimiter(service);
    limiter(req, res, next);
  };
};

module.exports = {
  createVoiceRateLimiter,
  voiceRateLimiters,
  getRateLimiter,
  applyRateLimit
};
