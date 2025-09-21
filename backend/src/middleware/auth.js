const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Authenticate JWT token
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid token - user not found'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({
      error: 'Invalid or expired token'
    });
  }
};

/**
 * Require specific role
 */
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        error: `Access denied. ${role} role required.`
      });
    }

    next();
  };
};

/**
 * Require patient role
 */
const requirePatient = requireRole('patient');

/**
 * Require doctor role
 */
const requireDoctor = requireRole('doctor');

/**
 * Require either patient or doctor role
 */
const requirePatientOrDoctor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (req.user.role !== 'patient' && req.user.role !== 'doctor') {
    return res.status(403).json({
      error: 'Access denied. Patient or doctor role required.'
    });
  }

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePatient,
  requireDoctor,
  requirePatientOrDoctor
}; 