require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Environment and config
const envManager = require('./config/env');
const preflight = require('./config/preflight');
const { env } = envManager;

// Feature flags
const FEATURE_FLAGS = {
  VOICE_GOOGLE_ENABLED: process.env.VOICE_GOOGLE_ENABLED === '1',
  VOICE_OPENAI_ENABLED: process.env.VOICE_OPENAI_ENABLED === '1',
  VOICE_ONLINE_REQUIRED: process.env.VOICE_ONLINE_REQUIRED === '1',
  DATABASE_ENABLED: process.env.DATABASE_ENABLED !== '0',
  SAFE_BOOT: process.env.SAFE_BOOT === '1'
};

console.log('🔧 ERMATE FEATURE FLAGS:');
Object.entries(FEATURE_FLAGS).forEach(([flag, enabled]) => {
  console.log(`  ${enabled ? '✅' : '❌'} ${flag}: ${enabled}`);
});

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware (always enabled)
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS ? 
  process.env.CORS_ORIGINS.split(',') : 
  ['http://localhost:19006', 'http://localhost:3000'];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// 🚀 HEALTH-FIRST STARTUP: Bind /health immediately
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: FEATURE_FLAGS.SAFE_BOOT ? 'degraded' : 'full',
    timestamp: new Date().toISOString(),
    features: FEATURE_FLAGS,
    uptime: process.uptime()
  });
});

// Environment info endpoint
app.get('/whoami-env', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV || 'development',
    API_BASE: process.env.API_BASE || `http://localhost:${PORT}`,
    CORS_ORIGINS: corsOrigins,
    FEATURE_FLAGS,
    SAFE_BOOT: FEATURE_FLAGS.SAFE_BOOT
  });
});

// 🛡️ SAFE_BOOT CHECK: Only initialize heavy services if not in safe mode
if (!FEATURE_FLAGS.SAFE_BOOT) {
  console.log('🚀 Initializing full services...');
  
  try {
    // Database initialization (Sequelize)
    if (FEATURE_FLAGS.DATABASE_ENABLED) {
      console.log('📊 Initializing database...');
      require('./models');
      console.log('✅ Database initialized');
    }
    
    // Voice services (conditional on feature flags)
    if (FEATURE_FLAGS.VOICE_GOOGLE_ENABLED || FEATURE_FLAGS.VOICE_OPENAI_ENABLED) {
      console.log('🎤 Initializing voice services...');
      
      // Lazy import voice routes to prevent import-time crashes
      try {
        const voiceRoutes = require('./routes/voice');
        app.use('/api/voice', voiceRoutes);
        console.log('✅ Voice services initialized');
      } catch (error) {
        console.warn('⚠️  Voice services failed to initialize:', error.message);
        console.log('🔄 Voice features will be unavailable');
      }
    }
    
    // Other API routes
    try {
      const { router: triageRoutes } = require('./routes/triage');
      const learningRoutes = require('./routes/learning');
      const symptomsRoutes = require('./routes/symptoms');
      
      app.use('/api/triage', triageRoutes);
      app.use('/api/learning', learningRoutes);
      app.use('/api/symptoms', symptomsRoutes);
      
      // Add playground routes (no authentication required)
      const { playgroundRouter } = require('./routes/triage');
      app.use('/api', playgroundRouter);
      
      console.log('✅ API routes loaded');
    } catch (error) {
      console.warn('⚠️  Some API routes failed to load:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Service initialization failed:', error.message);
    console.log('🛡️  Falling back to degraded mode');
    process.env.SAFE_BOOT = '1';
  }
} else {
  console.log('🛡️  SAFE_BOOT ACTIVE: Running in degraded mode');
  
  // Degraded mode routes
  app.get('/api/status', (req, res) => {
    res.json({
      status: 'degraded',
      message: 'Server running in safe mode - limited functionality',
      available: ['/health', '/whoami-env', '/api/status']
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: FEATURE_FLAGS.SAFE_BOOT ? 'Service temporarily unavailable' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`,
    available: ['/health', '/whoami-env']
  });
});

// 🚀 START SERVER: Should always reach this point
const startServer = async () => {
  try {
    // Run preflight checks first (simplified for debugging)
    console.log('🔍 Running preflight package checks...');
    try {
      preflight.runPreflightChecks({
        checkVoiceServices: FEATURE_FLAGS.VOICE_GOOGLE_ENABLED || FEATURE_FLAGS.VOICE_OPENAI_ENABLED,
        strict: false // Don't fail on voice service packages
      });
    } catch (preflightError) {
      console.warn('⚠️  Preflight check failed, continuing anyway:', preflightError.message);
    }
    
    // Validate environment
    envManager.validateEnvironment();
    
    // Print startup banner
    console.log('\n🚀 ERMATE BACKEND STARTING...');
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Safe Boot: ${FEATURE_FLAGS.SAFE_BOOT ? 'ACTIVE' : 'OFF'}`);
    console.log(`🎤 Voice Services: ${FEATURE_FLAGS.VOICE_GOOGLE_ENABLED || FEATURE_FLAGS.VOICE_OPENAI_ENABLED ? 'ENABLED' : 'DISABLED'}`);
    console.log(`📊 Database: ${FEATURE_FLAGS.DATABASE_ENABLED ? 'ENABLED' : 'DISABLED'}`);
    
    // Start listening on all interfaces
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server listening on port ${PORT} (all interfaces)`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🌍 External access: http://10.211.9.25:${PORT}/health`);
      console.log(`🌍 Environment info: http://localhost:${PORT}/whoami-env`);
      
      if (FEATURE_FLAGS.SAFE_BOOT) {
        console.log('🛡️  Running in SAFE_BOOT mode - limited functionality');
      } else {
        console.log('🚀 Full services available');
      }
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app; 