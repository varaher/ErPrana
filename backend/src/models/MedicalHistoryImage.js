const { DataTypes, Op, fn, col } = require('sequelize');

module.exports = (sequelize) => {
  const MedicalHistoryImage = sequelize.define('MedicalHistoryImage', {
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
    doctorId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Doctors',
        key: 'id'
      }
    },
    imageType: {
      type: DataTypes.ENUM(
        'wound',
        'injury',
        'rash',
        'swelling',
        'deformity',
        'medical_device',
        'prescription',
        'lab_result',
        'imaging_result',
        'general',
        'emergency',
        'follow_up'
      ),
      allowNull: false,
      defaultValue: 'general'
    },
    origin: {
      type: DataTypes.ENUM('personal', 'bystander'),
      allowNull: false,
      defaultValue: 'personal'
    },
    scenario: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Specific scenario when photo was taken (e.g., major_bleeding, chest_pain)'
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Path to stored image file'
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'File size in bytes'
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'image/jpeg'
    },
    dimensions: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Image dimensions {width, height}'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional metadata like location, notes, tags'
    },
    isShared: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether image is shared with assigned doctor'
    },
    isUrgent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether image requires immediate attention'
    },
    isConfidential: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether image contains sensitive information'
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
      comment: 'Searchable tags for the image'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Description of what the image shows'
    },
    clinicalNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Clinical observations about the image'
    },
    relatedSessionId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Related symptom session or emergency event'
    },
    relatedEmergencyId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'EmergencyEvents',
        key: 'id'
      }
    },
    capturedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    uploadedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    lastViewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When image was last viewed by doctor'
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of times image has been viewed'
    },
    status: {
      type: DataTypes.ENUM('active', 'archived', 'deleted', 'pending_review'),
      allowNull: false,
      defaultValue: 'active'
    }
  }, {
    tableName: 'medical_history_images',
    timestamps: true,
    indexes: [
      {
        name: 'idx_medical_images_patient',
        fields: ['patientId']
      },
      {
        name: 'idx_medical_images_doctor',
        fields: ['doctorId']
      },
      {
        name: 'idx_medical_images_origin',
        fields: ['origin']
      },
      {
        name: 'idx_medical_images_scenario',
        fields: ['scenario']
      },
      {
        name: 'idx_medical_images_type',
        fields: ['imageType']
      },
      {
        name: 'idx_medical_images_shared',
        fields: ['isShared']
      },
      {
        name: 'idx_medical_images_urgent',
        fields: ['isUrgent']
      },
      {
        name: 'idx_medical_images_captured',
        fields: ['capturedAt']
      },
      {
        name: 'idx_medical_images_tags',
        fields: ['tags'],
        using: 'gin'
      }
    ]
  });

  // Instance methods
  MedicalHistoryImage.prototype.markAsViewed = async function(doctorId = null) {
    this.lastViewedAt = new Date();
    this.viewCount += 1;
    if (doctorId) {
      this.doctorId = doctorId;
    }
    return await this.save();
  };

  MedicalHistoryImage.prototype.shareWithDoctor = async function(doctorId) {
    this.isShared = true;
    this.doctorId = doctorId;
    return await this.save();
  };

  MedicalHistoryImage.prototype.markAsUrgent = async function() {
    this.isUrgent = true;
    return await this.save();
  };

  MedicalHistoryImage.prototype.addClinicalNotes = async function(notes, doctorId) {
    this.clinicalNotes = notes;
    this.doctorId = doctorId;
    this.lastViewedAt = new Date();
    return await this.save();
  };

  MedicalHistoryImage.prototype.archive = async function() {
    this.status = 'archived';
    return await this.save();
  };

  // Class methods
  MedicalHistoryImage.getRecentImages = async function(patientId, limit = 10) {
    return await this.findAll({
      where: {
        patientId,
        status: 'active'
      },
      order: [['capturedAt', 'DESC']],
      limit
    });
  };

  MedicalHistoryImage.getImagesByScenario = async function(patientId, scenario) {
    return await this.findAll({
      where: {
        patientId,
        scenario,
        status: 'active'
      },
      order: [['capturedAt', 'DESC']]
    });
  };

  MedicalHistoryImage.getSharedImages = async function(patientId, doctorId) {
    return await this.findAll({
      where: {
        patientId,
        doctorId,
        isShared: true,
        status: 'active'
      },
      order: [['capturedAt', 'DESC']]
    });
  };

  MedicalHistoryImage.getUrgentImages = async function(patientId) {
    return await this.findAll({
      where: {
        patientId,
        isUrgent: true,
        status: 'active'
      },
      order: [['capturedAt', 'DESC']]
    });
  };

  MedicalHistoryImage.searchByTags = async function(patientId, tags) {
    return await this.findAll({
      where: {
        patientId,
        status: 'active',
        tags: {
          [Op.overlap]: tags
        }
      },
      order: [['capturedAt', 'DESC']]
    });
  };

  MedicalHistoryImage.getImagesByType = async function(patientId, imageType) {
    return await this.findAll({
      where: {
        patientId,
        imageType,
        status: 'active'
      },
      order: [['capturedAt', 'DESC']]
    });
  };

  MedicalHistoryImage.getImagesByDateRange = async function(patientId, startDate, endDate) {
    return await this.findAll({
      where: {
        patientId,
        status: 'active',
        capturedAt: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['capturedAt', 'DESC']]
    });
  };

  // Associations
  MedicalHistoryImage.associate = (models) => {
    MedicalHistoryImage.belongsTo(models.Patient, {
      foreignKey: 'patientId',
      as: 'patient'
    });

    MedicalHistoryImage.belongsTo(models.Doctor, {
      foreignKey: 'doctorId',
      as: 'doctor'
    });

    MedicalHistoryImage.belongsTo(models.EmergencyEvent, {
      foreignKey: 'relatedEmergencyId',
      as: 'emergencyEvent'
    });

    // Many-to-many with ClinicalNote for linking images to notes
    MedicalHistoryImage.belongsToMany(models.ClinicalNote, {
      through: 'ClinicalNoteImages',
      foreignKey: 'imageId',
      otherKey: 'noteId',
      as: 'clinicalNotes'
    });
  };

  return MedicalHistoryImage;
};
