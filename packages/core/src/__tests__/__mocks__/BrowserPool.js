import { jest } from '@jest/globals';

const mockBrowser = {
  newContext: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      pdf: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-png')),
      goto: jest.fn().mockResolvedValue(undefined),
      setContent: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue({ title: 'Mock Title' }),
      close: jest.fn().mockResolvedValue(undefined),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
  close: jest.fn().mockResolvedValue(undefined),
};

export default class BrowserPool {
  constructor(config) {
    this.config = config;
    this.browsers = [];
  }

  async getBrowser() {
    return mockBrowser;
  }

  releasePage(browser) {
    // Mock implementation
  }

  async close() {
    // Mock implementation
  }

  getStats() {
    return {
      totalBrowsers: 2,
      maxBrowsers: 4,
      browserStats: []
    };
  }
}