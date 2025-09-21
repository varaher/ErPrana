const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { Patient, Doctor, MedicalHistoryImage, EmergencyEvent } = require('../models');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/medical-images');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `medical-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Upload medical image
router.post('/upload', [
  authenticateToken,
  upload.single('image'),
  body('imageType').isIn([
    'wound', 'injury', 'rash', 'swelling', 'deformity',
    'medical_device', 'prescription', 'lab_result',
    'imaging_result', 'general', 'emergency', 'follow_up'
  ]),
  body('origin').isIn(['personal', 'bystander']),
  body('scenario').optional().isString().trim(),
  body('description').optional().isString().trim(),
  body('tags').optional().isArray(),
  body('isUrgent').optional().isBoolean(),
  body('isConfidential').optional().isBoolean(),
  body('relatedEmergencyId').optional().isUUID(),
  body('relatedSessionId').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
        message: 'Please select an image to upload'
      });
    }

    // Get patient profile
    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
        message: 'Patient profile does not exist'
      });
    }

    // Get file info
    const fileStats = await fs.stat(req.file.path);
    const dimensions = req.body.dimensions ? JSON.parse(req.body.dimensions) : null;

    // Create image record
    const imageData = {
      patientId: patient.id,
      imageType: req.body.imageType,
      origin: req.body.origin,
      scenario: req.body.scenario,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: fileStats.size,
      mimeType: req.file.mimetype,
      dimensions,
      description: req.body.description,
      tags: req.body.tags || [],
      isUrgent: req.body.isUrgent || false,
      isConfidential: req.body.isConfidential || false,
      relatedEmergencyId: req.body.relatedEmergencyId,
      relatedSessionId: req.body.relatedSessionId,
      metadata: {
        notes: req.body.notes,
        location: req.body.location,
        capturedAt: req.body.capturedAt || new Date().toISOString()
      }
    };

    const medicalImage = await MedicalHistoryImage.create(imageData);

    // If related to emergency, mark as urgent
    if (req.body.relatedEmergencyId) {
      await medicalImage.markAsUrgent();
    }

    // Auto-share with assigned doctor if available
    if (patient.assignedDoctorId) {
      await medicalImage.shareWithDoctor(patient.assignedDoctorId);
    }

    res.status(201).json({
      message: 'Medical image uploaded successfully',
      image: {
        id: medicalImage.id,
        imageType: medicalImage.imageType,
        origin: medicalImage.origin,
        scenario: medicalImage.scenario,
        description: medicalImage.description,
        isUrgent: medicalImage.isUrgent,
        isShared: medicalImage.isShared,
        capturedAt: medicalImage.capturedAt,
        uploadedAt: medicalImage.uploadedAt
      }
    });
  } catch (error) {
    console.error('Image upload error:', error);
    
    // Clean up uploaded file if database operation fails
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to clean up uploaded file:', unlinkError);
      }
    }

    res.status(500).json({
      error: 'Image upload failed',
      message: 'Unable to upload medical image'
    });
  }
});

// Get patient's medical images
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, imageType, origin, scenario, tags, urgent, shared } = req.query;
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

    // Build where clause
    const whereClause = {
      patientId: patient.id,
      status: 'active'
    };

    if (imageType) whereClause.imageType = imageType;
    if (origin) whereClause.origin = origin;
    if (scenario) whereClause.scenario = scenario;
    if (urgent === 'true') whereClause.isUrgent = true;
    if (shared === 'true') whereClause.isShared = true;

    // Handle tags search
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      whereClause.tags = {
        [require('sequelize').Op.overlap]: tagArray
      };
    }

    const images = await MedicalHistoryImage.findAndCountAll({
      where: whereClause,
      order: [['capturedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: ['user'],
          attributes: ['id', 'specialization', 'licenseNumber']
        }
      ]
    });

    res.json({
      images: images.rows.map(img => ({
        id: img.id,
        imageType: img.imageType,
        origin: img.origin,
        scenario: img.scenario,
        description: img.description,
        isUrgent: img.isUrgent,
        isShared: img.isShared,
        tags: img.tags,
        capturedAt: img.capturedAt,
        uploadedAt: img.uploadedAt,
        lastViewedAt: img.lastViewedAt,
        viewCount: img.viewCount,
        doctor: img.doctor ? {
          id: img.doctor.id,
          specialization: img.doctor.specialization,
          name: `${img.doctor.user.firstName} ${img.doctor.user.lastName}`
        } : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: images.count,
        pages: Math.ceil(images.count / limit)
      }
    });
  } catch (error) {
    console.error('Image retrieval error:', error);
    res.status(500).json({
      error: 'Image retrieval failed',
      message: 'Unable to retrieve medical images'
    });
  }
});

