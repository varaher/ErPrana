const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Patient, EmergencyContact, HealthData, EmergencyEvent } = require('../models');
const { authenticateToken, requirePatient } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requirePatient);

// Get patient profile
router.get('/profile', async (req, res) => {
  try {
    const patient = await Patient.findOne({
      where: { userId: req.user.id },
      include: [
        {
          model: EmergencyContact,
          as: 'emergencyContacts',
          where: { isActive: true },
          required: false
        }
      ]
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
        message: 'Patient profile does not exist'
      });
    }

    res.json({
      patient: {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        phone: patient.phone,
        emergencyContacts: patient.emergencyContacts || [],
        isEmergencyMode: patient.isEmergencyMode,
        emergencyLocation: patient.emergencyLocation,
        emergencyNotes: patient.emergencyNotes,
        lastEmergencyTrigger: patient.lastEmergencyTrigger,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'Profile fetch failed',
      message: 'Unable to retrieve patient profile'
    });
  }
});

// Update patient profile
router.put('/profile', [
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().notEmpty().trim(),
  body('phone').optional().isMobilePhone(),
  body('dateOfBirth').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, phone, dateOfBirth } = req.body;
    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
        message: 'Patient profile does not exist'
      });
    }

    await patient.update(updateData);

    res.json({
      message: 'Profile updated successfully',
      updates: updateData
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'Profile update failed',
      message: 'Unable to update patient profile'
    });
  }
});

// Get health tracking data
router.get('/health-data', async (req, res) => {
  try {
    const { page = 1, limit = 50, dataType, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
        message: 'Patient profile does not exist'
      });
    }

    const whereClause = { patientId: patient.id };
    
    if (dataType) {
      whereClause.dataType = dataType;
    }
    
          if (startDate && endDate) {
        whereClause.timestamp = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

    const healthData = await HealthData.findAndCountAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      healthData: healthData.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(healthData.count / limit),
        totalRecords: healthData.count,
        recordsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Health data fetch error:', error);
    res.status(500).json({
      error: 'Health data fetch failed',
      message: 'Unable to retrieve health data'
    });
  }
});

// Add health tracking data
router.post('/health-data', [
  body('dataType').isIn(['heart_rate', 'blood_pressure', 'temperature', 'oxygen_saturation', 'steps', 'sleep', 'weight', 'glucose', 'other']),
  body('value').notEmpty(),
  body('unit').optional().notEmpty(),
  body('timestamp').optional().isISO8601(),
  body('source').optional().isIn(['manual', 'device', 'app', 'other']),
  body('deviceId').optional().notEmpty(),
  body('notes').optional().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { dataType, value, unit, timestamp, source, deviceId, notes } = req.body;

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
        message: 'Patient profile does not exist'
      });
    }

    const healthData = await HealthData.create({
      patientId: patient.id,
      dataType,
      value,
      unit: unit || null,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      source: source || 'manual',
      deviceId: deviceId || null,
      notes: notes || null
    });

    res.status(201).json({
      message: 'Health data added successfully',
      healthData: {
        id: healthData.id,
        dataType: healthData.dataType,
        value: healthData.value,
        unit: healthData.unit,
        timestamp: healthData.timestamp,
        source: healthData.source,
        createdAt: healthData.createdAt
      }
    });
  } catch (error) {
    console.error('Health data creation error:', error);
    res.status(500).json({
      error: 'Health data creation failed',
      message: 'Unable to add health data'
    });
  }
});

// Get emergency contacts
router.get('/emergency-contacts', async (req, res) => {
  try {
    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
        message: 'Patient profile does not exist'
      });
    }

    const emergencyContacts = await EmergencyContact.findAll({
      where: { patientId: patient.id },
      order: [['priority', 'ASC'], ['name', 'ASC']]
    });

    res.json({
      emergencyContacts
    });
  } catch (error) {
    console.error('Emergency contacts fetch error:', error);
    res.status(500).json({
      error: 'Emergency contacts fetch failed',
      message: 'Unable to retrieve emergency contacts'
    });
  }
});

// Add emergency contact
router.post('/emergency-contacts', [
  body('name').notEmpty().trim(),
  body('relationship').notEmpty().trim(),
  body('phoneNumber').isMobilePhone(),
  body('email').optional().isEmail(),
  body('address').optional().notEmpty(),
  body('priority').optional().isInt({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, relationship, phoneNumber, email, address, priority } = req.body;

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
        message: 'Patient profile does not exist'
      });
    }

    const emergencyContact = await EmergencyContact.create({
      patientId: patient.id,
      name,
      relationship,
      phoneNumber,
      email: email || null,
      address: address || null,
      priority: priority || 3,
      isActive: true
    });

    res.status(201).json({
      message: 'Emergency contact added successfully',
      emergencyContact
    });
  } catch (error) {
    console.error('Emergency contact creation error:', error);
    res.status(500).json({
      error: 'Emergency contact creation failed',
      message: 'Unable to add emergency contact'
    });
  }
});

// Update emergency contact
router.put('/emergency-contacts/:id', [
  body('name').optional().notEmpty().trim(),
  body('relationship').optional().notEmpty().trim(),
  body('phoneNumber').optional().isMobilePhone(),
  body('email').optional().isEmail(),
  body('address').optional().notEmpty(),
  body('priority').optional().isInt({ min: 1, max: 5 }),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
        message: 'Patient profile does not exist'
      });
    }

    const emergencyContact = await EmergencyContact.findOne({
      where: { id, patientId: patient.id }
    });

    if (!emergencyContact) {
      return res.status(404).json({
        error: 'Emergency contact not found',
        message: 'Emergency contact does not exist'
      });
    }

    await emergencyContact.update(updateData);

    res.json({
      message: 'Emergency contact updated successfully',
      emergencyContact
    });
  } catch (error) {
    console.error('Emergency contact update error:', error);
    res.status(500).json({
      error: 'Emergency contact update failed',
      message: 'Unable to update emergency contact'
    });
  }
});

// Delete emergency contact
router.delete('/emergency-contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
        message: 'Patient profile does not exist'
      });
    }

    const emergencyContact = await EmergencyContact.findOne({
      where: { id, patientId: patient.id }
    });

    if (!emergencyContact) {
      return res.status(404).json({
        error: 'Emergency contact not found',
        message: 'Emergency contact does not exist'
      });
    }

    await emergencyContact.destroy();

    res.json({
      message: 'Emergency contact deleted successfully'
    });
  } catch (error) {
    console.error('Emergency contact deletion error:', error);
    res.status(500).json({
      error: 'Emergency contact deletion failed',
      message: 'Unable to delete emergency contact'
    });
  }
});

// Get emergency history
router.get('/emergency-history', async (req, res) => {
  try {
    const { page = 1, limit = 20, days = 30 } = req.query;
    const offset = (page - 1) * limit;

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
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

module.exports = router; 