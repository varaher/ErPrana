const textToSpeech = require('@google-cloud/text-to-speech');
const { getServiceConfig, isServiceEnabled } = require('../../config/voice');
const fs = require('fs');
const path = require('path');

/**
 * Google Text-to-Speech Service
 * Uses Google Cloud Text-to-Speech API
 */
class GoogleTTSService {
  constructor() {
    this.config = getServiceConfig('google');
    this.ttsConfig = getServiceConfig('tts');
    
    if (!isServiceEnabled('google')) {
      throw new Error('Google Text-to-Speech service is not enabled');
    }

    // Initialize Google Cloud client
    if (this.config.credentialsPath) {
      // Use service account credentials file
      this.client = new textToSpeech.TextToSpeechClient({
        keyFilename: this.config.credentialsPath
      });
    } else if (this.config.apiKey) {
      // Use API key (for limited access)
      this.client = new textToSpeech.TextToSpeechClient({
        apiKey: this.config.apiKey
      });
    } else {
      throw new Error('Google Cloud credentials not configured');
    }
  }

  /**
   * Synthesize speech from text
   * @param {string} text - Text to synthesize
   * @param {Object} options - Synthesis options
   * @returns {Promise<Object>} Synthesis result
   */
  async synthesize(text, options = {}) {
    try {
      // Validate input
      if (!text || typeof text !== 'string') {
        throw new Error('Text input is required and must be a string');
      }

      if (text.length > 5000) {
        throw new Error('Text too long. Maximum length: 5000 characters');
      }

      // Prepare synthesis request
      const request = {
        input: {
          text: text
        },
        voice: {
          languageCode: options.languageCode || this.config.tts.voice.split('-')[0] + '-' + this.config.tts.voice.split('-')[1],
          name: options.voiceName || this.config.tts.voice,
          ssmlGender: options.ssmlGender || 'NEUTRAL'
        },
        audioConfig: {
          audioEncoding: options.audioEncoding || this.config.tts.audioEncoding,
          speakingRate: options.speakingRate || this.config.tts.speakingRate,
          pitch: options.pitch || this.config.tts.pitch,
          effectsProfileId: options.effectsProfileId || this.config.tts.effectsProfileId,
          volumeGainDb: options.volumeGainDb || 0
        }
      };

      // Call Google TTS API
      const [response] = await this.client.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content received from TTS API');
      }

      // Convert audio content to base64
      const audioBase64 = response.audioContent.toString('base64');

      // Return result based on configuration
      if (this.ttsConfig.returnBase64) {
        return {
          text: text,
          audio: audioBase64,
          format: options.audioEncoding || this.config.tts.audioEncoding,
          language: options.languageCode || this.config.tts.voice.split('-')[0] + '-' + this.config.tts.voice.split('-')[1],
          voice: options.voiceName || this.config.tts.voice,
          timestamp: new Date().toISOString()
        };
      } else {
        // Save to temporary file and return file path
        const tempFile = await this.saveAudioToFile(response.audioContent, options.audioEncoding || this.config.tts.audioEncoding);
        
        return {
          text: text,
          audioFile: tempFile,
          format: options.audioEncoding || this.config.tts.audioEncoding,
          language: options.languageCode || this.config.tts.voice.split('-')[0] + '-' + this.config.tts.voice.split('-')[1],
          voice: options.voiceName || this.config.tts.voice,
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      console.error('Google TTS synthesis error:', error);
      throw new Error(`Speech synthesis failed: ${error.message}`);
    }
  }

  /**
   * Synthesize speech from SSML
   * @param {string} ssml - SSML markup
   * @param {Object} options - Synthesis options
   * @returns {Promise<Object>} Synthesis result
   */
  async synthesizeSSML(ssml, options = {}) {
    try {
      // Validate SSML input
      if (!ssml || typeof ssml !== 'string') {
        throw new Error('SSML input is required and must be a string');
      }

      if (ssml.length > 5000) {
        throw new Error('SSML too long. Maximum length: 5000 characters');
      }

      // Prepare synthesis request
      const request = {
        input: {
          ssml: ssml
        },
        voice: {
          languageCode: options.languageCode || this.config.tts.voice.split('-')[0] + '-' + this.config.tts.voice.split('-')[1],
          name: options.voiceName || this.config.tts.voice,
          ssmlGender: options.ssmlGender || 'NEUTRAL'
        },
        audioConfig: {
          audioEncoding: options.audioEncoding || this.config.tts.audioEncoding,
          speakingRate: options.speakingRate || this.config.tts.speakingRate,
          pitch: options.pitch || this.config.tts.pitch,
          effectsProfileId: options.effectsProfileId || this.config.tts.effectsProfileId,
          volumeGainDb: options.volumeGainDb || 0
        }
      };

      // Call Google TTS API
      const [response] = await this.client.synthesizeSpeech(request);

      if (!response.audioContent) {
        throw new Error('No audio content received from TTS API');
      }

      // Convert audio content to base64
      const audioBase64 = response.audioContent.toString('base64');

      // Return result based on configuration
      if (this.ttsConfig.returnBase64) {
        return {
          ssml: ssml,
          audio: audioBase64,
          format: options.audioEncoding || this.config.tts.audioEncoding,
          language: options.languageCode || this.config.tts.voice.split('-')[0] + '-' + this.config.tts.voice.split('-')[1],
          voice: options.voiceName || this.config.tts.voice,
          timestamp: new Date().toISOString()
        };
      } else {
        // Save to temporary file and return file path
        const tempFile = await this.saveAudioToFile(response.audioContent, options.audioEncoding || this.config.tts.audioEncoding);
        
        return {
          ssml: ssml,
          audioFile: tempFile,
          format: options.audioEncoding || this.config.tts.audioEncoding,
          language: options.languageCode || this.config.tts.voice.split('-')[0] + '-' + this.config.tts.voice.split('-')[1],
          voice: options.voiceName || this.config.tts.voice,
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      console.error('Google TTS SSML synthesis error:', error);
      throw new Error(`SSML synthesis failed: ${error.message}`);
    }
  }

  /**
   * Get available voices
   * @param {string} languageCode - Language code to filter voices
   * @returns {Promise<Array>} List of available voices
   */
  async getVoices(languageCode = null) {
    try {
      const request = {
        languageCode: languageCode
      };

      const [response] = await this.client.listVoices(request);

      if (!response.voices) {
        return [];
      }

      return response.voices.map(voice => ({
        name: voice.name,
        languageCodes: voice.languageCodes,
        ssmlGender: voice.ssmlGender,
        naturalSampleRateHertz: voice.naturalSampleRateHertz
      }));

    } catch (error) {
      console.error('Error getting voices:', error);
      throw new Error(`Failed to get voices: ${error.message}`);
    }
  }

  /**
   * Get supported languages
   * @returns {Promise<Array>} List of supported languages
   */
  async getSupportedLanguages() {
    try {
      const voices = await this.getVoices();
      const languages = new Set();

      voices.forEach(voice => {
        voice.languageCodes.forEach(code => {
          languages.add(code);
        });
      });

      return Array.from(languages).map(code => ({
        code: code,
        name: this.getLanguageName(code),
        nativeName: this.getNativeLanguageName(code)
      }));

    } catch (error) {
      console.error('Error getting supported languages:', error);
      throw new Error(`Failed to get supported languages: ${error.message}`);
    }
  }

  /**
   * Get WaveNet voices
   * @returns {Promise<Array>} List of WaveNet voices
   */
  async getWaveNetVoices() {
    try {
      const voices = await this.getVoices();
      return voices.filter(voice => voice.name.includes('Wavenet'));
    } catch (error) {
      console.error('Error getting WaveNet voices:', error);
      throw new Error(`Failed to get WaveNet voices: ${error.message}`);
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

      // Test API connection by getting voices
      await this.getVoices();
      return true;
    } catch (error) {
      console.error('Google TTS service availability check failed:', error);
      return false;
    }
  }

  /**
   * Save audio content to temporary file
   * @param {Buffer} audioContent - Audio content buffer
   * @param {string} format - Audio format
   * @returns {Promise<string>} Temporary file path
   */
  async saveAudioToFile(audioContent, format = 'MP3') {
    return new Promise((resolve, reject) => {
      const tempDir = this.ttsConfig.tempDir || '/tmp';
      const extension = format.toLowerCase();
      const filename = `tts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${extension}`;
      const filepath = path.join(tempDir, filename);

      fs.writeFile(filepath, audioContent, (err) => {
        if (err) {
          reject(new Error(`Failed to save audio file: ${err.message}`));
        } else {
          resolve(filepath);
        }
      });
    });
  }

  /**
   * Get language name from code
   * @param {string} code - Language code
   * @returns {string} Language name
   */
  getLanguageName(code) {
    const languageNames = {
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'es-ES': 'Spanish (Spain)',
      'fr-FR': 'French (France)',
      'de-DE': 'German (Germany)',
      'it-IT': 'Italian (Italy)',
      'pt-BR': 'Portuguese (Brazil)',
      'ru-RU': 'Russian (Russia)',
      'ja-JP': 'Japanese (Japan)',
      'ko-KR': 'Korean (South Korea)',
      'zh-CN': 'Chinese (Simplified)',
      'hi-IN': 'Hindi (India)',
      'ar-SA': 'Arabic (Saudi Arabia)'
    };
    return languageNames[code] || code;
  }

  /**
   * Get native language name from code
   * @param {string} code - Language code
   * @returns {string} Native language name
   */
  getNativeLanguageName(code) {
    const nativeNames = {
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'es-ES': 'Español (España)',
      'fr-FR': 'Français (France)',
      'de-DE': 'Deutsch (Deutschland)',
      'it-IT': 'Italiano (Italia)',
      'pt-BR': 'Português (Brasil)',
      'ru-RU': 'Русский (Россия)',
      'ja-JP': '日本語 (日本)',
      'ko-KR': '한국어 (대한민국)',
      'zh-CN': '中文 (简体)',
      'hi-IN': 'हिन्दी (भारत)',
      'ar-SA': 'العربية (المملكة العربية السعودية)'
    };
    return nativeNames[code] || code;
  }

  /**
   * Get service configuration
   * @returns {Object} Service configuration
   */
  getConfig() {
    return {
      enabled: isServiceEnabled('google'),
      projectId: this.config.projectId,
      defaultVoice: this.config.tts.voice,
      audioEncoding: this.config.tts.audioEncoding,
      returnBase64: this.ttsConfig.returnBase64,
      maxTextLength: 5000
    };
  }
}

module.exports = GoogleTTSService;
