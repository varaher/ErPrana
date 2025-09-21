const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op, fn, col } = require('sequelize');
const { HealthData, Patient } = require('../models');
const { authenticateToken, requirePatient } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requirePatient);

// Get health data summary
router.get('/summary', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
        message: 'Patient profile does not exist'
      });
    }

          // Get latest readings for each data type
      const latestReadings = await HealthData.findAll({
        where: {
          patientId: patient.id,
          timestamp: {
            [Op.gte]: startDate
          }
        },
      order: [['timestamp', 'DESC']],
      group: ['dataType']
    });

    // Get trends for key metrics
    const heartRateData = await HealthData.findAll({
      where: {
        patientId: patient.id,
        dataType: 'heart_rate',
        timestamp: {
          [Op.gte]: startDate
        }
      },
      order: [['timestamp', 'ASC']],
      attributes: ['value', 'timestamp']
    });

    const bloodPressureData = await HealthData.findAll({
      where: {
        patientId: patient.id,
        dataType: 'blood_pressure',
        timestamp: {
          [Op.gte]: startDate
        }
      },
      order: [['timestamp', 'ASC']],
      attributes: ['value', 'timestamp']
    });

    const temperatureData = await HealthData.findAll({
      where: {
        patientId: patient.id,
        dataType: 'temperature',
        timestamp: {
          [Op.gte]: startDate
        }
      },
      order: [['timestamp', 'ASC']],
      attributes: ['value', 'timestamp']
    });

    const oxygenData = await HealthData.findAll({
      where: {
        patientId: patient.id,
        dataType: 'oxygen_saturation',
        timestamp: {
          [Op.gte]: startDate
        }
      },
      order: [['timestamp', 'ASC']],
      attributes: ['value', 'timestamp']
    });

    res.json({
      summary: {
        period: `${days} days`,
        latestReadings,
        trends: {
          heartRate: heartRateData,
          bloodPressure: bloodPressureData,
          temperature: temperatureData,
          oxygenSaturation: oxygenData
        }
      }
    });
  } catch (error) {
    console.error('Health data summary fetch error:', error);
    res.status(500).json({
      error: 'Health data summary fetch failed',
      message: 'Unable to retrieve health data summary'
    });
  }
});

// Get health data by type
router.get('/:dataType', async (req, res) => {
  try {
    const { dataType } = req.params;
    const { page = 1, limit = 100, startDate, endDate } = req.query;
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

    const whereClause = {
      patientId: patient.id,
      dataType
    };

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
      dataType,
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

// Add health data
router.post('/', [
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

// Update health data
router.put('/:id', [
  body('value').optional().notEmpty(),
  body('unit').optional().notEmpty(),
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

    const { id } = req.params;
    const { value, unit, notes } = req.body;

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
        message: 'Patient profile does not exist'
      });
    }

    const healthData = await HealthData.findOne({
      where: { id, patientId: patient.id }
    });

    if (!healthData) {
      return res.status(404).json({
        error: 'Health data not found',
        message: 'Health data record does not exist'
      });
    }

    const updateData = {};
    if (value) updateData.value = value;
    if (unit) updateData.unit = unit;
    if (notes) updateData.notes = notes;

    await healthData.update(updateData);

    res.json({
      message: 'Health data updated successfully',
      healthData: {
        id: healthData.id,
        dataType: healthData.dataType,
        value: healthData.value,
        unit: healthData.unit,
        timestamp: healthData.timestamp,
        source: healthData.source,
        notes: healthData.notes,
        updatedAt: healthData.updatedAt
      }
    });
  } catch (error) {
    console.error('Health data update error:', error);
    res.status(500).json({
      error: 'Health data update failed',
      message: 'Unable to update health data'
    });
  }
});

// Delete health data
router.delete('/:id', async (req, res) => {
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

    const healthData = await HealthData.findOne({
      where: { id, patientId: patient.id }
    });

    if (!healthData) {
      return res.status(404).json({
        error: 'Health data not found',
        message: 'Health data record does not exist'
      });
    }

    await healthData.destroy();

    res.json({
      message: 'Health data deleted successfully'
    });
  } catch (error) {
    console.error('Health data deletion error:', error);
    res.status(500).json({
      error: 'Health data deletion failed',
      message: 'Unable to delete health data'
    });
  }
});

// Bulk import health data (for device sync)
router.post('/bulk', [
  body('data').isArray({ min: 1 }),
  body('data.*.dataType').isIn(['heart_rate', 'blood_pressure', 'temperature', 'oxygen_saturation', 'steps', 'sleep', 'weight', 'glucose', 'other']),
  body('data.*.value').notEmpty(),
  body('data.*.timestamp').optional().isISO8601(),
  body('source').optional().isIn(['manual', 'device', 'app', 'other']),
  body('deviceId').optional().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    const { data, source, deviceId } = req.body;

    const patient = await Patient.findOne({
      where: { userId: req.user.id }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient profile not found',
        message: 'Patient profile does not exist'
      });
    }

    // Prepare data for bulk insert
    const healthDataRecords = data.map(item => ({
      patientId: patient.id,
      dataType: item.dataType,
      value: item.value,
      unit: item.unit || null,
      timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
      source: source || 'device',
      deviceId: deviceId || null,
      notes: item.notes || null
    }));

    // Bulk insert
    const createdRecords = await HealthData.bulkCreate(healthDataRecords);

    res.status(201).json({
      message: 'Health data imported successfully',
      importedCount: createdRecords.length,
      records: createdRecords.map(record => ({
        id: record.id,
        dataType: record.dataType,
        value: record.value,
        timestamp: record.timestamp,
        source: record.source
      }))
    });
  } catch (error) {
    console.error('Health data bulk import error:', error);
    res.status(500).json({
      error: 'Health data bulk import failed',
      message: 'Unable to import health data'
    });
  }
});

// Get device integration status
router.get('/devices/status', async (req, res) => {
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

    // Get unique devices
    const devices = await HealthData.findAll({
      where: { patientId: patient.id },
      attributes: [
        'deviceId',
        'source',
        [fn('MAX', col('timestamp')), 'lastSync']
      ],
      group: ['deviceId', 'source'],
      order: [[fn('MAX', col('timestamp')), 'DESC']]
    });

    res.json({
      devices: devices.map(device => ({
        deviceId: device.deviceId,
        source: device.source,
        lastSync: device.dataValues.lastSync
      }))
    });
  } catch (error) {
    console.error('Device status fetch error:', error);
    res.status(500).json({
      error: 'Device status fetch failed',
      message: 'Unable to retrieve device status'
    });
  }
});

module.exports = router; 