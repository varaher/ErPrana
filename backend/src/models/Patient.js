const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Patient = sequelize.define('Patient', {
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
    doctorId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Doctors',
        key: 'id'
      }
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    sex: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: false
    },
    bloodType: {
      type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      allowNull: true
    },
    height: {
      type: DataTypes.INTEGER, // in cm
      allowNull: true
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2), // in kg
      allowNull: true
    },
    allergies: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    medications: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    medicalHistory: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    emergencyContacts: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: []
    },
    // Emergency-related fields
    isEmergencyMode: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    emergencyLocation: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'GPS coordinates and address information'
    },
    emergencyNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    lastEmergencyTrigger: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Health tracking preferences
    healthTrackingEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    healthDataSync: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {
        appleHealth: false,
        googleFit: false,
        fitbit: false,
        samsungHealth: false
      }
    },
    // Privacy and consent
    dataSharingConsent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    doctorAccessConsent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    emergencyServicesConsent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'patients',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['doctorId']
      },
      {
        fields: ['isEmergencyMode']
      }
    ]
  });

  // Instance methods
  Patient.prototype.triggerEmergency = async function(location, notes) {
    this.isEmergencyMode = true;
    this.emergencyLocation = location;
    this.emergencyNotes = notes;
    this.lastEmergencyTrigger = new Date();
    return await this.save();
  };

  Patient.prototype.clearEmergency = async function() {
    this.isEmergencyMode = false;
    this.emergencyLocation = null;
    this.emergencyNotes = null;
    return await this.save();
  };

  Patient.prototype.updateHealthDataSync = async function(provider, enabled) {
    const currentSync = this.healthDataSync || {};
    currentSync[provider] = enabled;
    this.healthDataSync = currentSync;
    return await this.save();
  };

  Patient.prototype.addAllergy = async function(allergy) {
    const allergies = this.allergies || [];
    if (!allergies.includes(allergy)) {
      allergies.push(allergy);
      this.allergies = allergies;
      return await this.save();
    }
    return this;
  };

  Patient.prototype.addMedication = async function(medication) {
    const medications = this.medications || [];
    if (!medications.includes(medication)) {
      medications.push(medication);
      this.medications = medications;
      return await this.save();
    }
    return this;
  };

  Patient.prototype.addMedicalHistory = async function(condition) {
    const history = this.medicalHistory || [];
    if (!history.includes(condition)) {
      history.push(condition);
      this.medicalHistory = history;
      return await this.save();
    }
    return this;
  };

  // Class methods
  Patient.findByUserId = async function(userId) {
    return await this.findOne({
      where: { userId }
    });
  };

  Patient.getEmergencyPatients = async function() {
    return await this.findAll({
      where: { isEmergencyMode: true },
      order: [['lastEmergencyTrigger', 'DESC']]
    });
  };

  Patient.getPatientsByDoctor = async function(doctorId) {
    return await this.findAll({
      where: { doctorId },
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });
  };

  return Patient;
}; 