const { Translate } = require('@google-cloud/translate');
const { getServiceConfig, isServiceEnabled } = require('../../config/voice');

class GoogleTranslateService {
  constructor() {
    this.config = getServiceConfig('google');
    this.translateClient = null;
    this.initializeClient();
  }

  initializeClient() {
    if (!isServiceEnabled('google')) {
      console.log('Google Translate service is disabled');
      return;
    }

    try {
      if (this.config.credentialsPath) {
        // Use service account credentials
        this.translateClient = new Translate({
          projectId: this.config.projectId,
          keyFilename: this.config.credentialsPath
        });
      } else if (this.config.apiKey) {
        // Use API key
        this.translateClient = new Translate({
          projectId: this.config.projectId,
          key: this.config.apiKey
        });
      } else {
        console.warn('Google Translate: No credentials provided');
      }
    } catch (error) {
      console.error('Failed to initialize Google Translate client:', error);
    }
  }

  async translate(text, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Google Translate service is not available');
    }

    const {
      from = 'auto',
      to = 'en',
      format = 'text'
    } = options;

    try {
      const [translation] = await this.translateClient.translate(text, {
        from: from === 'auto' ? undefined : from,
        to,
        format
      });

      return {
        translatedText: translation,
        detectedLanguage: from === 'auto' ? await this.detectLanguage(text) : from,
        sourceLanguage: from === 'auto' ? await this.detectLanguage(text) : from,
        targetLanguage: to,
        originalText: text
      };
    } catch (error) {
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  async detectLanguage(text) {
    if (!this.isAvailable()) {
      throw new Error('Google Translate service is not available');
    }

    try {
      const [detection] = await this.translateClient.detect(text);
      return detection.language;
    } catch (error) {
      throw new Error(`Language detection failed: ${error.message}`);
    }
  }

  async getSupportedLanguages(targetLanguage = 'en') {
    if (!this.isAvailable()) {
      throw new Error('Google Translate service is not available');
    }

    try {
      const [languages] = await this.translateClient.getLanguages(targetLanguage);
      return languages.map(lang => ({
        code: lang.code,
        name: lang.name,
        nativeName: lang.name
      }));
    } catch (error) {
      throw new Error(`Failed to get supported languages: ${error.message}`);
    }
  }

  async batchTranslate(texts, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('Google Translate service is not available');
    }

    const {
      from = 'auto',
      to = 'en',
      format = 'text'
    } = options;

    try {
      const [translations] = await this.translateClient.translate(texts, {
        from: from === 'auto' ? undefined : from,
        to,
        format
      });

      return translations.map((translation, index) => ({
        translatedText: translation,
        originalText: texts[index],
        detectedLanguage: from === 'auto' ? undefined : from,
        sourceLanguage: from === 'auto' ? undefined : from,
        targetLanguage: to
      }));
    } catch (error) {
      throw new Error(`Batch translation failed: ${error.message}`);
    }
  }

  async isAvailable() {
    return isServiceEnabled('google') && this.translateClient !== null;
  }

  getConfig() {
    return {
      enabled: isServiceEnabled('google'),
      projectId: this.config.projectId,
      hasCredentials: !!(this.config.credentialsPath || this.config.apiKey),
      clientInitialized: this.translateClient !== null
    };
  }

