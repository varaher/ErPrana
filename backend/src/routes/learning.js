const express = require('express');
const { authenticateToken, requireDoctor } = require('../middleware/auth');
const learningService = require('../services/learningService');
const cronService = require('../services/cronService');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireDoctor);

/**
 * Get learning statistics for a specific diagnosis
 * GET /api/learning/stats/:diagnosis
 */
router.get('/stats/:diagnosis', async (req, res) => {
  try {
    const { diagnosis } = req.params;
    
    if (!diagnosis) {
      return res.status(400).json({
        error: 'Diagnosis parameter is required'
      });
    }

    const stats = await learningService.getLearningStats(diagnosis);
    
    if (!stats) {
      return res.status(404).json({
        error: 'No learning statistics found for this diagnosis'
      });
    }

    res.json({
      message: 'Learning statistics retrieved successfully',
      diagnosis,
      stats
    });
  } catch (error) {
    console.error('Error getting learning stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve learning statistics'
    });
  }
});

/**
 * Get current summary statistics
 * GET /api/learning/summary
 */
router.get('/summary', async (req, res) => {
  try {
    const stats = await cronService.getCurrentSummaryStats();
    
    res.json({
      message: 'Summary statistics retrieved successfully',
      stats
    });
  } catch (error) {
    console.error('Error getting summary stats:', error);
    res.status(500).json({
      error: 'Failed to retrieve summary statistics'
    });
  }
});

/**
 * Get learning analytics for all diagnoses
 * GET /api/learning/analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));

    // This would typically come from a cached analytics table
    // For now, we'll compute it on-demand
    const analytics = await cronService.computeDailySummaryStats();
    
    res.json({
      message: 'Learning analytics retrieved successfully',
      period: `${days} days`,
      analytics
    });
  } catch (error) {
    console.error('Error getting learning analytics:', error);
    res.status(500).json({
      error: 'Failed to retrieve learning analytics'
    });
  }
});

/**
 * GET /api/learning/calibration/:topic
 * Get calibration statistics for a specific topic
 */
router.get('/calibration/:topic', async (req, res) => {
  try {
    const { topic } = req.params;
    const stats = await learningService.getCalibrationStats(topic);
    
    if (stats) {
      res.json({
        success: true,
        data: stats
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'No calibration data found for this topic'
      });
    }
  } catch (error) {
    console.error('Error getting calibration stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/learning/calibration
 * Get all calibration data
 */
router.get('/calibration', async (req, res) => {
  try {
    const data = await learningService.getAllCalibrationData();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error getting all calibration data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * GET /api/learning/calibration/coverage
 * Get calibration coverage statistics
 */
router.get('/calibration/coverage', async (req, res) => {
  try {
    const coverage = await learningService.getCalibrationCoverage();
    res.json({
      success: true,
      data: coverage
    });
  } catch (error) {
    console.error('Error getting calibration coverage:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * POST /api/learning/calibration/update
 * Update calibration modifier based on feedback
 */
router.post('/calibration/update', async (req, res) => {
  try {
    const {
      chiefComplaint,
      conditionCode,
      ageGroup,
      sourcePack,
      actualOutcome,
      predictedConfidence
    } = req.body;

    // Validate required fields
    if (!chiefComplaint || !conditionCode || !ageGroup || !sourcePack) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: chiefComplaint, conditionCode, ageGroup, sourcePack'
      });
    }

    if (typeof actualOutcome !== 'number' || typeof predictedConfidence !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'actualOutcome and predictedConfidence must be numbers'
      });
    }

    const calibration = await learningService.updateCalibrationModifier(
      chiefComplaint,
      conditionCode,
      ageGroup,
      sourcePack,
      actualOutcome,
      predictedConfidence
    );

    res.json({
      success: true,
      data: calibration
    });
  } catch (error) {
    console.error('Error updating calibration:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * DELETE /api/learning/calibration/reset
 * Reset calibration for a specific case
 */
router.delete('/calibration/reset', async (req, res) => {
  try {
    const {
      chiefComplaint,
      conditionCode,
      ageGroup,
      sourcePack
    } = req.body;

    // Validate required fields
    if (!chiefComplaint || !conditionCode || !ageGroup || !sourcePack) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: chiefComplaint, conditionCode, ageGroup, sourcePack'
      });
    }

    const result = await learningService.resetCalibration(
      chiefComplaint,
      conditionCode,
      ageGroup,
      sourcePack
    );

    res.json(result);
  } catch (error) {
    console.error('Error resetting calibration:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
