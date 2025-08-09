import { jest } from '@jest/globals';

// Setup manual mocks
jest.mock('ioredis');
jest.mock('bullmq');
jest.mock('playwright');

import PageSnap from '../main.js';
import { loadConfig } from '../config.js';
import { getMockAdd, getMockClose } from './__mocks__/bullmq.js';

describe('PageSnap Queue-Based Capture', () => {
  let config;
  let mockStorageProvider;

  beforeEach(async () => {
    jest.clearAllMocks();
    config = await loadConfig();
    
    mockStorageProvider = {
      save: jest.fn(),
    };

    // Mock the prototype methods
    PageSnap.prototype._initStorageProvider = jest.fn().mockResolvedValue(mockStorageProvider);
  });

  it('should add a job to the queue when capture is called', async () => {
    const converter = await new PageSnap(config, null).init();
    await converter.capture(['https://example.com']);

    const mockAdd = getMockAdd();
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd).toHaveBeenCalledWith('process-screenshot', {
      input: 'https://example.com',
      options: {},
    });
    
    await converter.jobQueue.close();
  });

  it('should add multiple jobs for multiple inputs', async () => {
    const converter = await new PageSnap(config, null).init();
    const urls = ['https://example.com', 'https://google.com'];
    await converter.capture(urls);

    const mockAdd = getMockAdd();
    expect(mockAdd).toHaveBeenCalledTimes(2);
    expect(mockAdd).toHaveBeenNthCalledWith(1, 'process-screenshot', { input: 'https://example.com', options: {} });
    expect(mockAdd).toHaveBeenNthCalledWith(2, 'process-screenshot', { input: 'https://google.com', options: {} });
    
    await converter.jobQueue.close();
  });

  it('should return the results from the jobs', async () => {
    const converter = await new PageSnap(config, null).init();
    const results = await converter.capture(['https://example.com']);

    // The mock for waitUntilFinished returns 'mock-result'
    expect(results).toEqual(['mock-result']);
    
    await converter.jobQueue.close();
  });
});
