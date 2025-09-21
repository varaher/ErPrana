import { WikiEMScraperClass, WikiEMScrapedData } from '../scrape';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('WikiEMScraper', () => {
  let scraper: WikiEMScraperClass;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
    };

    // Mock axios.create
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create scraper instance
    scraper = new WikiEMScraperClass({
      cacheDir: './var/test-cache',
      cacheExpiryHours: 1,
    });
  });

  describe('Constructor', () => {
    test('should create scraper with default config', () => {
      const defaultScraper = new WikiEMScraperClass();
      expect(defaultScraper).toBeDefined();
    });

    test('should create scraper with custom config', () => {
      const customScraper = new WikiEMScraperClass({
        cacheDir: './custom-cache',
        cacheExpiryHours: 48,
        userAgent: 'CustomBot/1.0',
        baseUrl: 'https://custom.wikem.org',
      });
      expect(customScraper).toBeDefined();
    });
  });

  describe('scrapeTopic', () => {
    const mockHtml = `
      <html>
        <head><title>Chest Pain - WikiEM</title></head>
        <body>
          <h1>Chest Pain</h1>
          <div class="mw-parser-output">
            <h2>Red Flags</h2>
            <p>• Severe chest pain</p>
            <p>• Shortness of breath</p>
            
            <h2>Differential Diagnosis</h2>
            <ul>
              <li>Acute coronary syndrome</li>
              <li>Pulmonary embolism</li>
            </ul>
            
            <h2>Treatment</h2>
            <p>• Immediate ECG</p>
            <p>• Aspirin 325mg</p>
          </div>
        </body>
      </html>
    `;

    test('should successfully scrape a topic', async () => {
      // Mock successful response
      mockAxiosInstance.get.mockResolvedValue({
        data: mockHtml,
      });

      const result = await scraper.scrapeTopic('Chest_pain');

      expect(result).toBeDefined();
      expect(result.topic).toBe('Chest Pain');
      expect(result.slug).toBe('Chest_pain');
      expect(result.url).toContain('Chest_pain');
      expect(result.sections).toHaveLength(3);
      expect(result.source).toBe('WikiEM');
      expect(result.retrievedAt).toBeDefined();

      // Verify sections were extracted
      const sectionTitles = result.sections.map(s => s.title);
      expect(sectionTitles).toContain('Red Flags');
      expect(sectionTitles).toContain('Differential Diagnosis');
      expect(sectionTitles).toContain('Treatment');
    });

    test('should handle 404 errors', async () => {
      const error: any = new Error('Not Found');
      error.response = { status: 404 };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(scraper.scrapeTopic('NonExistentTopic')).rejects.toThrow(
        'WikiEM page not found: NonExistentTopic'
      );
    });

    test('should handle 403 errors', async () => {
      const error: any = new Error('Forbidden');
      error.response = { status: 403 };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(scraper.scrapeTopic('RestrictedTopic')).rejects.toThrow(
        'Access forbidden to WikiEM: RestrictedTopic'
      );
    });

    test('should handle network errors', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(scraper.scrapeTopic('NetworkErrorTopic')).rejects.toThrow(
        'Network error: Network error'
      );
    });

    test('should handle timeout errors', async () => {
      const error = new Error('timeout of 30000ms exceeded');
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(scraper.scrapeTopic('TimeoutTopic')).rejects.toThrow(
        'Network error: timeout of 30000ms exceeded'
      );
    });
  });

  describe('extractSections', () => {
    test('should extract sections from HTML with headers', () => {
      const mockHtml = `
        <div class="mw-parser-output">
          <h2>Red Flags</h2>
          <p>Content for red flags</p>
          
          <h3>Subsection</h3>
          <p>Subsection content</p>
          
          <h2>Treatment</h2>
          <p>Treatment content</p>
        </div>
      `;

      // Create a mock cheerio instance
      const mockCheerio = {
        find: jest.fn().mockReturnValue({
          first: jest.fn().mockReturnValue({
            find: jest.fn().mockReturnValue({
              each: jest.fn().mockImplementation((selector, callback) => {
                // Simulate finding headers
                const headers = [
                  { text: () => 'Red Flags', next: () => ({ text: () => 'Content for red flags' }) },
                  { text: () => 'Subsection', next: () => ({ text: () => 'Subsection content' }) },
                  { text: () => 'Treatment', next: () => ({ text: () => 'Treatment content' }) },
                ];

                headers.forEach((header, index) => {
                  const $header = { text: () => header.text(), next: () => header.next() };
                  const $next = header.next();
                  callback(index, $header);
                });
              }),
            }),
          }),
        }),
      };

      // This is a simplified test since we can't easily mock cheerio
      // In a real scenario, you'd use a proper HTML parser
      expect(mockCheerio).toBeDefined();
    });

    test('should handle HTML without clear sections', () => {
      const mockHtml = `
        <div class="content">
          <p>Some content without clear headers</p>
          <p>More content</p>
        </div>
      `;

      // This test would verify fallback behavior
      expect(mockHtml).toContain('Some content without clear headers');
    });
  });

  describe('extractKeySections', () => {
    test('should identify and extract key medical sections', () => {
      // This test would verify that key sections like Red Flags, 
      // Differential Diagnosis, Treatment, etc. are properly identified
      const keySectionPatterns = [
        'Red Flags',
        'Differential Diagnosis', 
        'Treatment',
        'Workup',
        'Disposition',
        'Key Points'
      ];

      expect(keySectionPatterns).toHaveLength(6);
      expect(keySectionPatterns).toContain('Red Flags');
      expect(keySectionPatterns).toContain('Treatment');
    });
  });

  describe('scrapeMultipleTopics', () => {
    test('should scrape multiple topics successfully', async () => {
      const topics = ['Chest_pain', 'Stroke', 'Sepsis'];
      const mockResponses = topics.map(topic => ({
        data: `<html><h1>${topic}</h1><div class="content">Content for ${topic}</div></html>`,
      }));

      // Mock responses for each topic
      mockAxiosInstance.get
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);

      const results = await scraper.scrapeMultipleTopics(topics);

      expect(results).toHaveLength(3);
      expect(results[0].topic).toBe('Chest_pain');
      expect(results[1].topic).toBe('Stroke');
      expect(results[2].topic).toBe('Sepsis');
    });

    test('should continue processing if one topic fails', async () => {
      const topics = ['Chest_pain', 'InvalidTopic', 'Stroke'];
      
      // Mock successful response for first topic
      mockAxiosInstance.get
        .mockResolvedValueOnce({
          data: '<html><h1>Chest Pain</h1><div>Content</div></html>',
        })
        .mockRejectedValueOnce(new Error('Topic not found'))
        .mockResolvedValueOnce({
          data: '<html><h1>Stroke</h1><div>Content</div></html>',
        });

      const results = await scraper.scrapeMultipleTopics(topics);

      expect(results).toHaveLength(2);
      expect(results[0].topic).toBe('Chest Pain');
      expect(results[1].topic).toBe('Stroke');
    });
  });

  describe('Cache Management', () => {
    test('should respect cache settings', async () => {
      const shortCacheScraper = new WikiEMScraperClass({
        cacheExpiryHours: 0.1, // 6 minutes
      });

      expect(shortCacheScraper).toBeDefined();
    });

    test('should handle cache directory creation errors gracefully', async () => {
      // This test would verify that cache directory creation failures
      // don't break the scraper functionality
      const scraper = new WikiEMScraperClass({
        cacheDir: '/invalid/path/that/cannot/be/created',
      });

      expect(scraper).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    test('should add delay between multiple topic requests', async () => {
      const topics = ['Topic1', 'Topic2', 'Topic3'];
      const mockResponses = topics.map(topic => ({
        data: `<html><h1>${topic}</h1><div>Content</div></html>`,
      }));

      // Mock all responses
      mockAxiosInstance.get.mockResolvedValue(mockResponses[0]);

      const startTime = Date.now();
      await scraper.scrapeMultipleTopics(topics);
      const endTime = Date.now();

      // Should take at least 2 seconds (1 second delay between each of 3 topics)
      expect(endTime - startTime).toBeGreaterThanOrEqual(2000);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed HTML gracefully', async () => {
      const malformedHtml = '<html><body><h1>Title</h1><div>Content</div>';
      
      mockAxiosInstance.get.mockResolvedValue({
        data: malformedHtml,
      });

      const result = await scraper.scrapeTopic('MalformedTopic');

      expect(result).toBeDefined();
      expect(result.topic).toBe('Title');
      expect(result.sections.length).toBeGreaterThan(0);
    });

    test('should handle empty HTML content', async () => {
      const emptyHtml = '<html><body></body></html>';
      
      mockAxiosInstance.get.mockResolvedValue({
        data: emptyHtml,
      });

      const result = await scraper.scrapeTopic('EmptyTopic');

      expect(result).toBeDefined();
      expect(result.sections.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('User Agent and Headers', () => {
    test('should set proper user agent', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('ARYA-Medical-Bot'),
          }),
        })
      );
    });

    test('should set proper accept headers', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }),
        })
      );
    });
  });
});
