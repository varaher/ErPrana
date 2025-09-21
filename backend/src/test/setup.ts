// Test setup for WikiEM importer tests

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  // Suppress console output during tests unless explicitly needed
  if (process.env.NODE_ENV === 'test') {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Global test utilities
global.testUtils = {
  // Helper to create mock WikiEM data
  createMockWikiEMData: (slug: string, topic: string) => ({
    topic,
    slug,
    url: `https://www.wikem.org/wiki/${slug}`,
    title: topic,
    sections: [
      {
        title: 'Red Flags',
        content: '• Severe chest pain\n• Shortness of breath\n• Dizziness',
      },
      {
        title: 'Differential Diagnosis',
        content: '• Acute coronary syndrome\n• Pulmonary embolism\n• Aortic dissection',
      },
      {
        title: 'Treatment',
        content: '• Immediate ECG\n• Aspirin 325mg\n• Nitroglycerin if BP >90',
      },
    ],
    retrievedAt: new Date().toISOString(),
    source: 'WikiEM' as const,
  }),

  // Helper to create mock rule pack
  createMockRulePack: (id: string, name: string, rules: any[] = []) => ({
    id,
    name,
    version: '2024-01-01',
    description: 'Mock rule pack for testing',
    rules,
    metadata: {
      source: 'WikiEM',
      topics: [name],
      totalRules: rules.length,
      coverage: { [name.toLowerCase()]: 'partial' as const },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }),

  // Helper to wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Helper to create temporary directories
  createTempDir: () => {
    const tempDir = path.join(__dirname, '..', '..', 'var', 'test-temp', Date.now().toString());
    require('fs').mkdirSync(tempDir, { recursive: true });
    return tempDir;
  },

  // Helper to clean up temporary directories
  cleanupTempDir: (dir: string) => {
    try {
      require('fs').rmSync(dir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  },
};

// Mock axios for HTTP requests
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
  isAxiosError: jest.fn(),
}));

// Mock fs operations for testing
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    ...jest.requireActual('fs').promises,
    writeFile: jest.fn(),
    readFile: jest.fn(),
    mkdir: jest.fn(),
  },
}));

// Mock path operations
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args) => args.join('/')),
}));

// Test environment variables
process.env.NODE_ENV = 'test';
process.env.WIKIEM_CACHE_DIR = './var/test-cache';
process.env.WIKIEM_OUTPUT_DIR = './var/test-rulepacks';

export {};
