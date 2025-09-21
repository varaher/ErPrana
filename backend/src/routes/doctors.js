const express = require('express');
const { body, validationResult } = require('express-validator');
const { Doctor, User, Patient, ClinicalNote, HealthData } = require('../models');
const { authenticateToken, requireDoctor } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireDoctor);

// Get doctor profile
router.get('/profile', async (req, res) => {
  try {
    const doctor = await Doctor.findOne({
      where: { userId: req.user.id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email', 'phone', 'profileImage']
        }
      ]
    });

    if (!doctor) {
      return res.status(404).json({ 
        error: 'Doctor profile not found',
        message: 'Doctor profile does not exist'
      });
    }

    res.json({
      doctor
    });
  } catch (error) {
    console.error('Doctor profile fetch error:', error);
    res.status(500).json({ 
      error: 'Profile fetch failed',
      message: 'Unable to retrieve doctor profile'
    });
  }
});

// Update doctor profile
router.put('/profile', [
  body('specialization').optional().isString(),
  body('subSpecialization').optional().isString(),
  body('yearsOfExperience').optional().isInt({ min: 0, max: 50 }),
  body('education').optional().isArray(),
  body('certifications').optional().isArray(),
  body('hospitalAffiliations').optional().isArray(),
  body('clinicAddress').optional().isString(),
  body('consultationFee').optional().isFloat({ min: 0 }),
  body('availability').optional().isObject(),
  body('languages').optional().isArray(),
  body('emergencyResponse').optional().isBoolean(),
  body('maxPatients').optional().isInt({ min: 1, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const doctor = await Doctor.findOne({
      where: { userId: req.user.id }
    });

    if (!doctor) {
      return res.status(404).json({ 
        error: 'Doctor profile not found',
        message: 'Doctor profile does not exist'
      });
    }

    const allowedFields = [
      'specialization', 'subSpecialization', 'yearsOfExperience',
      'education', 'certifications', 'hospitalAffiliations',
      'clinicAddress', 'consultationFee', 'availability',
      'languages', 'emergencyResponse', 'maxPatients'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    await doctor.update(updateData);

    res.json({
      message: 'Profile updated successfully',
      doctor: doctor.toJSON()
    });
  } catch (error) {
    console.error('Doctor profile update error:', error);
    res.status(500).json({ 
      error: 'Profile update failed',
      message: 'Unable to update doctor profile'
    });
  }
});

// Get assigned patients
router.get('/patients', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const doctor = await Doctor.findOne({
      where: { userId: req.user.id }
    });

    if (!doctor) {
      return res.status(404).json({ 
        error: 'Doctor profile not found',
        message: 'Doctor profile does not exist'
      });
    }

    const whereClause = { assignedDoctorId: doctor.id };
    
    if (search) {
      whereClause['$user.firstName$'] = {
        [require('sequelize').Op.iLike]: `%${search}%`
      };
    }

    const patients = await Patient.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email', 'phone', 'profileImage']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      patients: patients.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(patients.count / limit),
        totalPatients: patients.count,
        patientsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Patients fetch error:', error);
    res.status(500).json({ 
      error: 'Patients fetch failed',
      message: 'Unable to retrieve assigned patients'
    });
  }
});

