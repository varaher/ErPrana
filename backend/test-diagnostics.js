#!/usr/bin/env node

/**
 * Test script for ErMate diagnostics
 * Run with: node test-diagnostics.js
 */

// Set development environment
process.env.NODE_ENV = 'development';

console.log('🧪 Testing ErMate Diagnostics...\n');

async function testDiagnostics() {
  try {
    // Test database configuration
    console.log('1️⃣ Testing Database Configuration...');
    const { dbConfig } = require('./src/models');
    console.log('✅ Database config loaded:', {
      type: dbConfig.type,
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      ssl: dbConfig.ssl ? 'ON' : 'OFF'
    });

    // Test database connection
    console.log('\n2️⃣ Testing Database Connection...');
    const { testDatabaseConnection } = require('./src/models');
    await testDatabaseConnection();

    // Test coverage checker
    console.log('\n3️⃣ Testing Coverage Checker...');
    const coverageChecker = require('./src/rule-engine/coverageChecker');
    await coverageChecker.printCoverageReport();

    console.log('\n✅ All diagnostics tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Diagnostic test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
testDiagnostics();