// Get specific medical image
router.get('/:id', authenticateToken, async (req, res) => {
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

    const image = await MedicalHistoryImage.findOne({
      where: {
        id: req.params.id,
        patientId: patient.id,
        status: 'active'
      },
      include: [
        {
          model: Doctor,
          as: 'doctor',
          include: ['user'],
          attributes: ['id', 'specialization', 'licenseNumber']
        }
      ]
    });

    if (!image) {
      return res.status(404).json({
        error: 'Image not found',
        message: 'Medical image does not exist or access denied'
      });
    }

    // Mark as viewed
    await image.markAsViewed();

    res.json({
      image: {
        id: image.id,
        imageType: image.imageType,
        origin: image.origin,
        scenario: image.scenario,
        description: image.description,
        isUrgent: image.isUrgent,
        isShared: image.isShared,
        tags: image.tags,
        clinicalNotes: image.clinicalNotes,
        capturedAt: image.capturedAt,
        uploadedAt: image.uploadedAt,
        lastViewedAt: image.lastViewedAt,
        viewCount: image.viewCount,
        metadata: image.metadata,
        doctor: image.doctor ? {
          id: image.doctor.id,
          specialization: image.doctor.specialization,
          name: `${image.doctor.user.firstName} ${image.doctor.user.lastName}`
        } : null
      }
    });
  } catch (error) {
    console.error('Image retrieval error:', error);
    res.status(500).json({
      error: 'Image retrieval failed',
      message: 'Unable to retrieve medical image'
    });
  }
});

// Update image metadata
router.put('/:id', [
  authenticateToken,
  body('description').optional().isString().trim(),
  body('tags').optional().isArray(),
  body('isUrgent').optional().isBoolean(),
  body('isConfidential').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
        message: 'Patient profile does not exist'
      });
    }

    const image = await MedicalHistoryImage.findOne({
      where: {
        id: req.params.id,
        patientId: patient.id,
        status: 'active'
      }
    });

    if (!image) {
      return res.status(404).json({
        error: 'Image not found',
        message: 'Medical image does not exist or access denied'
      });
    }

    // Update fields
    if (req.body.description !== undefined) image.description = req.body.description;
    if (req.body.tags !== undefined) image.tags = req.body.tags;
    if (req.body.isUrgent !== undefined) image.isUrgent = req.body.isUrgent;
    if (req.body.isConfidential !== undefined) image.isConfidential = req.body.isConfidential;

    await image.save();

    res.json({
      message: 'Image updated successfully',
      image: {
        id: image.id,
        description: image.description,
        tags: image.tags,
        isUrgent: image.isUrgent,
        isConfidential: image.isConfidential,
        updatedAt: image.updatedAt
      }
    });
  } catch (error) {
    console.error('Image update error:', error);
    res.status(500).json({
      error: 'Image update failed',
      message: 'Unable to update medical image'
    });
  }
});

// Share image with doctor
router.post('/:id/share', [
  authenticateToken,
  body('doctorId').isUUID(),
  body('autoShare').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
        message: 'Patient profile does not exist'
      });
    }

    const image = await MedicalHistoryImage.findOne({
      where: {
        id: req.params.id,
        patientId: patient.id,
        status: 'active'
      }
    });

    if (!image) {
      return res.status(404).json({
        error: 'Image not found',
        message: 'Medical image does not exist or access denied'
      });
    }

    // Verify doctor exists and is assigned to patient
    const doctor = await Doctor.findOne({
      where: {
        id: req.body.doctorId,
        id: patient.assignedDoctorId
      }
    });

    if (!doctor) {
      return res.status(400).json({
        error: 'Invalid doctor',
        message: 'Doctor is not assigned to this patient'
      });
    }

    // Share image
    await image.shareWithDoctor(req.body.doctorId);

    // If autoShare is enabled, update patient settings
    if (req.body.autoShare) {
      // Update patient settings to auto-share future images
      // This would be implemented in patient settings
    }

    res.json({
      message: 'Image shared successfully',
      image: {
        id: image.id,
        isShared: image.isShared,
        doctorId: image.doctorId
      }
    });
  } catch (error) {
    console.error('Image sharing error:', error);
    res.status(500).json({
      error: 'Image sharing failed',
      message: 'Unable to share medical image'
    });
  }
});

