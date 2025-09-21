const { DataTypes, Op, fn, col } = require('sequelize');

module.exports = (sequelize) => {
  const Doctor = sequelize.define('Doctor', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    licenseNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    specialization: {
      type: DataTypes.STRING,
      allowNull: false
    },
    medicalSchool: {
      type: DataTypes.STRING,
      allowNull: true
    },
    graduationYear: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    boardCertifications: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    hospitalAffiliations: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    officeAddress: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    officePhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    officeHours: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    emergencyContact: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isAcceptingPatients: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    maxPatients: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum number of patients this doctor can manage'
    },
    currentPatientCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // EMR integration settings
    emrSystems: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    emrApiKeys: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    // Notification preferences
    notificationPreferences: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        emergencyAlerts: true,
        patientUpdates: true,
        appointmentReminders: false,
        email: true,
        sms: false,
        push: true
      }
    },
    // Professional credentials
    languages: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: ['English']
    },
    insuranceAccepted: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    verificationDate: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'doctors',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['licenseNumber']
      },
      {
        fields: ['specialization']
      },
      {
        fields: ['isAcceptingPatients']
      }
    ]
  });

  // Instance methods
  Doctor.prototype.addPatient = async function() {
    if (this.maxPatients && this.currentPatientCount >= this.maxPatients) {
      throw new Error('Maximum patient capacity reached');
    }
    this.currentPatientCount += 1;
    return await this.save();
  };

  Doctor.prototype.removePatient = async function() {
    if (this.currentPatientCount > 0) {
      this.currentPatientCount -= 1;
      return await this.save();
    }
    return this;
  };

  Doctor.prototype.updateEMRIntegration = async function(system, apiKey) {
    const currentEMR = this.emrSystems || [];
    const currentKeys = this.emrApiKeys || {};
    
    if (!currentEMR.includes(system)) {
      currentEMR.push(system);
    }
    currentKeys[system] = apiKey;
    
    this.emrSystems = currentEMR;
    this.emrApiKeys = currentKeys;
    return await this.save();
  };

  Doctor.prototype.verify = async function() {
    this.isVerified = true;
    this.verificationDate = new Date();
    return await this.save();
  };

  // Class methods
  Doctor.findByUserId = async function(userId) {
    return await this.findOne({
      where: { userId }
    });
  };

  Doctor.findBySpecialization = async function(specialization) {
    return await this.findAll({
      where: { 
        specialization,
        isAcceptingPatients: true
      },
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });
  };

  Doctor.getAvailableDoctors = async function() {
    return await this.findAll({
      where: { 
        isAcceptingPatients: true,
        isVerified: true
      },
      order: [['specialization', 'ASC'], ['lastName', 'ASC']]
    });
  };

  Doctor.searchDoctors = async function(query, filters = {}) {
    const whereClause = {
      isAcceptingPatients: true,
      isVerified: true
    };

    if (filters.specialization) {
      whereClause.specialization = filters.specialization;
    }

    if (filters.language) {
      whereClause.languages = {
        [Op.contains]: [filters.language]
      };
    }

    return await this.findAll({
      where: whereClause,
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });
  };

  return Doctor;
}; 