import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import PageSnap from '../main.js';
import { loadConfig } from '../config.js';

// Mock the entire playwright module - define all mocks inline to avoid hoisting issues
jest.mock('playwright', () => {
  const mockPdf = jest.fn().mockResolvedValue(Buffer.from('fake-pdf'));
  const mockScreenshot = jest.fn().mockResolvedValue(Buffer.from('fake-png'));
  const mockGoto = jest.fn().mockResolvedValue(undefined);
  const mockSetContent = jest.fn().mockResolvedValue(undefined);
  const mockEvaluate = jest.fn().mockResolvedValue({ title: 'Mock Title' });
  const mockAddStyleTag = jest.fn().mockResolvedValue(undefined);
  const mockPageClose = jest.fn().mockResolvedValue(undefined);
  const mockContextClose = jest.fn().mockResolvedValue(undefined);
  const mockBrowserClose = jest.fn().mockResolvedValue(undefined);
  
  return {
    chromium: {
      launch: jest.fn().mockResolvedValue({
        newContext: jest.fn().mockResolvedValue({
          newPage: jest.fn().mockResolvedValue({
            pdf: mockPdf,
            screenshot: mockScreenshot,
            goto: mockGoto,
            setContent: mockSetContent,
            evaluate: mockEvaluate,
            addStyleTag: mockAddStyleTag,
            close: mockPageClose,
          }),
          close: mockContextClose,
        }),
        close: mockBrowserClose,
      }),
    },
    // Export the mock functions so they can be accessed in tests
    __mocks: {
      mockPdf,
      mockScreenshot,
      mockGoto,
      mockSetContent,
      mockEvaluate,
      mockAddStyleTag,
      mockPageClose,
      mockContextClose,
      mockBrowserClose,
    }
  };
});

// Mock the p-queue module
jest.mock('p-queue', () => {
  return jest.fn().mockImplementation(() => {
    const tasks = [];
    return {
      add: jest.fn((task) => {
        tasks.push(task());
        return Promise.resolve();
      }),
      onIdle: jest.fn(async () => {
        await Promise.all(tasks);
        return undefined;
      }),
    };
  });
});

// Import the mock module to access the mock functions
import { chromium } from 'playwright';

describe('PageSnap Core Functionality', () => {
  let config;
  let mockStorageProvider;

  beforeEach(async () => {
    config = await loadConfig();
    
    mockStorageProvider = {
      save: jest.fn().mockImplementation((fileName, buffer) => {
        return Promise.resolve(`/fake/path/${fileName}`);
      }),
    };

    // Clear and re-setup the spy
    if (PageSnap.prototype._initStorageProvider.mockRestore) {
      PageSnap.prototype._initStorageProvider.mockRestore();
    }
    jest.spyOn(PageSnap.prototype, '_initStorageProvider').mockResolvedValue(mockStorageProvider);
  });

  it('should capture a URL and generate a PNG', async () => {
    config.output.formats = ['png'];
    const converter = await new PageSnap(config, null).init();
    const results = await converter.capture(['https://example.com']);

    // Verify results structure
    expect(results).toHaveLength(1);
    expect(results[0].format).toBe('png');
    expect(results[0].path).toContain('.png');
    expect(results[0].path).toContain('/fake/path/');
    expect(results[0].metadata.title).toBe('Mock Title');
    expect(results[0].url).toBe('https://example.com');
  });

  it('should capture a URL and generate a PDF', async () => {
    config.output.formats = ['pdf'];
    const converter = await new PageSnap(config, null).init();
    const results = await converter.capture(['https://example.com']);

    expect(results).toHaveLength(1);
    expect(results[0].format).toBe('pdf');
    expect(results[0].path).toContain('.pdf');
    expect(results[0].path).toContain('/fake/path/');
  });

  it('should generate both PDF and PNG when configured', async () => {
    config.output.formats = ['pdf', 'png'];
    const converter = await new PageSnap(config, null).init();
    const results = await converter.capture(['https://example.com']);

    expect(results).toHaveLength(2);
    
    const pdfResult = results.find(r => r.format === 'pdf');
    const pngResult = results.find(r => r.format === 'png');
    
    expect(pdfResult).toBeDefined();
    expect(pdfResult.path).toContain('.pdf');
    
    expect(pngResult).toBeDefined(); 
    expect(pngResult.path).toContain('.png');
  });
});
