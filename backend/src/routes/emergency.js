const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Patient, EmergencyEvent, EmergencyContact, User } = require('../models');
const { authenticateToken, requirePatientOrDoctor } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requirePatientOrDoctor);

// Trigger emergency response
router.post('/trigger', [
  body('mode').isIn(['personal', 'bystander']),
  body('scenario').isIn([
    'unresponsive', 'chest_pain', 'severe_bleeding', 'seizure', 'stroke', 
    'choking', 'breathing_difficulty', 'accident', 'fall', 'poisoning', 'other'
  ]),
  body('eventType').optional().isIn([
    'medical_emergency', 'accident', 'fall', 'cardiac_arrest',
    'stroke', 'seizure', 'breathing_difficulty', 'severe_pain',
    'unconsciousness', 'bleeding', 'poisoning', 'other'
  ]),
  body('severity').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('description').optional().notEmpty(),
  body('location').optional().isObject(),
  body('coordinates').optional().isObject(),
  body('sessionId').optional().isUUID(),
  body('symptoms').optional().isArray(),
  body('vitalSigns').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    let patient;
    
    // If user is a patient, get their patient record
    if (req.user.role === 'patient') {
      patient = await Patient.findOne({
        where: { userId: req.user.id }
      });
    } else {
      // If user is a doctor, they can trigger emergency for a specific patient
      const { patientId } = req.body;
      if (!patientId) {
        return res.status(400).json({ 
          error: 'Patient ID required',
          message: 'Patient ID is required for doctors'
        });
      }
      patient = await Patient.findByPk(patientId);
    }

    if (!patient) {
      return res.status(404).json({ 
        error: 'Patient not found',
        message: 'Patient profile does not exist'
      });
    }

    // Map scenario to eventType if not provided
    const eventType = req.body.eventType || mapScenarioToEventType(req.body.scenario);
    const severity = req.body.severity || mapScenarioToSeverity(req.body.scenario);
    const description = req.body.description || `Emergency triggered: ${req.body.scenario}`;

    // Create emergency event
    const emergencyEvent = await EmergencyEvent.create({
      patientId: patient.id,
      mode: req.body.mode,
      scenario: req.body.scenario,
      eventType,
      severity,
      description,
      location: req.body.location || null,
      coordinates: req.body.coordinates || null,
      sessionId: req.body.sessionId || null,
      symptoms: req.body.symptoms || [],
      vitalSigns: req.body.vitalSigns || null,
      triggeredAt: new Date(),
      status: 'active'
    });

    // Update patient emergency status
    await patient.triggerEmergency(req.body.location || req.body.coordinates, description);

    // Get emergency contacts
    const emergencyContacts = await EmergencyContact.getActiveContacts(patient.id);

    // Mock emergency response (in real app, this would trigger actual emergency services)
    const emergencyResponse = {
      eventId: emergencyEvent.id,
      triggeredAt: emergencyEvent.triggeredAt,
      severity: emergencyEvent.severity,
      location: emergencyEvent.location || emergencyEvent.coordinates,
      contactsNotified: emergencyContacts.length,
      emergencyServicesCalled: emergencyEvent.severity === 'critical',
      estimatedResponseTime: emergencyEvent.severity === 'critical' ? '5-10 minutes' : '15-30 minutes'
    };

    res.status(201).json({
      message: 'Emergency response triggered successfully',
      emergencyEvent,
      emergencyResponse,
      contacts: emergencyContacts
    });
  } catch (error) {
    console.error('Emergency trigger error:', error);
    res.status(500).json({ 
      error: 'Emergency trigger failed',
      message: 'Unable to trigger emergency response'
    });
  }
});

// Helper functions
function mapScenarioToEventType(scenario) {
  const mapping = {
    'unresponsive': 'unconsciousness',
    'chest_pain': 'severe_pain',
    'severe_bleeding': 'bleeding',
    'seizure': 'seizure',
    'stroke': 'stroke',
    'choking': 'breathing_difficulty',
    'breathing_difficulty': 'breathing_difficulty',
    'accident': 'accident',
    'fall': 'fall',
    'poisoning': 'poisoning',
    'other': 'other'
  };
  return mapping[scenario] || 'medical_emergency';
}

function mapScenarioToSeverity(scenario) {
  const criticalScenarios = ['unresponsive', 'chest_pain', 'severe_bleeding', 'stroke', 'choking'];
  const highScenarios = ['seizure', 'breathing_difficulty', 'poisoning'];
  
  if (criticalScenarios.includes(scenario)) return 'critical';
  if (highScenarios.includes(scenario)) return 'high';
  return 'medium';
}

