const { DataTypes, Op, fn, col } = require('sequelize');

module.exports = (sequelize) => {
  const ClinicalNote = sequelize.define('ClinicalNote', {
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
    noteType: {
      type: DataTypes.ENUM(
        'consultation',
        'assessment',
        'treatment_plan',
        'follow_up',
        'emergency',
        'procedure',
        'lab_result',
        'imaging_result',
        'medication_review',
        'discharge_summary',
        'other'
      ),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // Structured data for specific note types
    structuredData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Structured clinical data (vitals, symptoms, etc.)'
    },
    // Assessment and diagnosis
    assessment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    diagnosis: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Array of diagnosis codes and descriptions'
    },
    differentialDiagnosis: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'List of differential diagnoses considered'
    },
    // Treatment and medications
    treatmentPlan: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    medications: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Medications prescribed or reviewed'
    },
    procedures: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'Procedures performed or recommended'
    },
    // Follow-up and outcomes
    followUpRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    followUpDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    followUpType: {
      type: DataTypes.ENUM(
        'in_person',
        'telemedicine',
        'phone',
        'email',
        'none'
      ),
      allowNull: true
    },
    outcome: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Clinical outcome or result'
    },
    // Metadata
    encounterDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    encounterDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Duration of encounter in minutes'
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Location where note was created'
    },
    // Status and workflow
    status: {
      type: DataTypes.ENUM(
        'draft',
        'finalized',
        'reviewed',
        'archived',
        'deleted'
      ),
      allowNull: false,
      defaultValue: 'draft'
    },
    isTemplate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this note is a reusable template'
    },
    templateCategory: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Category for template organization'
    },
    // Privacy and sharing
    isConfidential: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    accessLevel: {
      type: DataTypes.ENUM(
        'private',
        'team',
        'department',
        'organization',
        'public'
      ),
      allowNull: false,
      defaultValue: 'private'
    },
    // Audit trail
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'User ID who created the note'
    },
    lastModifiedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'User ID who last modified the note'
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    // Tags and categorization
    tags: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'User-defined tags for categorization'
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium'
    },
    // External references
    externalReferences: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'References to external systems or documents'
    },
    attachments: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'File attachments or links'
    }
  }, {
    tableName: 'clinical_notes',
    timestamps: true,
    indexes: [
      {
        fields: ['patientId']
      },
      {
        fields: ['doctorId']
      },
      {
        fields: ['noteType']
      },
      {
        fields: ['encounterDate']
      },
      {
        fields: ['status']
      },
      {
        fields: ['patientId', 'encounterDate']
      },
      {
        fields: ['patientId', 'noteType']
      }
    ]
  });

  // Instance methods
  ClinicalNote.prototype.finalize = async function() {
    this.status = 'finalized';
    this.version += 1;
    return await this.save();
  };

  ClinicalNote.prototype.markReviewed = async function() {
    this.status = 'reviewed';
    return await this.save();
  };

  ClinicalNote.prototype.archive = async function() {
    this.status = 'archived';
    return await this.save();
  };

  ClinicalNote.prototype.addDiagnosis = async function(diagnosis) {
    const diagnoses = this.diagnosis || [];
    diagnoses.push(diagnosis);
    this.diagnosis = diagnoses;
    return await this.save();
  };

  ClinicalNote.prototype.addMedication = async function(medication) {
    const medications = this.medications || [];
    medications.push(medication);
    this.medications = medications;
    return await this.save();
  };

  ClinicalNote.prototype.setFollowUp = async function(date, type) {
    this.followUpRequired = true;
    this.followUpDate = date;
    this.followUpType = type;
    return await this.save();
  };

  // Class methods
  ClinicalNote.getByPatient = async function(patientId, options = {}) {
    const whereClause = { patientId };
    
    if (options.noteType) {
      whereClause.noteType = options.noteType;
    }
    
    if (options.status) {
      whereClause.status = options.status;
    }
    
    if (options.startDate && options.endDate) {
      whereClause.encounterDate = {
        [Op.between]: [options.startDate, options.endDate]
      };
    }
    
    return await this.findAll({
      where: whereClause,
      order: [['encounterDate', 'DESC']],
      limit: options.limit || 50
    });
  };

  ClinicalNote.getByDoctor = async function(doctorId, options = {}) {
    const whereClause = { doctorId };
    
    if (options.status) {
      whereClause.status = options.status;
    }
    
    return await this.findAll({
      where: whereClause,
      order: [['encounterDate', 'DESC']],
      limit: options.limit || 50
    });
  };

  ClinicalNote.getTemplates = async function(category = null) {
    const whereClause = {
      isTemplate: true,
      status: 'finalized'
    };
    
    if (category) {
      whereClause.templateCategory = category;
    }
    
    return await this.findAll({
      where: whereClause,
      order: [['templateCategory', 'ASC'], ['title', 'ASC']]
    });
  };

  ClinicalNote.searchNotes = async function(patientId, query, options = {}) {
    const whereClause = {
      patientId,
      [Op.or]: [
        { title: { [Op.iLike]: `%${query}%` } },
        { content: { [Op.iLike]: `%${query}%` } },
        { assessment: { [Op.iLike]: `%${query}%` } }
      ]
    };
    
    if (options.noteType) {
      whereClause.noteType = options.noteType;
    }
    
    return await this.findAll({
      where: whereClause,
      order: [['encounterDate', 'DESC']],
      limit: options.limit || 20
    });
  };

  ClinicalNote.getFollowUpNotes = async function(patientId, startDate, endDate) {
    return await this.findAll({
      where: {
        patientId,
        followUpRequired: true,
        followUpDate: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['followUpDate', 'ASC']]
    });
  };

  return ClinicalNote;
}; 