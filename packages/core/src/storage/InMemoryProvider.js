import { LRUCache } from 'lru-cache';
import StorageProvider from './StorageProvider.js';

export default class InMemoryProvider extends StorageProvider {
  constructor(options) {
    super(options);
    
    const cacheOptions = {
      max: options.maxSize || 50 * 1024 * 1024, // 50MB default
      ttl: options.ttl ? options.ttl * 1000 : undefined, // TTL in milliseconds
      // Calculate size of buffer for max size enforcement
      sizeCalculation: (value) => value.length,
    };

    this.cache = new LRUCache(cacheOptions);
  }

  async save(fileName, data) {
    this.cache.set(fileName, data);
    // For in-memory, the "path" is just the key
    return `in-memory://${fileName}`;
  }

  // The LRU cache handles its own cleanup, so this method is a no-op
  // but is here to fulfill the interface contract.
  async cleanup() {
    console.log('InMemoryProvider uses an LRU cache for automatic cleanup.');
    return Promise.resolve();
  }

  get(fileName) {
    return this.cache.get(fileName);
  }
}