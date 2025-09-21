const WebSocket = require('ws');
const { getServiceConfig, isServiceEnabled } = require('../../config/voice');
const WhisperService = require('./whisperService');
const GoogleSTTService = require('./googleSttService');
const GoogleTTSService = require('./googleTtsService');
const GoogleTranslateService = require('./translateService');
const { validateEmergencyToken } = require('../../middleware/emergencyAuth');

class VoiceWebSocketService {
  constructor() {
    this.wss = null;
    this.connections = new Map(); // Map to track active connections
    this.whisperService = new WhisperService();
    this.googleSTTService = new GoogleSTTService();
    this.googleTTSService = new GoogleTTSService();
    this.googleTranslateService = new GoogleTranslateService();
  }

  initialize(server) {
    const config = getServiceConfig('websocket');
    
    this.wss = new WebSocket.Server({
      server,
      path: '/api/voice/stream',
      maxPayload: config.maxPayload || 10485760, // 10MB default
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    
    console.log('Voice WebSocket service initialized on /api/voice/stream');
  }

  handleConnection(ws, req) {
    const connectionId = this.generateConnectionId();
    const connection = {
      id: connectionId,
      ws,
      authenticated: false,
      userId: null,
      emergencyToken: null,
      sessionToken: null,
      currentMode: 'whisper', // Default mode
      language: 'en',
      isStreaming: false,
      audioBuffer: [],
      lastActivity: Date.now(),
    };

    this.connections.set(connectionId, connection);

    // Set up connection event handlers
    ws.on('message', (data) => this.handleMessage(connectionId, data));
    ws.on('close', () => this.handleDisconnection(connectionId));
    ws.on('error', (error) => this.handleError(connectionId, error));

    // Send welcome message
    this.sendMessage(connectionId, {
      type: 'connection_established',
      connectionId,
      timestamp: Date.now(),
      message: 'Voice WebSocket connection established'
    });

    // Set up ping/pong for connection health
    this.setupHeartbeat(connectionId);

    console.log(`Voice WebSocket connection established: ${connectionId}`);
  }

  async handleMessage(connectionId, data) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;

      // Update last activity
      connection.lastActivity = Date.now();

      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'authenticate':
          await this.handleAuthentication(connectionId, message);
          break;
        case 'start_streaming':
          await this.handleStartStreaming(connectionId, message);
          break;
        case 'audio_chunk':
          await this.handleAudioChunk(connectionId, message);
          break;
        case 'stop_streaming':
          await this.handleStopStreaming(connectionId);
          break;
        case 'speak':
          await this.handleSpeak(connectionId, message);
          break;
        case 'translate':
          await this.handleTranslate(connectionId, message);
          break;
        case 'ping':
          this.sendMessage(connectionId, { type: 'pong', timestamp: Date.now() });
          break;
        default:
          this.sendMessage(connectionId, {
            type: 'error',
            error: 'Unknown message type',
            messageType: message.type
          });
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.sendMessage(connectionId, {
        type: 'error',
        error: 'Failed to process message',
        details: error.message
      });
    }
  }