// Archive image
router.delete('/:id', authenticateToken, async (req, res) => {
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

    const image = await MedicalHistoryImage.findOne({
      where: {
        id: req.params.id,
        patientId: patient.id,
        status: 'active'
      }
    });

    if (!image) {
      return res.status(404).json({
        error: 'Image not found',
        message: 'Medical image does not exist or access denied'
      });
    }

    // Archive image instead of deleting
    await image.archive();

    res.json({
      message: 'Image archived successfully'
    });
  } catch (error) {
    console.error('Image archiving error:', error);
    res.status(500).json({
      error: 'Image archiving failed',
      message: 'Unable to archive medical image'
    });
  }
});

// Get image file (for viewing)
router.get('/:id/file', authenticateToken, async (req, res) => {
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

    const image = await MedicalHistoryImage.findOne({
      where: {
        id: req.params.id,
        patientId: patient.id,
        status: 'active'
      }
    });

    if (!image) {
      return res.status(404).json({
        error: 'Image not found',
        message: 'Medical image does not exist or access denied'
      });
    }

    // Check if file exists
    try {
      await fs.access(image.filePath);
    } catch (error) {
      return res.status(404).json({
        error: 'File not found',
        message: 'Image file is missing from server'
      });
    }

    // Mark as viewed
    await image.markAsViewed();

    // Send file
    res.sendFile(image.filePath);
  } catch (error) {
    console.error('Image file retrieval error:', error);
    res.status(500).json({
      error: 'Image file retrieval failed',
      message: 'Unable to retrieve image file'
    });
  }
});

// Get shared images for doctors (patients can view images shared with their doctors)
router.get('/shared', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, imageType, origin, scenario, urgent, patientId } = req.query;
    const offset = (page - 1) * limit;

    // Check if user is a doctor
    const doctor = await Doctor.findOne({
      where: { userId: req.user.id }
    });

    if (!doctor) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only doctors can view shared images'
      });
    }

    // Build where clause for shared images
    const whereClause = {
      doctorId: doctor.id,
      isShared: true,
      status: 'active'
    };

    if (imageType) whereClause.imageType = imageType;
    if (origin) whereClause.origin = origin;
    if (scenario) whereClause.scenario = scenario;
    if (urgent === 'true') whereClause.isUrgent = true;
    if (patientId) whereClause.patientId = patientId;

    const sharedImages = await MedicalHistoryImage.findAndCountAll({
      where: whereClause,
      order: [['capturedAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Patient,
          as: 'patient',
          include: ['user'],
          attributes: ['id', 'dateOfBirth', 'gender', 'bloodType']
        }
      ]
    });

    res.json({
      sharedImages: sharedImages.rows.map(img => ({
        id: img.id,
        imageType: img.imageType,
        origin: img.origin,
        scenario: img.scenario,
        description: img.description,
        isUrgent: img.isUrgent,
        tags: img.tags,
        capturedAt: img.capturedAt,
        uploadedAt: img.uploadedAt,
        lastViewedAt: img.lastViewedAt,
        viewCount: img.viewCount,
        patient: img.patient ? {
          id: img.patient.id,
          age: new Date().getFullYear() - new Date(img.patient.dateOfBirth).getFullYear(),
          gender: img.patient.gender,
          bloodType: img.patient.bloodType,
          name: `${img.patient.user.firstName} ${img.patient.user.lastName}`
        } : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: sharedImages.count,
        pages: Math.ceil(sharedImages.count / limit)
      }
    });
  } catch (error) {
    console.error('Shared images retrieval error:', error);
    res.status(500).json({
      error: 'Shared images retrieval failed',
      message: 'Unable to retrieve shared medical images'
    });
  }
});

module.exports = router;
