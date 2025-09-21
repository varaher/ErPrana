import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const mkdir = promisify(fs.mkdir);

export interface WikiEMSection {
  title: string;
  content: string;
  subsections?: WikiEMSection[];
}

export interface WikiEMScrapedData {
  topic: string;
  slug: string;
  url: string;
  title: string;
  sections: WikiEMSection[];
  retrievedAt: string;
  source: 'WikiEM';
}

export interface WikiEMCacheConfig {
  cacheDir: string;
  cacheExpiryHours: number;
  userAgent: string;
  baseUrl: string;
}

export class WikiEMScraper {
  private config: WikiEMCacheConfig;
  private axiosInstance: any;

  constructor(config: Partial<WikiEMCacheConfig> = {}) {
    this.config = {
      cacheDir: path.join(process.cwd(), 'var', 'cache', 'wikem'),
      cacheExpiryHours: 24,
      userAgent: 'ARYA-Medical-Bot/1.0 (+https://arya.health)',
      baseUrl: 'https://www.wikem.org',
      ...config,
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'User-Agent': this.config.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 30000,
    });

    this.ensureCacheDir();
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await mkdir(this.config.cacheDir, { recursive: true });
    } catch (error) {
      console.warn('Could not create cache directory:', error);
    }
  }

  private getCachePath(slug: string): string {
    return path.join(this.config.cacheDir, `${slug}.json`);
  }

  private isCacheValid(cachePath: string): boolean {
    try {
      const stats = fs.statSync(cachePath);
      const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
      return ageHours < this.config.cacheExpiryHours;
    } catch {
      return false;
    }
  }

  private async loadFromCache(slug: string): Promise<WikiEMScrapedData | null> {
    try {
      const cachePath = this.getCachePath(slug);
      if (this.isCacheValid(cachePath)) {
        const cached = await readFile(cachePath, 'utf8');
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn(`Cache read failed for ${slug}:`, error);
    }
    return null;
  }

  private async saveToCache(slug: string, data: WikiEMScrapedData): Promise<void> {
    try {
      const cachePath = this.getCachePath(slug);
      await writeFile(cachePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.warn(`Cache write failed for ${slug}:`, error);
    }
  }

  private extractSections($: cheerio.CheerioAPI): WikiEMSection[] {
    const sections: WikiEMSection[] = [];
    
    // Look for main content area
    let contentArea = $('.mw-parser-output, .content, main, article').first();
    if (!contentArea.length) {
      contentArea = $('body'); // Fallback to body
    }

    // Extract sections based on headers
    contentArea.find('h1, h2, h3, h4, h5, h6').each((index, element) => {
      const $header = $(element);
      const title = $header.text().trim();
      
      if (!title) return;

      // Skip certain headers
      if (['References', 'External Links', 'See Also', 'Notes'].includes(title)) {
        return;
      }

      let content = '';
      let $next = $header.next();

      // Collect content until next header
      while ($next.length && !$next.is('h1, h2, h3, h4, h5, h6')) {
        if ($next.is('p, ul, ol, table, div')) {
          content += $next.text().trim() + '\n';
        }
        $next = $next.next();
      }

      // Clean up content
      content = content.trim().replace(/\n{3,}/g, '\n\n');

      if (content) {
        sections.push({
          title,
          content,
        });
      }
    });

    // If no sections found with headers, try alternative parsing
    if (sections.length === 0) {
      sections.push({
        title: 'Content',
        content: contentArea.text().trim(),
      });
    }

    return sections;
  }

  private extractKeySections($: cheerio.CheerioAPI): WikiEMSection[] {
    const keySections: WikiEMSection[] = [];
    const contentArea = $('.mw-parser-output, .content, main, article').first() || $('body');

    // Define key section patterns
    const sectionPatterns = [
      { title: 'Red Flags', patterns: ['red flag', 'red flags', 'red-flag', 'red-flags'] },
      { title: 'Differential Diagnosis', patterns: ['differential', 'differential diagnosis', 'ddx'] },
      { title: 'Disposition', patterns: ['disposition', 'discharge', 'admission'] },
      { title: 'Workup', patterns: ['workup', 'work up', 'work-up', 'evaluation', 'assessment'] },
      { title: 'Treatment', patterns: ['treatment', 'management', 'therapy', 'intervention'] },
      { title: 'Key Points', patterns: ['key point', 'key points', 'take home', 'take-home'] },
      { title: 'Clinical Features', patterns: ['clinical feature', 'clinical features', 'symptoms', 'signs'] },
      { title: 'Risk Factors', patterns: ['risk factor', 'risk factors'] },
      { title: 'Complications', patterns: ['complication', 'complications'] },
    ];

    sectionPatterns.forEach(({ title, patterns }) => {
      let foundContent = '';

      // Look for content near these patterns
      contentArea.find('*').each((index, element) => {
        const $element = $(element);
        const text = $element.text().toLowerCase();

        if (patterns.some(pattern => text.includes(pattern))) {
          // Get the next few elements for content
          let $next = $element.next();
          let content = $element.text().trim() + '\n';

          // Collect next few elements
          for (let i = 0; i < 3 && $next.length; i++) {
            if ($next.is('p, ul, ol, li')) {
              content += $next.text().trim() + '\n';
            }
            $next = $next.next();
          }

          if (content.trim()) {
            foundContent += content;
          }
        }
      });

      if (foundContent.trim()) {
        keySections.push({
          title,
          content: foundContent.trim(),
        });
      }
    });

    return keySections;
  }

  private async fetchWikiEMPage(slug: string): Promise<string> {
    try {
      const response = await this.axiosInstance.get(`/wiki/${slug}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`WikiEM page not found: ${slug}`);
        }
        if (error.response?.status === 403) {
          throw new Error(`Access forbidden to WikiEM: ${slug}`);
        }
        throw new Error(`HTTP error ${error.response?.status}: ${error.message}`);
      }
      throw new Error(`Network error: ${error.message}`);
    }
  }

  public async scrapeTopic(slug: string, useCache: boolean = true): Promise<WikiEMScrapedData> {
    // Try cache first
    if (useCache) {
      const cached = await this.loadFromCache(slug);
      if (cached) {
        console.log(`Using cached data for ${slug}`);
        return cached;
      }
    }

    console.log(`Scraping WikiEM topic: ${slug}`);

    try {
      // Fetch the page
      const html = await this.fetchWikiEMPage(slug);
      const $ = cheerio.load(html);

      // Extract title
      const title = $('h1').first().text().trim() || 
                   $('title').text().replace(' - WikiEM', '').trim() ||
                   slug.replace(/_/g, ' ');

      // Extract sections
      const sections = this.extractSections($);
      const keySections = this.extractKeySections($);

      // Merge sections, prioritizing key sections
      const allSections = [...keySections];
      
      // Add other sections that aren't already covered
      sections.forEach(section => {
        const exists = allSections.some(ks => 
          ks.title.toLowerCase() === section.title.toLowerCase()
        );
        if (!exists) {
          allSections.push(section);
        }
      });

      const scrapedData: WikiEMScrapedData = {
        topic: title,
        slug,
        url: `${this.config.baseUrl}/wiki/${slug}`,
        title,
        sections: allSections,
        retrievedAt: new Date().toISOString(),
        source: 'WikiEM',
      };

      // Save to cache
      await this.saveToCache(slug, scrapedData);

      console.log(`Successfully scraped ${slug}: ${allSections.length} sections`);
      return scrapedData;

    } catch (error) {
      console.error(`Failed to scrape ${slug}:`, error);
      throw error;
    }
  }

  public async scrapeMultipleTopics(slugs: string[]): Promise<WikiEMScrapedData[]> {
    const results: WikiEMScrapedData[] = [];
    
    for (const slug of slugs) {
      try {
        const data = await this.scrapeTopic(slug);
        results.push(data);
        
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to scrape ${slug}:`, error);
        // Continue with other topics
      }
    }

    return results;
  }

  public async clearCache(): Promise<void> {
    try {
      const files = fs.readdirSync(this.config.cacheDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.config.cacheDir, file));
        }
      }
      console.log('Cache cleared');
    } catch (error) {
      console.warn('Could not clear cache:', error);
    }
  }

  public async getCacheStats(): Promise<{ totalFiles: number; totalSize: number; oldestFile?: string }> {
    try {
      const files = fs.readdirSync(this.config.cacheDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      let totalSize = 0;
      let oldestFile: string | undefined;
      let oldestTime = Date.now();

      for (const file of jsonFiles) {
        const filePath = path.join(this.config.cacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;

        if (stats.mtime.getTime() < oldestTime) {
          oldestTime = stats.mtime.getTime();
          oldestFile = file;
        }
      }

      return {
        totalFiles: jsonFiles.length,
        totalSize,
        oldestFile: oldestFile ? new Date(oldestTime).toISOString() : undefined,
      };
    } catch (error) {
      return { totalFiles: 0, totalSize: 0 };
    }
  }
}

// Export default instance
export const wikiEMScraper = new WikiEMScraper();

// Export for testing
export { WikiEMScraper as WikiEMScraperClass };
