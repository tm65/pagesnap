import { jest } from '@jest/globals';

// Mock playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          close: jest.fn().mockResolvedValue(undefined),
        }),
        close: jest.fn().mockResolvedValue(undefined),
      }),
      close: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

import BrowserPool from '../BrowserPool.js';
import { chromium } from 'playwright';

describe('BrowserPool', () => {
  let browserPool;
  let mockBrowser;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBrowser = {
      newContext: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    chromium.launch.mockResolvedValue(mockBrowser);
    
    browserPool = new BrowserPool({
      maxBrowsers: 2,
      maxPagesPerBrowser: 3,
      browserIdleTimeout: 100 // Short timeout for testing
    });
  });

  afterEach(async () => {
    if (browserPool) {
      await browserPool.close();
    }
  });

  it('should create a browser when none exist', async () => {
    const browser = await browserPool.getBrowser();
    
    expect(chromium.launch).toHaveBeenCalledTimes(1);
    expect(browser).toBe(mockBrowser);
    expect(browserPool.getStats().totalBrowsers).toBe(1);
  });

  it('should reuse existing browser when under capacity', async () => {
    const browser1 = await browserPool.getBrowser();
    const browser2 = await browserPool.getBrowser();
    
    expect(chromium.launch).toHaveBeenCalledTimes(1);
    expect(browser1).toBe(browser2);
  });

  it('should create new browser when at capacity', async () => {
    const mockBrowser2 = {
      newContext: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    chromium.launch.mockResolvedValueOnce(mockBrowser).mockResolvedValueOnce(mockBrowser2);

    // Fill first browser to capacity (3 pages)
    await browserPool.getBrowser();
    await browserPool.getBrowser();
    await browserPool.getBrowser();
    
    // This should create a new browser
    const browser4 = await browserPool.getBrowser();
    
    expect(chromium.launch).toHaveBeenCalledTimes(2);
    expect(browserPool.getStats().totalBrowsers).toBe(2);
  });

  it('should release pages and update stats', async () => {
    const browser = await browserPool.getBrowser();
    browserPool.releasePage(browser);
    
    const stats = browserPool.getStats();
    expect(stats.totalBrowsers).toBe(1);
  });

  it('should close all browsers on shutdown', async () => {
    await browserPool.getBrowser();
    await browserPool.getBrowser();
    
    await browserPool.close();
    
    expect(mockBrowser.close).toHaveBeenCalled();
    expect(browserPool.getStats().totalBrowsers).toBe(0);
  });
});