const jwt = require('jsonwebtoken');
const { getServiceConfig } = require('../config/voice');

/**
 * Emergency authentication middleware for voice services
 * Allows short-lived access using emergency tokens
 */
const authenticateEmergencyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Emergency token required',
      code: 'EMERGENCY_TOKEN_MISSING'
    });
  }

  try {
    const config = getServiceConfig('emergency');
    
    if (!config.enabled) {
      return res.status(503).json({
        error: 'Emergency mode not enabled',
        code: 'EMERGENCY_MODE_DISABLED'
      });
    }

    const decoded = jwt.verify(token, config.secret);
    
    // Check if token is expired
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({
        error: 'Emergency token expired',
        code: 'EMERGENCY_TOKEN_EXPIRED'
      });
    }

    // Add emergency context to request
    req.emergency = {
      tokenId: decoded.jti,
      issuedAt: decoded.iat,
      expiresAt: decoded.exp,
      purpose: decoded.purpose || 'voice_access'
    };

    next();
  } catch (error) {
    console.error('Emergency token verification error:', error);
    return res.status(403).json({
      error: 'Invalid emergency token',
      code: 'EMERGENCY_TOKEN_INVALID'
    });
  }
};

/**
 * Generate emergency token for voice services
 * @param {string} purpose - Purpose of the token
 * @param {number} customExpiry - Custom expiry time in seconds
 * @returns {string} JWT token
 */
const generateEmergencyToken = (purpose = 'voice_access', customExpiry = null) => {
  const config = getServiceConfig('emergency');
  
  if (!config.enabled) {
    throw new Error('Emergency mode not enabled');
  }

  const payload = {
    jti: require('uuid').v4(), // Unique token ID
    purpose,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (customExpiry || config.expiry)
  };

  return jwt.sign(payload, config.secret);
};

/**
 * Validate emergency token without middleware
 * @param {string} token - JWT token
 * @returns {object|null} Decoded token or null if invalid
 */
const validateEmergencyToken = (token) => {
  try {
    const config = getServiceConfig('emergency');
    
    if (!config.enabled) {
      return null;
    }

    const decoded = jwt.verify(token, config.secret);
    
    // Check if token is expired
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Check if emergency mode is enabled
 */
const isEmergencyModeEnabled = () => {
  try {
    const config = getServiceConfig('emergency');
    return config.enabled;
  } catch (error) {
    return false;
  }
};

module.exports = {
  authenticateEmergencyToken,
  generateEmergencyToken,
  validateEmergencyToken,
  isEmergencyModeEnabled
};
