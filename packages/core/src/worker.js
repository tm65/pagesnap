import { Worker } from 'bullmq';
import Redis from 'ioredis';
import PageSnap from './main.js';
import { loadConfig } from './config.js';
import BrowserPool from './BrowserPool.js';
import CacheManager from './CacheManager.js';

const QUEUE_NAME = 'screenshotJobs';

// Load the main config to get Redis URL etc.
const config = await loadConfig();

const connection = new Redis(config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

// Initialize browser pool and cache manager
const browserPool = new BrowserPool(config.browserPool);
const cacheManager = new CacheManager(config.cache);

console.log('Worker process started with browser pool and caching. Waiting for jobs...');
console.log('Browser pool config:', browserPool.getStats());
console.log('Cache enabled:', cacheManager.enabled);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await browserPool.close();
  await cacheManager.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await browserPool.close();
  await cacheManager.close();
  process.exit(0);
});

new Worker(QUEUE_NAME, async (job) => {
  const { input, options } = job.data;
  
  try {
    // Check cache first
    const cachedResult = await cacheManager.get(input, options);
    if (cachedResult) {
      console.log(`Job ${job.id}: Cache hit for ${input}`);
      return cachedResult;
    }

    // Get browser from pool
    const browser = await browserPool.getBrowser();
    
    try {
      // Create PageSnap instance with pooled browser
      const converter = await new PageSnap(config, browser).init();
      const result = await converter._processJob(input, options);
      
      // Cache the result
      await cacheManager.set(input, options, result);
      
      console.log(`Job ${job.id}: Processed ${input} successfully`);
      return result;
    } finally {
      // Always release the browser back to the pool
      browserPool.releasePage(browser);
    }
  } catch (error) {
    console.error(`Job ${job.id} failed with error: ${error.message}`);
    // Re-throw the error to let BullMQ handle the job failure
    throw error;
  }
}, { connection });
