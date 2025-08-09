import { jest } from '@jest/globals';

// Setup manual mocks
jest.mock('ioredis');
jest.mock('bullmq');
jest.mock('playwright');

import PageSnap from '../main.js';
import { loadConfig } from '../config.js';
import { 
  mockPdf, 
  mockScreenshot, 
  mockGoto, 
  mockSetContent, 
  mockEvaluate 
} from './__mocks__/playwright.js';

describe('PageSnap Worker Logic (_processJob)', () => {
  let config;
  let mockStorageProvider;
  let converter;

  beforeEach(async () => {
    jest.clearAllMocks();
    config = await loadConfig();
    
    mockStorageProvider = {
      save: jest.fn().mockImplementation((fileName, buffer) => {
        return Promise.resolve(`/fake/path/${fileName}`);
      }),
    };
    
    converter = new PageSnap(config, null);
    converter.storageProvider = mockStorageProvider;
    // Mock the jobQueue to avoid actual Redis connection
    converter.jobQueue = {
      add: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('should process a URL job and save a PNG', async () => {
    const input = 'https://example.com';
    const options = {};
    config.output.formats = ['png'];

    const results = await converter._processJob(input, options);

    expect(mockGoto).toHaveBeenCalledWith(input, { waitUntil: 'load', timeout: 60000 });
    expect(mockScreenshot).toHaveBeenCalledTimes(1);
    expect(mockStorageProvider.save).toHaveBeenCalledTimes(1);
    expect(results[0].path).toContain('.png');
    expect(results[0].metadata.title).toBe('Mock Title');
  });

  it('should process an HTML job and save a PDF', async () => {
    const input = '<h1>Hello</h1>';
    const options = { pdfOptions: { width: '100px' } };
    config.output.formats = ['pdf'];

    const results = await converter._processJob(input, options);

    expect(mockSetContent).toHaveBeenCalledWith(input, { waitUntil: 'load' });
    expect(mockPdf).toHaveBeenCalledWith(options.pdfOptions);
    expect(mockStorageProvider.save).toHaveBeenCalledTimes(1);
    expect(results[0].path).toContain('.pdf');
    expect(results[0].metadata).toBeNull();
  });
});