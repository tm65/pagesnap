import Redis from 'ioredis';
import crypto from 'crypto';

class CacheManager {
  constructor(config = {}) {
    this.enabled = config.enabled !== false; // Default enabled
    this.ttl = config.ttl || 3600; // 1 hour default
    this.keyPrefix = config.keyPrefix || 'pagesnap:cache:';
    
    if (this.enabled) {
      this.redis = new Redis(config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null,
        lazyConnect: true // Don't connect immediately
      });
      
      this.redis.on('error', (err) => {
        console.warn('Cache Redis connection error:', err.message);
        this.enabled = false; // Gracefully degrade
      });
    }
  }

  /**
   * Generate cache key from URL and options
   */
  generateCacheKey(input, options = {}) {
    const normalizedOptions = {
      format: options.format || 'png',
      quality: options.quality || 80,
      fullPage: options.fullPage || true,
      width: options.width,
      height: options.height,
      pdfOptions: options.pdfOptions
    };
    
    const keyData = {
      input,
      options: normalizedOptions
    };
    
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(keyData))
      .digest('hex');
    
    return `${this.keyPrefix}${hash}`;
  }

  /**
   * Get cached result
   */
  async get(input, options) {
    if (!this.enabled || !this.redis) {
      return null;
    }

    try {
      const key = this.generateCacheKey(input, options);
      const cached = await this.redis.get(key);
      
      if (cached) {
        const result = JSON.parse(cached);
        console.log(`Cache HIT for key: ${key}`);
        return result;
      }
      
      console.log(`Cache MISS for key: ${key}`);
      return null;
    } catch (error) {
      console.warn('Cache get error:', error.message);
      return null;
    }
  }

  /**
   * Store result in cache
   */
  async set(input, options, result) {
    if (!this.enabled || !this.redis) {
      return;
    }

    try {
      const key = this.generateCacheKey(input, options);
      const serialized = JSON.stringify(result);
      
      await this.redis.setex(key, this.ttl, serialized);
      console.log(`Cache SET for key: ${key} (TTL: ${this.ttl}s)`);
    } catch (error) {
      console.warn('Cache set error:', error.message);
    }
  }

  /**
   * Invalidate cache for specific input
   */
  async invalidate(input, options) {
    if (!this.enabled || !this.redis) {
      return;
    }

    try {
      const key = this.generateCacheKey(input, options);
      await this.redis.del(key);
      console.log(`Cache INVALIDATE for key: ${key}`);
    } catch (error) {
      console.warn('Cache invalidate error:', error.message);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear() {
    if (!this.enabled || !this.redis) {
      return;
    }

    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`Cache CLEAR: Removed ${keys.length} entries`);
      }
    } catch (error) {
      console.warn('Cache clear error:', error.message);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.enabled || !this.redis) {
      return { enabled: false };
    }

    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      const info = await this.redis.info('memory');
      const memoryUsage = info.match(/used_memory:(\d+)/);
      
      return {
        enabled: true,
        totalKeys: keys.length,
        memoryUsage: memoryUsage ? parseInt(memoryUsage[1]) : 'unknown',
        ttl: this.ttl
      };
    } catch (error) {
      console.warn('Cache stats error:', error.message);
      return { enabled: false, error: error.message };
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

export default CacheManager;