const OpenAI = require('openai');
const { getServiceConfig, isServiceEnabled } = require('../../config/voice');
const fs = require('fs');
const path = require('path');

/**
 * Whisper Service for speech-to-text transcription
 * Uses OpenAI's Whisper API
 */
class WhisperService {
  constructor() {
    this.config = getServiceConfig('openai');
    this.audioConfig = getServiceConfig('audio');
    
    if (!isServiceEnabled('openai')) {
      throw new Error('OpenAI Whisper service is not enabled');
    }

    this.openai = new OpenAI({
      apiKey: this.config.apiKey
    });
  }

  /**
   * Transcribe audio using Whisper API
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
      let audioBuffer;
      if (typeof audioData === 'string') {
        // Handle base64 string
        if (audioData.startsWith('data:')) {
          // Remove data URL prefix
          const base64Data = audioData.split(',')[1];
          audioBuffer = Buffer.from(base64Data, 'base64');
        } else {
          // Assume it's already base64
          audioBuffer = Buffer.from(audioData, 'base64');
        }
      } else if (Buffer.isBuffer(audioData)) {
        audioBuffer = audioData;
      } else {
        throw new Error('Invalid audio data format');
      }

      // Validate audio size
      if (audioBuffer.length > this.audioConfig.maxSize) {
        throw new Error(`Audio file too large. Maximum size: ${this.audioConfig.maxSize} bytes`);
      }

      // Create temporary file for OpenAI API
      const tempFile = await this.createTempFile(audioBuffer);
      
      try {
        // Call OpenAI Whisper API
        const transcription = await this.openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFile),
          model: options.model || this.config.model,
          language: options.language,
          response_format: options.responseFormat || this.config.responseFormat,
          temperature: options.temperature || this.config.temperature,
          prompt: options.prompt // Optional context prompt
        });

        // Clean up temp file
        await this.cleanupTempFile(tempFile);

        return {
          text: transcription.text,
          language: options.language || 'auto',
          model: options.model || this.config.model,
          confidence: transcription.confidence || null,
          duration: transcription.duration || null,
          timestamp: new Date().toISOString()
        };

      } catch (apiError) {
        // Clean up temp file on error
        await this.cleanupTempFile(tempFile);
        throw apiError;
      }

    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Transcribe audio chunk for streaming
   * @param {Buffer} audioChunk - Audio chunk data
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Partial transcription result
   */
  async transcribeChunk(audioChunk, options = {}) {
    try {
      // For streaming, we might want to accumulate chunks
      // For now, process each chunk individually
      return await this.transcribe(audioChunk, {
        ...options,
        model: 'whisper-1' // Use base model for chunks
      });
    } catch (error) {
      console.error('Whisper chunk transcription error:', error);
      throw new Error(`Chunk transcription failed: ${error.message}`);
    }
  }

  /**
   * Detect language from audio
   * @param {Buffer} audioData - Audio data
   * @returns {Promise<string>} Detected language code
   */
  async detectLanguage(audioData) {
    try {
      // Use Whisper with language detection
      const result = await this.transcribe(audioData, {
        language: null, // Let Whisper detect language
        model: 'whisper-1'
      });

      // Extract language from result if available
      // Note: Whisper doesn't always return language info
      return result.language || 'unknown';
    } catch (error) {
      console.error('Language detection error:', error);
      throw new Error(`Language detection failed: ${error.message}`);
    }
  }

  /**
   * Get supported models
   * @returns {Promise<Array>} List of supported models
   */
  async getSupportedModels() {
    try {
      const models = await this.openai.models.list();
      return models.data
        .filter(model => model.id.includes('whisper'))
        .map(model => ({
          id: model.id,
          name: model.id,
          description: 'OpenAI Whisper model for speech recognition'
        }));
    } catch (error) {
      console.error('Error fetching Whisper models:', error);
      // Return default models
      return [
        {
          id: 'whisper-1',
          name: 'whisper-1',
          description: 'OpenAI Whisper model for speech recognition'
        }
      ];
    }
  }

  /**
   * Check if service is available
   * @returns {Promise<boolean>} Service availability
   */
  async isAvailable() {
    try {
      if (!isServiceEnabled('openai')) {
        return false;
      }

      // Test API connection
      await this.openai.models.list();
      return true;
    } catch (error) {
      console.error('Whisper service availability check failed:', error);
      return false;
    }
  }

  /**
   * Create temporary file for audio processing
   * @param {Buffer} audioBuffer - Audio data
   * @returns {Promise<string>} Temporary file path
   */
  async createTempFile(audioBuffer) {
    return new Promise((resolve, reject) => {
      const tempDir = this.audioConfig.tempDir;
      const filename = `whisper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`;
      const filepath = path.join(tempDir, filename);

      fs.writeFile(filepath, audioBuffer, (err) => {
        if (err) {
          reject(new Error(`Failed to create temp file: ${err.message}`));
        } else {
          resolve(filepath);
        }
      });
    });
  }

  /**
   * Clean up temporary file
   * @param {string} filepath - File path to remove
   * @returns {Promise<void>}
   */
  async cleanupTempFile(filepath) {
    return new Promise((resolve) => {
      fs.unlink(filepath, (err) => {
        if (err) {
          console.warn(`Failed to cleanup temp file ${filepath}:`, err);
        }
        resolve();
      });
    });
  }

  /**
   * Get service configuration
   * @returns {Object} Service configuration
   */
  getConfig() {
    return {
      enabled: isServiceEnabled('openai'),
      model: this.config.model,
      maxAudioSize: this.audioConfig.maxSize,
      supportedFormats: this.audioConfig.supportedFormats
    };
  }
}

module.exports = WhisperService;