// Get emergency status
router.get('/status', async (req, res) => {
  try {
    let patient;
    
    if (req.user.role === 'patient') {
      patient = await Patient.findOne({
        where: { userId: req.user.id }
      });
    } else {
      const { patientId } = req.query;
      if (!patientId) {
        return res.status(400).json({ 
          error: 'Patient ID required',
          message: 'Patient ID is required for doctors'
        });
      }
      patient = await Patient.findByPk(patientId);
    }

    if (!patient) {
      return res.status(404).json({ 
        error: 'Patient not found',
        message: 'Patient profile does not exist'
      });
    }

    // Get active emergency events
    const activeEmergencies = await EmergencyEvent.getActiveEvents(patient.id);

    // Get emergency contacts
    const emergencyContacts = await EmergencyContact.getActiveContacts(patient.id);

    res.json({
      isEmergencyMode: patient.isEmergencyMode,
      emergencyLocation: patient.emergencyLocation,
      emergencyNotes: patient.emergencyNotes,
      activeEmergencies,
      emergencyContacts,
      lastUpdated: patient.updatedAt
    });
  } catch (error) {
    console.error('Emergency status fetch error:', error);
    res.status(500).json({ 
      error: 'Emergency status fetch failed',
      message: 'Unable to retrieve emergency status'
    });
  }
});

// Cancel emergency
router.post('/cancel', async (req, res) => {
  try {
    const { eventId, reason } = req.body;

    let patient;
    
    if (req.user.role === 'patient') {
      patient = await Patient.findOne({
        where: { userId: req.user.id }
      });
    } else {
      const { patientId } = req.body;
      if (!patientId) {
        return res.status(400).json({ 
          error: 'Patient ID required',
          message: 'Patient ID is required for doctors'
        });
      }
      patient = await Patient.findByPk(patientId);
    }

    if (!patient) {
      return res.status(404).json({ 
        error: 'Patient not found',
        message: 'Patient profile does not exist'
      });
    }

    // Cancel emergency event
    if (eventId) {
      const emergencyEvent = await EmergencyEvent.findOne({
        where: {
          id: eventId,
          patientId: patient.id
        }
      });

      if (emergencyEvent) {
        await emergencyEvent.cancel(reason);
      }
    }

    // Clear patient emergency status
    await patient.clearEmergency();

    res.json({
      message: 'Emergency cancelled successfully'
    });
  } catch (error) {
    console.error('Emergency cancellation error:', error);
    res.status(500).json({ 
      error: 'Emergency cancellation failed',
      message: 'Unable to cancel emergency'
    });
  }
});

// Get emergency history
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20, days = 30 } = req.query;
    const offset = (page - 1) * limit;

    let patient;
    
    if (req.user.role === 'patient') {
      patient = await Patient.findOne({
        where: { userId: req.user.id }
      });
    } else {
      const { patientId } = req.query;
      if (!patientId) {
        return res.status(400).json({ 
          error: 'Patient ID required',
          message: 'Patient ID is required for doctors'
        });
      }
      patient = await Patient.findByPk(patientId);
    }

    if (!patient) {
      return res.status(404).json({ 
        error: 'Patient not found',
        message: 'Patient profile does not exist'
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const emergencyEvents = await EmergencyEvent.findAndCountAll({
      where: {
        patientId: patient.id,
        triggeredAt: {
          [Op.gte]: startDate
        }
      },
      order: [['triggeredAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      emergencyEvents: emergencyEvents.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(emergencyEvents.count / limit),
        totalEvents: emergencyEvents.count,
        eventsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Emergency history fetch error:', error);
    res.status(500).json({ 
      error: 'Emergency history fetch failed',
      message: 'Unable to retrieve emergency history'
    });
  }
});

// Update emergency location
router.put('/location', [
  body('location').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    if (req.user.role !== 'patient') {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Only patients can update emergency location'
      });
    }

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({ 
        error: 'Patient not found',
        message: 'Patient profile does not exist'
      });
    }

    await patient.update({
      emergencyLocation: req.body.location
    });

    res.json({
      message: 'Emergency location updated successfully',
      location: req.body.location
    });
  } catch (error) {
    console.error('Emergency location update error:', error);
    res.status(500).json({ 
      error: 'Emergency location update failed',
      message: 'Unable to update emergency location'
    });
  }
});

module.exports = router; 