  async handleAuthentication(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      let authenticated = false;
      let userId = null;

      if (message.token) {
        // Regular JWT authentication
        // This would need to be implemented based on your JWT verification logic
        // For now, we'll assume it's valid
        authenticated = true;
        userId = message.userId || 'user_' + Date.now();
      } else if (message.emergencyToken) {
        // Emergency token authentication
        const isValid = validateEmergencyToken(message.emergencyToken);
        if (isValid) {
          authenticated = true;
          connection.emergencyToken = message.emergencyToken;
          userId = 'emergency_' + Date.now();
        }
      }

      if (authenticated) {
        connection.authenticated = true;
        connection.userId = userId;
        
        this.sendMessage(connectionId, {
          type: 'authentication_success',
          userId,
          timestamp: Date.now()
        });
      } else {
        this.sendMessage(connectionId, {
          type: 'authentication_failed',
          error: 'Invalid authentication token',
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.sendMessage(connectionId, {
        type: 'authentication_failed',
        error: 'Authentication failed',
        details: error.message
      });
    }
  }

  async handleStartStreaming(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    if (!connection.authenticated) {
      this.sendMessage(connectionId, {
        type: 'error',
        error: 'Authentication required before streaming'
      });
      return;
    }

    try {
      connection.isStreaming = true;
      connection.currentMode = message.mode || 'whisper';
      connection.language = message.language || 'en';
      connection.audioBuffer = [];
      
      // Generate session token for streaming
      connection.sessionToken = this.generateSessionToken();

      this.sendMessage(connectionId, {
        type: 'streaming_started',
        mode: connection.currentMode,
        language: connection.language,
        sessionToken: connection.sessionToken,
        timestamp: Date.now()
      });

      console.log(`Streaming started for connection ${connectionId} in ${connection.currentMode} mode`);
    } catch (error) {
      console.error('Error starting streaming:', error);
      this.sendMessage(connectionId, {
        type: 'error',
        error: 'Failed to start streaming',
        details: error.message
      });
    }
  }

  async handleAudioChunk(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isStreaming) return;

    try {
      // Add audio chunk to buffer
      connection.audioBuffer.push(message.audio);

      // Process audio based on mode
      if (connection.currentMode === 'whisper') {
        await this.processWhisperChunk(connectionId, message.audio);
      } else if (connection.currentMode === 'google') {
        await this.processGoogleChunk(connectionId, message.audio);
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error);
      this.sendMessage(connectionId, {
        type: 'error',
        error: 'Failed to process audio chunk',
        details: error.message
      });
    }
  }

  async processWhisperChunk(connectionId, audioData) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      // Process with Whisper service
      const result = await this.whisperService.transcribeChunk(audioBuffer, {
        language: connection.language,
        model: 'whisper-1'
      });

      if (result.text) {
        this.sendMessage(connectionId, {
          type: 'transcription',
          text: result.text,
          language: result.language || connection.language,
          confidence: result.confidence,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Whisper processing error:', error);
      this.sendMessage(connectionId, {
        type: 'error',
        error: 'Whisper processing failed',
        details: error.message
      });
    }
  }

  async processGoogleChunk(connectionId, audioData) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      // Process with Google STT service
      const result = await this.googleSTTService.processStreamingChunk(
        audioBuffer,
        connection.sessionToken,
        {
          languageCode: connection.language,
          enableAutomaticPunctuation: true
        }
      );

      if (result.text) {
        this.sendMessage(connectionId, {
          type: 'transcription',
          text: result.text,
          language: result.languageCode || connection.language,
          confidence: result.confidence,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Google STT processing error:', error);
      this.sendMessage(connectionId, {
        type: 'error',
        error: 'Google STT processing failed',
        details: error.message
      });
    }
  }

  async handleSpeak(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.authenticated) return;

    try {
      const result = await this.googleTTSService.synthesize(message.text, {
        languageCode: message.language || connection.language,
        voiceId: message.voiceId,
        audioEncoding: 'MP3'
      });

      // Send audio data back to client
      this.sendMessage(connectionId, {
        type: 'speech_synthesized',
        audio: result.audioContent,
        format: 'MP3',
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('TTS error:', error);
      this.sendMessage(connectionId, {
        type: 'error',
        error: 'Text-to-speech failed',
        details: error.message
      });
    }
  }

  async handleTranslate(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.authenticated) return;

    try {
      const result = await this.googleTranslateService.translate(message.text, {
        from: message.from,
        to: message.to || connection.language
      });

      this.sendMessage(connectionId, {
        type: 'translation',
        originalText: message.text,
        translatedText: result.text,
        fromLanguage: result.from,
        toLanguage: result.to,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Translation error:', error);
      this.sendMessage(connectionId, {
        type: 'error',
        error: 'Translation failed',
        details: error.message
      });
    }
  }

  async handleStopStreaming(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      connection.isStreaming = false;
      connection.audioBuffer = [];
      
      this.sendMessage(connectionId, {
        type: 'streaming_stopped',
        timestamp: Date.now()
      });

      console.log(`Streaming stopped for connection ${connectionId}`);
    } catch (error) {
      console.error('Error stopping streaming:', error);
    }
  }

  handleDisconnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Clean up any ongoing processes
      if (connection.isStreaming) {
        this.handleStopStreaming(connectionId);
      }
      
      this.connections.delete(connectionId);
      console.log(`Voice WebSocket connection closed: ${connectionId}`);
    }
  }

  handleError(connectionId, error) {
    console.error(`WebSocket error for connection ${connectionId}:`, error);
    this.sendMessage(connectionId, {
      type: 'error',
      error: 'WebSocket error occurred',
      details: error.message
    });
  }

  sendMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  }

  setupHeartbeat(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const heartbeat = setInterval(() => {
      if (connection.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(connectionId, { type: 'ping', timestamp: Date.now() });
      } else {
        clearInterval(heartbeat);
        this.connections.delete(connectionId);
      }
    }, 30000); // 30 second heartbeat

    // Store heartbeat interval for cleanup
    connection.heartbeat = heartbeat;
  }

  generateConnectionId() {
    return 'conn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  generateSessionToken() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getConnectionStats() {
    const stats = {
      totalConnections: this.connections.size,
      authenticatedConnections: 0,
      streamingConnections: 0,
      connections: []
    };

    for (const [id, connection] of this.connections) {
      if (connection.authenticated) stats.authenticatedConnections++;
      if (connection.isStreaming) stats.streamingConnections++;
      
      stats.connections.push({
        id,
        authenticated: connection.authenticated,
        streaming: connection.isStreaming,
        mode: connection.currentMode,
        language: connection.language,
        lastActivity: connection.lastActivity
      });
    }

    return stats;
  }

  broadcast(message, filter = null) {
    for (const [connectionId, connection] of this.connections) {
      if (filter && !filter(connection)) continue;
      this.sendMessage(connectionId, message);
    }
  }

  shutdown() {
    if (this.wss) {
      this.wss.close(() => {
        console.log('Voice WebSocket service shut down');
      });
    }
    
    // Clear all connections
    this.connections.clear();
  }
}

module.exports = VoiceWebSocketService;
