const path = require('path');
const fs = require('fs');

/**
 * Environment Configuration Manager
 * Handles loading environment variables from .env or env.local files
 * and validates required configuration on startup
 */
class EnvironmentManager {
  constructor() {
    this.loadedFile = null;
    this.requiredVars = [
      'PORT',
      'NODE_ENV', 
      'JWT_SECRET'
    ];
    
    // Database configuration can be either DATABASE_URL or discrete variables
    this.databaseVars = [
      'DATABASE_URL',
      'DB_HOST',
      'DB_PORT', 
      'DB_NAME',
      'DB_USER',
      'DB_PASSWORD'
    ];
    
    this.criticalVars = [
      'JWT_SECRET'
    ];
  }

  /**
   * Load environment variables from configuration files
   */
  loadEnvironment() {
    const projectRoot = path.resolve(__dirname, '..', '..');
    
    // Try to load .env first
    const envPath = path.join(projectRoot, '.env');
    const envLocalPath = path.join(projectRoot, 'env.local');
    
    // For Cursor users, prioritize env.local if it exists
    if (fs.existsSync(envLocalPath)) {
      require('dotenv').config({ path: envLocalPath });
      this.loadedFile = 'env.local';
      console.log('📁 Environment loaded from: env.local (Cursor environment)');
    } else if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath });
      this.loadedFile = '.env';
      console.log('📁 Environment loaded from: .env');
    } else {
      // No env file found, try to load from system environment
      console.log('⚠️  No .env or env.local file found, using system environment variables');
      this.loadedFile = 'system';
    }
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const missingVars = [];
    const presentVars = [];
    
    // Check each required variable
    this.requiredVars.forEach(varName => {
      if (process.env[varName]) {
        presentVars.push(varName);
      } else {
        missingVars.push(varName);
      }
    });

    // Check database configuration
    const databaseConfig = this.validateDatabaseConfiguration();
    
    // Print environment validation banner
    this.printEnvironmentBanner(presentVars, missingVars, databaseConfig);
    
    // Check for critical missing variables
    const missingCritical = this.criticalVars.filter(varName => !process.env[varName]);
    
    if (missingCritical.length > 0) {
      const errorMessage = `
🚨 CRITICAL ERROR: Missing required environment variables!

Missing critical variables: ${missingCritical.join(', ')}

Please configure these variables in:
- Local development: .env file
- Cursor environment: env.local file  
- Production: Set in deployment system

Example .env file:
JWT_SECRET=your_jwt_secret_key_here

# Database (either DATABASE_URL or discrete variables):
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
# OR
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ermate_db
DB_USER=ermate_user
DB_PASSWORD=your_password

Server cannot start without these critical variables.
      `.trim();
      
      throw new Error(errorMessage);
    }

    return {
      isValid: missingVars.length === 0 && databaseConfig.isValid,
      missing: missingVars,
      present: presentVars,
      loadedFrom: this.loadedFile,
      database: databaseConfig
    };
  }

  /**
   * Validate database configuration
   */
  validateDatabaseConfiguration() {
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    const hasDiscreteVars = process.env.DB_HOST && process.env.DB_NAME && 
                           process.env.DB_USER && process.env.DB_PASSWORD;
    
    if (hasDatabaseUrl) {
      return {
        isValid: true,
        type: 'DATABASE_URL',
        message: 'Using DATABASE_URL (hosted database)',
        ssl: process.env.DATABASE_URL.includes('sslmode=require') ? 'SSL Enabled' : 'SSL Optional'
      };
    } else if (hasDiscreteVars) {
      return {
        isValid: true,
        type: 'DISCRETE_VARS',
        message: 'Using discrete database variables (local database)',
        ssl: 'Local (no SSL)'
      };
    } else {
      return {
        isValid: false,
        type: 'NONE',
        message: 'No database configuration found',
        ssl: 'N/A'
      };
    }
  }

  /**
   * Print environment validation banner
   */
  printEnvironmentBanner(presentVars, missingVars, databaseConfig) {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 ERMATE ENVIRONMENT VALIDATION');
    console.log('='.repeat(60));
    console.log(`📁 Config loaded from: ${this.loadedFile}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🚀 Server port: ${process.env.PORT || 3000}`);
    console.log('');
    
    // Database configuration section
    console.log('🗄️  DATABASE CONFIGURATION:');
    console.log('-'.repeat(40));
    if (databaseConfig.isValid) {
      console.log(`✅ ${databaseConfig.message}`);
      console.log(`   Type: ${databaseConfig.type}`);
      console.log(`   SSL: ${databaseConfig.ssl}`);
    } else {
      console.log(`❌ ${databaseConfig.message}`);
      console.log('   BLOCKING: Database connection will fail');
    }
    console.log('');
    
    console.log('📋 REQUIRED VARIABLES CHECKLIST:');
    console.log('-'.repeat(40));
    
    this.requiredVars.forEach(varName => {
      const isPresent = presentVars.includes(varName);
      const isCritical = this.criticalVars.includes(varName);
      const status = isPresent ? '✅' : '❌';
      const critical = isCritical ? ' [CRITICAL]' : '';
      
      if (isPresent) {
        // Don't show actual values for security
        const value = varName.includes('PASSWORD') || varName.includes('SECRET') 
          ? '***SET***' 
          : process.env[varName];
        console.log(`${status} ${varName}${critical}: ${value}`);
      } else {
        console.log(`${status} ${varName}${critical}: NOT SET`);
      }
    });
    
    console.log('');
    
    if (missingVars.length > 0) {
      console.log('⚠️  MISSING VARIABLES:');
      missingVars.forEach(varName => {
        const isCritical = this.criticalVars.includes(varName);
        const critical = isCritical ? ' [CRITICAL]' : '';
        console.log(`   ❌ ${varName}${critical}`);
      });
      console.log('');
    }
    
    if (presentVars.length === this.requiredVars.length && databaseConfig.isValid) {
      console.log('🎉 All required environment variables are configured!');
    }
    
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Get environment variable with fallback
   */
  get(key, fallback = null) {
    return process.env[key] || fallback;
  }

  /**
   * Check if environment variable is set
   */
  has(key) {
    return !!process.env[key];
  }

  /**
   * Get all environment variables (for debugging, without secrets)
   */
  getEnvironmentSummary() {
    const summary = {};
    
    Object.keys(process.env).forEach(key => {
      if (key.includes('PASSWORD') || key.includes('SECRET') || key.includes('KEY')) {
        summary[key] = process.env[key] ? '***SET***' : 'NOT SET';
      } else {
        summary[key] = process.env[key];
      }
    });
    
    return summary;
  }
}

// Create singleton instance
const envManager = new EnvironmentManager();

// Load and validate environment on module import
envManager.loadEnvironment();

module.exports = envManager;
