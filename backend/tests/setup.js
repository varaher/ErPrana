// Test setup file
require('dotenv').config({ path: '.env.test' });

// Mock console.log to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'ermate_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'password';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.JWT_SECRET = 'test-secret-key';