// Get specific patient data
router.get('/patients/:id', async (req, res) => {
  try {
    const doctor = await Doctor.findOne({
      where: { userId: req.user.id }
    });

    if (!doctor) {
      return res.status(404).json({ 
        error: 'Doctor profile not found',
        message: 'Doctor profile does not exist'
      });
    }

    const patient = await Patient.findOne({
      where: {
        id: req.params.id,
        assignedDoctorId: doctor.id
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender', 'profileImage']
        }
      ]
    });

    if (!patient) {
      return res.status(404).json({ 
        error: 'Patient not found',
        message: 'Patient not assigned to this doctor'
      });
    }

    // Get recent health data
    const recentHealthData = await HealthData.findAll({
      where: { patientId: patient.id },
      order: [['timestamp', 'DESC']],
      limit: 10
    });

    // Get recent clinical notes
    const recentNotes = await ClinicalNote.findAll({
      where: { patientId: patient.id },
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['firstName', 'lastName']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.json({
      patient: {
        ...patient.toJSON(),
        bmi: patient.calculateBMI()
      },
      recentHealthData,
      recentNotes
    });
  } catch (error) {
    console.error('Patient data fetch error:', error);
    res.status(500).json({ 
      error: 'Patient data fetch failed',
      message: 'Unable to retrieve patient data'
    });
  }
});

// Add clinical note
router.post('/patients/:id/notes', [
  body('noteType').isIn([
    'consultation', 'diagnosis', 'treatment', 'prescription',
    'follow_up', 'emergency', 'lab_result', 'imaging', 'surgery', 'general'
  ]),
  body('title').notEmpty().trim(),
  body('content').notEmpty(),
  body('symptoms').optional().isArray(),
  body('diagnosis').optional().isArray(),
  body('medications').optional().isArray(),
  body('vitalSigns').optional().isObject(),
  body('labResults').optional().isObject(),
  body('imagingResults').optional().isObject(),
  body('followUpDate').optional().isISO8601(),
  body('isUrgent').optional().isBoolean(),
  body('isConfidential').optional().isBoolean(),
  body('tags').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const doctor = await Doctor.findOne({
      where: { userId: req.user.id }
    });

    if (!doctor) {
      return res.status(404).json({ 
        error: 'Doctor profile not found',
        message: 'Doctor profile does not exist'
      });
    }

    const patient = await Patient.findOne({
      where: {
        id: req.params.id,
        assignedDoctorId: doctor.id
      }
    });

    if (!patient) {
      return res.status(404).json({ 
        error: 'Patient not found',
        message: 'Patient not assigned to this doctor'
      });
    }

    const note = await ClinicalNote.create({
      patientId: patient.id,
      doctorId: doctor.id,
      noteType: req.body.noteType,
      title: req.body.title,
      content: req.body.content,
      symptoms: req.body.symptoms,
      diagnosis: req.body.diagnosis,
      medications: req.body.medications,
      vitalSigns: req.body.vitalSigns,
      labResults: req.body.labResults,
      imagingResults: req.body.imagingResults,
      followUpDate: req.body.followUpDate ? new Date(req.body.followUpDate) : null,
      isUrgent: req.body.isUrgent || false,
      isConfidential: req.body.isConfidential || false,
      tags: req.body.tags || []
    });

    res.status(201).json({
      message: 'Clinical note added successfully',
      note
    });
  } catch (error) {
    console.error('Clinical note creation error:', error);
    res.status(500).json({ 
      error: 'Clinical note creation failed',
      message: 'Unable to add clinical note'
    });
  }
});

// Get patient's clinical notes
router.get('/patients/:id/notes', async (req, res) => {
  try {
    const { noteType, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const doctor = await Doctor.findOne({
      where: { userId: req.user.id }
    });

    if (!doctor) {
      return res.status(404).json({ 
        error: 'Doctor profile not found',
        message: 'Doctor profile does not exist'
      });
    }

    const patient = await Patient.findOne({
      where: {
        id: req.params.id,
        assignedDoctorId: doctor.id
      }
    });

    if (!patient) {
      return res.status(404).json({ 
        error: 'Patient not found',
        message: 'Patient not assigned to this doctor'
      });
    }

    const whereClause = { patientId: patient.id };
    if (noteType) {
      whereClause.noteType = noteType;
    }

    const notes = await ClinicalNote.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['firstName', 'lastName']
            }
          ]
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      notes: notes.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(notes.count / limit),
        totalNotes: notes.count,
        notesPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Clinical notes fetch error:', error);
    res.status(500).json({ 
      error: 'Clinical notes fetch failed',
      message: 'Unable to retrieve clinical notes'
    });
  }
});

// EMR sync endpoint
router.get('/emr-sync', async (req, res) => {
  try {
    const doctor = await Doctor.findOne({
      where: { userId: req.user.id }
    });

    if (!doctor) {
      return res.status(404).json({ 
        error: 'Doctor profile not found',
        message: 'Doctor profile does not exist'
      });
    }

    // Mock EMR sync functionality
    // In a real implementation, this would connect to external EMR systems
    const syncStatus = {
      lastSync: new Date(),
      status: 'success',
      syncedPatients: 0,
      syncedNotes: 0,
      errors: []
    };

    res.json({
      message: 'EMR sync completed',
      syncStatus
    });
  } catch (error) {
    console.error('EMR sync error:', error);
    res.status(500).json({ 
      error: 'EMR sync failed',
      message: 'Unable to sync with EMR system'
    });
  }
});

module.exports = router; 