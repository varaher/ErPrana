const { DataTypes, Op, fn, col } = require('sequelize');

module.exports = (sequelize) => {
  const EmergencyEvent = sequelize.define('EmergencyEvent', {
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
    mode: {
      type: DataTypes.ENUM('personal', 'bystander'),
      allowNull: false,
      defaultValue: 'personal'
    },
    scenario: {
      type: DataTypes.ENUM(
        'unresponsive',
        'chest_pain',
        'severe_bleeding',
        'seizure',
        'stroke',
        'choking',
        'breathing_difficulty',
        'accident',
        'fall',
        'poisoning',
        'other'
      ),
      allowNull: false
    },
    eventType: {
      type: DataTypes.ENUM(
        'medical_emergency',
        'accident',
        'fall',
        'cardiac_arrest',
        'stroke',
        'seizure',
        'breathing_difficulty',
        'severe_pain',
        'unconsciousness',
        'bleeding',
        'poisoning',
        'other'
      ),
      allowNull: false
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    location: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'GPS coordinates and address information'
    },
    coordinates: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Latitude and longitude coordinates'
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Associated symptom session ID if applicable'
    },
    symptoms: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    vitalSigns: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    triggeredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'resolved', 'cancelled'),
      allowNull: false,
      defaultValue: 'active'
    },
    resolutionNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    emergencyServicesCalled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    contactsNotified: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    estimatedResponseTime: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'emergency_events',
    timestamps: true,
    indexes: [
      {
        fields: ['patientId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['triggeredAt']
      },
      {
        fields: ['mode']
      },
      {
        fields: ['scenario']
      }
    ]
  });

  // Instance methods
  EmergencyEvent.prototype.cancel = async function(reason) {
    this.status = 'cancelled';
    this.resolutionNotes = reason || 'Cancelled by user';
    this.resolvedAt = new Date();
    return await this.save();
  };

  EmergencyEvent.prototype.resolve = async function(notes) {
    this.status = 'resolved';
    this.resolutionNotes = notes || 'Resolved';
    this.resolvedAt = new Date();
    return await this.save();
  };

  // Class methods
  EmergencyEvent.getActiveEvents = async function(patientId) {
    return await this.findAll({
      where: {
        patientId,
        status: 'active'
      },
      order: [['triggeredAt', 'DESC']]
    });
  };

  EmergencyEvent.getRecentEvents = async function(patientId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await this.findAll({
      where: {
        patientId,
        triggeredAt: {
          [Op.gte]: startDate
        }
      },
      order: [['triggeredAt', 'DESC']]
    });
  };

  return EmergencyEvent;
}; 