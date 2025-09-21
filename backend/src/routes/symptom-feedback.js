const express = require('express');
const router = express.Router();

// Store feedback for machine learning improvement
let feedbackDatabase = []; // In production, use proper database

/**
 * POST /api/symptom-feedback
 * Collect user feedback on symptom diagnosis accuracy
 */
router.post('/', async (req, res) => {
  try {
    const {
      sessionId,
      symptoms,
      diagnosis,
      feedback,
      additionalFeedback,
      timestamp
    } = req.body;

    // Validate required fields
    if (!symptoms || !diagnosis || !feedback) {
      return res.status(400).json({
        error: 'Missing required fields: symptoms, diagnosis, feedback'
      });
    }

    // Create feedback record
    const feedbackRecord = {
      id: Date.now() + Math.random(),
      sessionId: sessionId || 'anonymous',
      symptoms: Array.isArray(symptoms) ? symptoms : [symptoms],
      diagnosis: Array.isArray(diagnosis) ? diagnosis : [diagnosis],
      feedback: feedback, // 'positive' or 'negative'
      additionalFeedback: additionalFeedback || '',
      timestamp: timestamp || new Date(),
      processed: false
    };

    // Store feedback (in production, save to database)
    feedbackDatabase.push(feedbackRecord);

    // Log for development
    console.log('🔄 Feedback received:', {
      feedback: feedback,
      symptoms: symptoms.length || 1,
      sessionId: sessionId || 'anonymous'
    });

    // Return success
    res.status(200).json({
      message: 'Feedback received successfully',
      feedbackId: feedbackRecord.id,
      status: 'stored'
    });

  } catch (error) {
    console.error('Error saving symptom feedback:', error);
    res.status(500).json({
      error: 'Failed to save feedback',
      message: error.message
    });
  }
});

/**
 * GET /api/symptom-feedback/analytics
 * Get feedback analytics for improvement
 */
router.get('/analytics', async (req, res) => {
  try {
    const totalFeedback = feedbackDatabase.length;
    const positiveFeedback = feedbackDatabase.filter(f => f.feedback === 'positive').length;
    const negativeFeedback = feedbackDatabase.filter(f => f.feedback === 'negative').length;
    
    const accuracy = totalFeedback > 0 ? (positiveFeedback / totalFeedback * 100).toFixed(1) : 0;

    // Get common symptoms in negative feedback
    const negativeSymptoms = feedbackDatabase
      .filter(f => f.feedback === 'negative')
      .flatMap(f => f.symptoms)
      .reduce((acc, symptom) => {
        acc[symptom] = (acc[symptom] || 0) + 1;
        return acc;
      }, {});

    res.json({
      totalFeedback,
      positiveFeedback,
      negativeFeedback,
      accuracyRate: `${accuracy}%`,
      commonIssues: negativeSymptoms,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Error getting feedback analytics:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/symptom-feedback/recent
 * Get recent feedback for review
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const recentFeedback = feedbackDatabase
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit)
      .map(f => ({
        id: f.id,
        feedback: f.feedback,
        symptoms: f.symptoms,
        additionalFeedback: f.additionalFeedback,
        timestamp: f.timestamp
      }));

    res.json({
      feedback: recentFeedback,
      total: feedbackDatabase.length
    });

  } catch (error) {
    console.error('Error getting recent feedback:', error);
    res.status(500).json({
      error: 'Failed to get recent feedback',
      message: error.message
    });
  }
});

module.exports = router;