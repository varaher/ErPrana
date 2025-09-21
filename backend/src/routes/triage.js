const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requirePatientOrDoctor } = require('../middleware/auth');
const { assessTriage } = require('../controllers/triageController');

const router = express.Router();

// Apply authentication to all routes except playground
router.use(authenticateToken);
router.use(requirePatientOrDoctor);

// Stateless triage assessment (existing route)
router.post('/assess', [
  body('abcde').isObject().withMessage('ABCDE assessment is required'),
  body('vitals').isObject().withMessage('Vitals are required'),
  body('sample').isObject().withMessage('SAMPLE history is required'),
  body('socrates').optional().isObject().withMessage('SOCRATES must be an object'),
  body('age').isInt({ min: 0, max: 120 }).withMessage('Age must be between 0 and 120'),
  body('ageGroup').optional().isIn(['adult', 'pediatric']).withMessage('Age group must be adult or pediatric')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  await assessTriage(req, res);
});

// Create a separate router for playground routes (no authentication)
const playgroundRouter = express.Router();

// Playground route for stateless triage assessment (no authentication required)
playgroundRouter.post('/playground', [
  body('age').isInt({ min: 0, max: 120 }).withMessage('Age must be between 0 and 120'),
  body('sex').optional().isIn(['male', 'female', 'other']).withMessage('Sex must be male, female, or other'),
  body('abcde').isObject().withMessage('ABCDE assessment is required'),
  body('sample').isObject().withMessage('SAMPLE history is required'),
  body('socrates').optional().isObject().withMessage('SOCRATES must be an object'),
  body('vitals').isObject().withMessage('Vitals are required'),
  body('vitals.hr').optional().isInt({ min: 30, max: 220 }).withMessage('Heart rate must be between 30 and 220'),
  body('vitals.rr').optional().isInt({ min: 4, max: 60 }).withMessage('Respiratory rate must be between 4 and 60'),
  body('vitals.sbp').optional().isInt({ min: 60, max: 250 }).withMessage('Systolic BP must be between 60 and 250'),
  body('vitals.dbp').optional().isInt({ min: 30, max: 150 }).withMessage('Diastolic BP must be between 30 and 150'),
  body('vitals.spo2').optional().isInt({ min: 50, max: 100 }).withMessage('SpO2 must be between 50 and 100'),
  body('vitals.temp').optional().isFloat({ min: 33, max: 42 }).withMessage('Temperature must be between 33 and 42'),
  body('vitals.gcs').optional().isInt({ min: 3, max: 15 }).withMessage('GCS must be between 3 and 15')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  await assessTriage(req, res);
});

module.exports = { router, playgroundRouter };