  // Utility methods for language handling
  getLanguageName(code) {
    const languageNames = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish',
      'pl': 'Polish',
      'tr': 'Turkish',
      'he': 'Hebrew',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'id': 'Indonesian',
      'ms': 'Malay',
      'fa': 'Persian',
      'ur': 'Urdu',
      'bn': 'Bengali',
      'ta': 'Tamil',
      'te': 'Telugu',
      'gu': 'Gujarati',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'pa': 'Punjabi',
      'or': 'Odia',
      'as': 'Assamese',
      'ne': 'Nepali',
      'si': 'Sinhala',
      'my': 'Burmese',
      'km': 'Khmer',
      'lo': 'Lao',
      'ka': 'Georgian',
      'am': 'Amharic',
      'sw': 'Swahili',
      'zu': 'Zulu',
      'af': 'Afrikaans',
      'xh': 'Xhosa',
      'st': 'Southern Sotho',
      'tn': 'Tswana',
      'ts': 'Tsonga',
      've': 'Venda',
      'nr': 'Southern Ndebele',
      'ss': 'Swati',
      'sn': 'Shona',
      'ny': 'Chichewa',
      'rw': 'Kinyarwanda',
      'lg': 'Ganda',
      'ak': 'Akan',
      'yo': 'Yoruba',
      'ig': 'Igbo',
      'ha': 'Hausa',
      'so': 'Somali',
      'om': 'Oromo',
      'ti': 'Tigrinya',
      'ar': 'Arabic',
      'he': 'Hebrew',
      'fa': 'Persian',
      'ur': 'Urdu',
      'ps': 'Pashto',
      'sd': 'Sindhi',
      'ku': 'Kurdish',
      'ckb': 'Central Kurdish',
      'hy': 'Armenian',
      'ka': 'Georgian',
      'az': 'Azerbaijani',
      'kk': 'Kazakh',
      'ky': 'Kyrgyz',
      'uz': 'Uzbek',
      'tk': 'Turkmen',
      'mn': 'Mongolian',
      'bo': 'Tibetan',
      'dz': 'Dzongkha',
      'si': 'Sinhala',
      'my': 'Burmese',
      'km': 'Khmer',
      'lo': 'Lao',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'id': 'Indonesian',
      'ms': 'Malay',
      'tl': 'Tagalog',
      'ceb': 'Cebuano',
      'jv': 'Javanese',
      'su': 'Sundanese',
      'min': 'Minangkabau',
      'bug': 'Buginese',
      'ban': 'Balinese',
      'mad': 'Madurese',
      'ace': 'Acehnese',
      'gor': 'Gorontalo',
      'mak': 'Makasar',
      'bjn': 'Banjar',
      'kbd': 'Kabardian',
      'ady': 'Adyghe',
      'ab': 'Abkhaz',
      'os': 'Ossetian',
      'inh': 'Ingush',
      'ce': 'Chechen',
      'av': 'Avar',
      'lez': 'Lezgi',
      'tab': 'Tabasaran',
      'agx': 'Aghul',
      'rut': 'Rutul',
      'tsa': 'Tsakhur',
      'krc': 'Karachay-Balkar',
      'kum': 'Kumyk',
      'nog': 'Nogai',
      'crh': 'Crimean Tatar',
      'gag': 'Gagauz',
      'cjs': 'Shor',
      'alt': 'Southern Altai',
      'tyv': 'Tuvan',
      'xal': 'Kalmyk',
      'bua': 'Buriat',
      'cv': 'Chuvash',
      'udm': 'Udmurt',
      'koi': 'Komi-Permyak',
      'kpv': 'Komi-Zyrian',
      'mhr': 'Eastern Mari',
      'mrj': 'Western Mari',
      'mns': 'Mansi',
      'xan': 'Xant',
      'sel': 'Selkup',
      'kca': 'Khanty',
      'niv': 'Gilyak',
      'ket': 'Ket',
      'ykg': 'Northern Yukaghir',
      'yux': 'Southern Yukaghir',
      'chv': 'Chuvash',
      'udm': 'Udmurt',
      'koi': 'Komi-Permyak',
      'kpv': 'Komi-Zyrian',
      'mhr': 'Eastern Mari',
      'mrj': 'Western Mari',
      'mns': 'Mansi',
      'xan': 'Xant',
      'sel': 'Selkup',
      'kca': 'Khanty',
      'niv': 'Gilyak',
      'ket': 'Ket',
      'ykg': 'Northern Yukaghir',
      'yux': 'Southern Yukaghir'
    };
    return languageNames[code] || code;
  }

  getNativeLanguageName(code) {
    const nativeNames = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'it': 'Italiano',
      'pt': 'Português',
      'ru': 'Русский',
      'ja': '日本語',
      'ko': '한국어',
      'zh': '中文',
      'ar': 'العربية',
      'hi': 'हिन्दी',
      'nl': 'Nederlands',
      'sv': 'Svenska',
      'da': 'Dansk',
      'no': 'Norsk',
      'fi': 'Suomi',
      'pl': 'Polski',
      'tr': 'Türkçe',
      'he': 'עברית',
      'th': 'ไทย',
      'vi': 'Tiếng Việt',
      'id': 'Bahasa Indonesia',
      'ms': 'Bahasa Melayu',
      'fa': 'فارسی',
      'ur': 'اردو',
      'bn': 'বাংলা',
      'ta': 'தமிழ்',
      'te': 'తెలుగు',
      'gu': 'ગુજરાતી',
      'kn': 'ಕನ್ನಡ',
      'ml': 'മലയാളം',
      'pa': 'ਪੰਜਾਬੀ',
      'or': 'ଓଡ଼ିଆ',
      'as': 'অসমীয়া',
      'ne': 'नेपाली',
      'si': 'සිංහල',
      'my': 'မြန်မာ',
      'km': 'ខ្មែរ',
      'lo': 'ລາວ',
      'ka': 'ქართული',
      'am': 'አማርኛ',
      'sw': 'Kiswahili',
      'zu': 'isiZulu',
      'af': 'Afrikaans',
      'xh': 'isiXhosa',
      'st': 'Sesotho',
      'tn': 'Setswana',
      'ts': 'Xitsonga',
      've': 'Tshivenda',
      'nr': 'isiNdebele',
      'ss': 'siSwati',
      'sn': 'chiShona',
      'ny': 'Chichewa',
      'rw': 'Kinyarwanda',
      'lg': 'Luganda',
      'ak': 'Akan',
      'yo': 'Yorùbá',
      'ig': 'Igbo',
      'ha': 'Hausa',
      'so': 'Soomaali',
      'om': 'Afaan Oromoo',
      'ti': 'ትግርኛ'
    };
    return nativeNames[code] || this.getLanguageName(code);
  }

  isRTL(code) {
    const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ku', 'ckb'];
    return rtlLanguages.includes(code);
  }

  getLanguageFamily(code) {
    const families = {
      'en': 'Germanic',
      'de': 'Germanic',
      'nl': 'Germanic',
      'sv': 'Germanic',
      'da': 'Germanic',
      'no': 'Germanic',
      'is': 'Germanic',
      'fo': 'Germanic',
      'fr': 'Romance',
      'es': 'Romance',
      'it': 'Romance',
      'pt': 'Romance',
      'ro': 'Romance',
      'ca': 'Romance',
      'ru': 'Slavic',
      'pl': 'Slavic',
      'uk': 'Slavic',
      'cs': 'Slavic',
      'sk': 'Slavic',
      'bg': 'Slavic',
      'hr': 'Slavic',
      'sr': 'Slavic',
      'sl': 'Slavic',
      'mk': 'Slavic',
      'bs': 'Slavic',
      'zh': 'Sino-Tibetan',
      'ja': 'Japonic',
      'ko': 'Koreanic',
      'hi': 'Indo-Aryan',
      'bn': 'Indo-Aryan',
      'ta': 'Dravidian',
      'te': 'Dravidian',
      'kn': 'Dravidian',
      'ml': 'Dravidian',
      'ar': 'Semitic',
      'he': 'Semitic',
      'fa': 'Indo-Iranian',
      'ur': 'Indo-Iranian',
      'tr': 'Turkic',
      'az': 'Turkic',
      'kk': 'Turkic',
      'ky': 'Turkic',
      'uz': 'Turkic',
      'tk': 'Turkic',
      'th': 'Tai-Kadai',
      'vi': 'Austroasiatic',
      'id': 'Austronesian',
      'ms': 'Austronesian',
      'fi': 'Uralic',
      'hu': 'Uralic',
      'et': 'Uralic',
      'ka': 'Kartvelian',
      'hy': 'Indo-European',
      'am': 'Semitic',
      'sw': 'Niger-Congo',
      'zu': 'Niger-Congo',
      'af': 'Indo-European',
      'xh': 'Niger-Congo',
      'st': 'Niger-Congo',
      'tn': 'Niger-Congo',
      'ts': 'Niger-Congo',
      've': 'Niger-Congo',
      'nr': 'Niger-Congo',
      'ss': 'Niger-Congo',
      'sn': 'Niger-Congo',
      'ny': 'Niger-Congo',
      'rw': 'Niger-Congo',
      'lg': 'Niger-Congo',
      'ak': 'Niger-Congo',
      'yo': 'Niger-Congo',
      'ig': 'Niger-Congo',
      'ha': 'Afro-Asiatic',
      'so': 'Afro-Asiatic',
      'om': 'Afro-Asiatic',
      'ti': 'Afro-Asiatic'
    };
    return families[code] || 'Unknown';
  }
}

module.exports = GoogleTranslateService;
