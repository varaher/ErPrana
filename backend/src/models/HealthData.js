const { DataTypes, Op, fn, col } = require('sequelize');

module.exports = (sequelize) => {
  const HealthData = sequelize.define('HealthData', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Patients',
        key: 'id'
      }
    },
    dataType: {
      type: DataTypes.ENUM(
        'heart_rate',
        'blood_pressure',
        'oxygen_saturation',
        'temperature',
        'respiratory_rate',
        'steps',
        'sleep',
        'weight',
        'glucose',
        'activity',
        'ecg',
        'other'
      ),
      allowNull: false
    },
    value: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Structured data for the specific metric type'
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    source: {
      type: DataTypes.ENUM(
        'apple_health',
        'google_fit',
        'fitbit',
        'samsung_health',
        'manual_entry',
        'device_sync',
        'other'
      ),
      allowNull: false
    },
    deviceId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Identifier for the device that generated this data'
    },
    confidence: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 1.0,
      comment: 'Confidence level of the measurement (0.0 to 1.0)'
    },
    isAnomalous: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Flag for data that falls outside normal ranges'
    },
    anomalyScore: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      comment: 'Statistical anomaly score (0.0 to 1.0)'
    },
    // Metadata
    location: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'GPS coordinates where data was collected'
    },
    context: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional context (activity, mood, etc.)'
    },
    tags: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'User-defined tags for categorization'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Processing flags
    isProcessed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Privacy and sharing
    isShared: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    sharedWith: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'List of doctor IDs or other entities this data is shared with'
    }
  }, {
    tableName: 'health_data',
    timestamps: true,
    indexes: [
      {
        fields: ['patientId']
      },
      {
        fields: ['dataType']
      },
      {
        fields: ['timestamp']
      },
      {
        fields: ['source']
      },
      {
        fields: ['isAnomalous']
      },
      {
        fields: ['patientId', 'dataType', 'timestamp']
      }
    ]
  });

  // Instance methods
  HealthData.prototype.markProcessed = async function() {
    this.isProcessed = true;
    this.processedAt = new Date();
    return await this.save();
  };

  HealthData.prototype.markAnomalous = async function(score) {
    this.isAnomalous = true;
    this.anomalyScore = score;
    return await this.save();
  };

  HealthData.prototype.shareWith = async function(doctorId) {
    const sharedWith = this.sharedWith || [];
    if (!sharedWith.includes(doctorId)) {
      sharedWith.push(doctorId);
      this.sharedWith = sharedWith;
      this.isShared = true;
      return await this.save();
    }
    return this;
  };

  HealthData.prototype.unshareFrom = async function(doctorId) {
    const sharedWith = this.sharedWith || [];
    const updatedSharedWith = sharedWith.filter(id => id !== doctorId);
    this.sharedWith = updatedSharedWith;
    this.isShared = updatedSharedWith.length > 0;
    return await this.save();
  };

  // Class methods
  HealthData.getLatestByType = async function(patientId, dataType, limit = 1) {
    return await this.findAll({
      where: { patientId, dataType },
      order: [['timestamp', 'DESC']],
      limit
    });
  };

  HealthData.getByDateRange = async function(patientId, dataType, startDate, endDate) {
    return await this.findAll({
      where: {
        patientId,
        dataType,
        timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['timestamp', 'ASC']]
    });
  };

  HealthData.getAnomalousData = async function(patientId, limit = 10) {
    return await this.findAll({
      where: {
        patientId,
        isAnomalous: true
      },
      order: [['timestamp', 'DESC']],
      limit
    });
  };

  HealthData.getTrends = async function(patientId, dataType, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await this.findAll({
      where: {
        patientId,
        dataType,
        timestamp: {
          [Op.gte]: startDate
        }
      },
      order: [['timestamp', 'ASC']]
    });
  };

  HealthData.aggregateByDay = async function(patientId, dataType, startDate, endDate) {
    return await this.findAll({
      attributes: [
        [fn('DATE', col('timestamp')), 'date'],
        [fn('AVG', col('value')), 'avgValue'],
        [fn('MIN', col('value')), 'minValue'],
        [fn('MAX', col('value')), 'maxValue'],
        [fn('COUNT', col('id')), 'count']
      ],
      where: {
        patientId,
        dataType,
        timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      group: [fn('DATE', col('timestamp'))],
      order: [[fn('DATE', col('timestamp')), 'ASC']]
    });
  };

  return HealthData;
}; 