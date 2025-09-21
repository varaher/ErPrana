const speech = require('@google-cloud/speech');
const { getServiceConfig, isServiceEnabled } = require('../../config/voice');

/**
 * Google Speech-to-Text Service
 * Uses Google Cloud Speech-to-Text API
 */
class GoogleSTTService {
  constructor() {
    this.config = getServiceConfig('google');
    this.audioConfig = getServiceConfig('audio');
    
    if (!isServiceEnabled('google')) {
      throw new Error('Google Speech-to-Text service is not enabled');
    }

    // Initialize Google Cloud client
    if (this.config.credentialsPath) {
      // Use service account credentials file
      this.client = new speech.SpeechClient({
        keyFilename: this.config.credentialsPath
      });
    } else if (this.config.apiKey) {
      // Use API key (for limited access)
      this.client = new speech.SpeechClient({
        apiKey: this.config.apiKey
      });
    } else {
      throw new Error('Google Cloud credentials not configured');
    }
  }

  /**
   * Transcribe audio using Google Speech-to-Text
   * @param {Buffer|string} audioData - Audio data as buffer or base64 string
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribe(audioData, options = {}) {
    try {
      // Validate audio data
      if (!audioData) {
        throw new Error('Audio data is required');
      }

      // Prepare audio data
      let audioContent;
      if (typeof audioData === 'string') {
        // Handle base64 string
        if (audioData.startsWith('data:')) {
          // Remove data URL prefix
          audioContent = audioData.split(',')[1];
        } else {
          // Assume it's already base64
          audioContent = audioData;
        }
      } else if (Buffer.isBuffer(audioData)) {
        // Convert buffer to base64
        audioContent = audioData.toString('base64');
      } else {
        throw new Error('Invalid audio data format');
      }

      // Validate audio size
      const audioSize = Buffer.byteLength(audioContent, 'base64');
      if (audioSize > this.audioConfig.maxSize) {
        throw new Error(`Audio file too large. Maximum size: ${this.audioConfig.maxSize} bytes`);
      }

      // Prepare request configuration
      const request = {
        audio: {
          content: audioContent
        },
        config: {
          encoding: options.encoding || this.config.speech.encoding,
          sampleRateHertz: options.sampleRateHertz || this.config.speech.sampleRateHertz,
          languageCode: options.languageCode || this.config.speech.languageCode,
          enableAutomaticPunctuation: options.enableAutomaticPunctuation !== undefined 
            ? options.enableAutomaticPunctuation 
            : this.config.speech.enableAutomaticPunctuation,
          enableWordTimeOffsets: options.enableWordTimeOffsets !== undefined 
            ? options.enableWordTimeOffsets 
            : this.config.speech.enableWordTimeOffsets,
          enableWordConfidence: options.enableWordConfidence !== undefined 
            ? options.enableWordConfidence 
            : this.config.speech.enableWordConfidence,
          model: options.model || this.config.speech.model,
          useEnhanced: options.useEnhanced || false,
          speechContexts: options.speechContexts || []
        }
      };

      // Call Google Speech-to-Text API
      const [response] = await this.client.recognize(request);

      if (!response.results || response.results.length === 0) {
        return {
          text: '',
          language: options.languageCode || this.config.speech.languageCode,
          confidence: 0,
          alternatives: [],
          timestamp: new Date().toISOString()
        };
      }

      // Process results
      const result = response.results[0];
      const alternative = result.alternatives[0];

      return {
        text: alternative.transcript,
        language: options.languageCode || this.config.speech.languageCode,
        confidence: alternative.confidence || 0,
        isFinal: result.isFinal !== undefined ? result.isFinal : true,
        alternatives: response.results.map(r => ({
          text: r.alternatives[0].transcript,
          confidence: r.alternatives[0].confidence || 0,
          isFinal: r.isFinal !== undefined ? r.isFinal : true
        })),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Google STT transcription error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Start streaming recognition session
   * @param {Object} options - Recognition options
   * @returns {Promise<Object>} Streaming session info
   */
  async startStreamingRecognition(options = {}) {
    try {
      // Prepare recognition config
      const config = {
        encoding: options.encoding || this.config.speech.encoding,
        sampleRateHertz: options.sampleRateHertz || this.config.speech.sampleRateHertz,
        languageCode: options.languageCode || this.config.speech.languageCode,
        enableAutomaticPunctuation: options.enableAutomaticPunctuation !== undefined 
          ? options.enableAutomaticPunctuation 
          : this.config.speech.enableAutomaticPunctuation,
        enableWordTimeOffsets: options.enableWordTimeOffsets !== undefined 
          ? options.enableWordTimeOffsets 
          : this.config.speech.enableWordTimeOffsets,
        enableWordConfidence: options.enableWordConfidence !== undefined 
          ? options.enableWordConfidence 
          : this.config.speech.enableWordConfidence,
        model: options.model || this.config.speech.model,
        useEnhanced: options.useEnhanced || false,
        speechContexts: options.speechContexts || []
      };

      // Generate session token (for future streaming implementation)
      const sessionToken = this.generateSessionToken();

      return {
        sessionToken,
        config,
        status: 'ready',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to start streaming recognition:', error);
      throw new Error(`Streaming recognition failed: ${error.message}`);
    }
  }

  /**
   * Process audio chunk in streaming mode
   * @param {Buffer} audioChunk - Audio chunk data
   * @param {string} sessionToken - Session token
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Partial result
   */
  async processStreamingChunk(audioChunk, sessionToken, options = {}) {
    try {
      // For now, process each chunk individually
      // In a full implementation, this would maintain streaming state
      return await this.transcribe(audioChunk, {
        ...options,
        encoding: 'WEBM_OPUS', // Streaming typically uses smaller chunks
        sampleRateHertz: 48000
      });
    } catch (error) {
      console.error('Streaming chunk processing error:', error);
      throw new Error(`Chunk processing failed: ${error.message}`);
    }
  }

  /**
   * Get supported languages
   * @returns {Promise<Array>} List of supported languages
   */
  async getSupportedLanguages() {
    try {
      // Google STT supports many languages
      // Return common ones for now
      return [
        { code: 'en-US', name: 'English (US)', nativeName: 'English (US)' },
        { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)' },
        { code: 'en-AU', name: 'English (Australia)', nativeName: 'English (Australia)' },
        { code: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español (España)' },
        { code: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)' },
        { code: 'fr-FR', name: 'French (France)', nativeName: 'Français (France)' },
        { code: 'de-DE', name: 'German (Germany)', nativeName: 'Deutsch (Deutschland)' },
        { code: 'it-IT', name: 'Italian (Italy)', nativeName: 'Italiano (Italia)' },
        { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)' },
        { code: 'ru-RU', name: 'Russian (Russia)', nativeName: 'Русский (Россия)' },
        { code: 'ja-JP', name: 'Japanese (Japan)', nativeName: '日本語 (日本)' },
        { code: 'ko-KR', name: 'Korean (South Korea)', nativeName: '한국어 (대한민국)' },
        { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '中文 (简体)' },
        { code: 'hi-IN', name: 'Hindi (India)', nativeName: 'हिन्दी (भारत)' },
        { code: 'ar-SA', name: 'Arabic (Saudi Arabia)', nativeName: 'العربية (المملكة العربية السعودية)' }
      ];
    } catch (error) {
      console.error('Error getting supported languages:', error);
      throw new Error(`Failed to get supported languages: ${error.message}`);
    }
  }

  /**
   * Get supported models
   * @returns {Promise<Array>} List of supported models
   */
  async getSupportedModels() {
    try {
      return [
        {
          id: 'latest_long',
          name: 'Latest Long Audio Model',
          description: 'Best for long audio files and high accuracy'
        },
        {
          id: 'latest_short',
          name: 'Latest Short Audio Model',
          description: 'Optimized for short audio clips'
        },
        {
          id: 'command_and_search',
          name: 'Command and Search',
          description: 'Best for short queries and commands'
        },
        {
          id: 'phone_call',
          name: 'Phone Call',
          description: 'Optimized for phone call audio'
        },
        {
          id: 'video',
          name: 'Video',
          description: 'Best for video content'
        }
      ];
    } catch (error) {
      console.error('Error getting supported models:', error);
      throw new Error(`Failed to get supported models: ${error.message}`);
    }
  }

  /**
   * Check if service is available
   * @returns {Promise<boolean>} Service availability
   */
  async isAvailable() {
    try {
      if (!isServiceEnabled('google')) {
        return false;
      }

      // Test API connection with a simple request
      const testRequest = {
        audio: {
          content: Buffer.from('test').toString('base64')
        },
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'en-US'
        }
      };

      await this.client.recognize(testRequest);
      return true;
    } catch (error) {
      console.error('Google STT service availability check failed:', error);
      return false;
    }
  }

  /**
   * Generate session token for streaming
   * @returns {string} Session token
   */
  generateSessionToken() {
    return `gstt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service configuration
   * @returns {Object} Service configuration
   */
  getConfig() {
    return {
      enabled: isServiceEnabled('google'),
      projectId: this.config.projectId,
      encoding: this.config.speech.encoding,
      sampleRateHertz: this.config.speech.sampleRateHertz,
      maxAudioSize: this.audioConfig.maxSize,
      supportedFormats: this.audioConfig.supportedFormats
    };
  }
}

module.exports = GoogleSTTService;
