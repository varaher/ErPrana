const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration with support for DATABASE_URL (hosted) or discrete variables (local)
let sequelize;
let dbConfig;

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL for hosted databases (Neon, Supabase, etc.)
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    type: 'DATABASE_URL',
    host: url.hostname,
    port: url.port || '5432',
    database: url.pathname.slice(1), // Remove leading slash
    ssl: true,
    connectionString: process.env.DATABASE_URL
  };
  
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // For development; set to true in production
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  // Use discrete variables for local development
  dbConfig = {
    type: 'DISCRETE_VARS',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '5432',
    database: process.env.DB_NAME || 'ermate_db',
    ssl: false,
    connectionString: null
  };
  
  sequelize = new Sequelize(
    process.env.DB_NAME || 'ermate_db',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'password',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

// Database diagnostics (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('\n' + '='.repeat(50));
  console.log('🗄️  DB DIAGNOSTICS');
  console.log('='.repeat(50));
  console.log(`Connection Type: ${dbConfig.type}`);
  console.log(`Host: ${dbConfig.host}`);
  console.log(`Port: ${dbConfig.port}`);
  console.log(`Database: ${dbConfig.database}`);
  console.log(`SSL: ${dbConfig.ssl ? 'ON' : 'OFF'}`);
  if (dbConfig.connectionString) {
    // Mask password in connection string for security
    const maskedUrl = dbConfig.connectionString.replace(/:([^:@]+)@/, ':****@');
    console.log(`Connection: ${maskedUrl}`);
  }
  console.log('='.repeat(50) + '\n');
}

// Import models
const User = require('./User')(sequelize);
const Patient = require('./Patient')(sequelize);
const Doctor = require('./Doctor')(sequelize);
const EmergencyEvent = require('./EmergencyEvent')(sequelize);
const HealthData = require('./HealthData')(sequelize);
const ClinicalNote = require('./ClinicalNote')(sequelize);
const EmergencyContact = require('./EmergencyContact')(sequelize);
const SymptomSession = require('./SymptomSession')(sequelize);
const SymptomFeedback = require('./SymptomFeedback')(sequelize);
const MedicalHistoryImage = require('./MedicalHistoryImage')(sequelize);

// Define associations
User.hasOne(Patient, { foreignKey: 'userId', as: 'patient' });
Patient.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Doctor, { foreignKey: 'userId', as: 'doctor' });
Doctor.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Patient.hasMany(EmergencyEvent, { foreignKey: 'patientId', as: 'emergencyEvents' });
EmergencyEvent.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

Patient.hasMany(HealthData, { foreignKey: 'patientId', as: 'healthData' });
HealthData.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

Patient.hasMany(ClinicalNote, { foreignKey: 'patientId', as: 'clinicalNotes' });
ClinicalNote.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

Patient.hasMany(EmergencyContact, { foreignKey: 'patientId', as: 'emergencyContactsList' });
EmergencyContact.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

// Symptom checker associations
User.hasMany(SymptomSession, { foreignKey: 'userId', as: 'symptomSessions' });
SymptomSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

SymptomSession.hasMany(SymptomFeedback, { foreignKey: 'sessionId', as: 'feedback' });
SymptomFeedback.belongsTo(SymptomSession, { foreignKey: 'sessionId', as: 'session' });

User.hasMany(SymptomFeedback, { foreignKey: 'userId', as: 'symptomFeedback' });
SymptomFeedback.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Doctor-Patient associations
Doctor.hasMany(Patient, { foreignKey: 'doctorId', as: 'patients' });
Patient.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

// Medical History Image associations
Patient.hasMany(MedicalHistoryImage, { foreignKey: 'patientId', as: 'medicalImages' });
MedicalHistoryImage.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

Doctor.hasMany(MedicalHistoryImage, { foreignKey: 'doctorId', as: 'medicalImages' });
MedicalHistoryImage.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

EmergencyEvent.hasMany(MedicalHistoryImage, { foreignKey: 'relatedEmergencyId', as: 'medicalImages' });
MedicalHistoryImage.belongsTo(EmergencyEvent, { foreignKey: 'relatedEmergencyId', as: 'emergencyEvent' });

/**
 * Test database connection and provide diagnostics
 */
async function testDatabaseConnection() {
  if (process.env.NODE_ENV !== 'development') {
    return; // Only run diagnostics in development
  }
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database authenticate() SUCCESS - Connection established');
  } catch (error) {
    console.log('❌ Database authenticate() FAILED');
    console.log(`   Reason: ${error.message}`);
    
    // Provide specific troubleshooting hints
    if (dbConfig.type === 'DATABASE_URL') {
      console.log('   Troubleshooting: Check network, SSL settings, and credentials');
    } else {
      console.log('   Troubleshooting: Ensure PostgreSQL is running and credentials are correct');
    }
  }
}

// Test connection on module load (development only)
if (process.env.NODE_ENV === 'development') {
  testDatabaseConnection();
}

module.exports = {
  sequelize,
  dbConfig,
  testDatabaseConnection,
  User,
  Patient,
  Doctor,
  EmergencyEvent,
  HealthData,
  ClinicalNote,
  EmergencyContact,
  SymptomSession,
  SymptomFeedback,
  MedicalHistoryImage
}; 