const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requirePatientOrDoctor } = require('../middleware/auth');
const {
  createSession,
  addAnswer,
  completeSession,
  getSession,
  submitFeedback
} = require('../controllers/symptomController');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requirePatientOrDoctor);

// Create a new symptom session
router.post('/session', [
  body('age').isInt({ min: 0, max: 120 }).withMessage('Age must be between 0 and 120'),
  body('sex').optional().isIn(['male', 'female', 'other']).withMessage('Sex must be male, female, or other'),
  body('initialAbcde').optional().isObject().withMessage('Initial ABCDE must be an object')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  await createSession(req, res);
});

// Add answers to an existing session
router.post('/answer', [
  body('sessionId').isUUID().withMessage('Valid session ID is required'),
  body('answers').isObject().withMessage('Answers must be an object')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  await addAnswer(req, res);
});

// Complete a symptom session
router.post('/complete', [
  body('sessionId').isUUID().withMessage('Valid session ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  await completeSession(req, res);
});

// Get session transcript and results
router.get('/sessions/:id', async (req, res) => {
  await getSession(req, res);
});

// Submit feedback for a completed session
router.post('/feedback', [
  body('sessionId').isUUID().withMessage('Valid session ID is required'),
  body('outcome').isIn(['improved', 'worsened', 'diagnosed']).withMessage('Outcome must be improved, worsened, or diagnosed'),
  body('confirmedDiagnosis').optional().isString().withMessage('Confirmed diagnosis must be a string'),
  body('notes').optional().isString().withMessage('Notes must be a string')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  await submitFeedback(req, res);
});

module.exports = router;
