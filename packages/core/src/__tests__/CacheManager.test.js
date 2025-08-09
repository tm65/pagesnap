import { jest } from '@jest/globals';

// Mock ioredis
jest.mock('ioredis');

import CacheManager from '../CacheManager.js';

describe('CacheManager', () => {
  let cacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheManager = new CacheManager({
      enabled: true,
      ttl: 1800,
      keyPrefix: 'test:cache:'
    });
  });

  afterEach(async () => {
    if (cacheManager) {
      await cacheManager.close();
    }
  });

  it('should generate consistent cache keys', () => {
    const input = 'https://example.com';
    const options = { format: 'png', quality: 80 };
    
    const key1 = cacheManager.generateCacheKey(input, options);
    const key2 = cacheManager.generateCacheKey(input, options);
    
    expect(key1).toBe(key2);
    expect(key1).toMatch(/^test:cache:[a-f0-9]{64}$/);
  });

  it('should generate different keys for different inputs', () => {
    const key1 = cacheManager.generateCacheKey('https://example.com', { format: 'png' });
    const key2 = cacheManager.generateCacheKey('https://google.com', { format: 'png' });
    
    expect(key1).not.toBe(key2);
  });

  it('should generate different keys for different options', () => {
    const input = 'https://example.com';
    const key1 = cacheManager.generateCacheKey(input, { format: 'png' });
    const key2 = cacheManager.generateCacheKey(input, { format: 'pdf' });
    
    expect(key1).not.toBe(key2);
  });

  it('should handle cache operations gracefully when disabled', async () => {
    cacheManager.enabled = false;
    
    const result = await cacheManager.get('test', {});
    expect(result).toBeNull();
    
    // These should not throw
    await cacheManager.set('test', {}, { data: 'test' });
    await cacheManager.invalidate('test', {});
    await cacheManager.clear();
  });

  it('should return stats when enabled', async () => {
    const stats = await cacheManager.getStats();
    
    expect(stats).toHaveProperty('enabled');
    expect(stats).toHaveProperty('ttl');
  });

  it('should return disabled stats when Redis fails', async () => {
    cacheManager.enabled = false;
    
    const stats = await cacheManager.getStats();
    
    expect(stats.enabled).toBe(false);
  });
});