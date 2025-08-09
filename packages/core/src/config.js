import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to read JSON files in ESM
async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

const defaultConfig = {
  output: {
    location: './snapshots',
    formats: ['png'],
    storage: {
      provider: 'filesystem',
      overwrite: true,
    },
  },
  performance: {
    maxConcurrency: 4,
  },
  sanitization: {
    blockerLists: [],
    customRules: [],
  },
  // Browser pool configuration for worker processes
  browserPool: {
    maxBrowsers: 4,           // Maximum number of browser instances
    maxPagesPerBrowser: 10,   // Maximum pages per browser before rotation
    browserIdleTimeout: 300000 // 5 minutes - close idle browsers
  },
  // Redis caching configuration
  cache: {
    enabled: true,            // Enable/disable caching
    ttl: 3600,               // Cache TTL in seconds (1 hour)
    keyPrefix: 'pagesnap:cache:',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
  },
};

export async function loadConfig(configPath = 'pagesnap.config.json') {
  const resolvedPath = path.resolve(process.cwd(), configPath);
  try {
    await fs.access(resolvedPath);
    const userConfig = await readJson(resolvedPath);
    // Deep merge user config into default config
    return {
        ...defaultConfig,
        ...userConfig,
        output: { ...defaultConfig.output, ...userConfig.output },
        performance: { ...defaultConfig.performance, ...userConfig.performance },
        sanitization: { ...defaultConfig.sanitization, ...userConfig.sanitization },
        storage: { ...defaultConfig.output.storage, ...userConfig.output.storage },
        browserPool: { ...defaultConfig.browserPool, ...userConfig.browserPool },
        cache: { ...defaultConfig.cache, ...userConfig.cache },
    };
  } catch (e) {
    return defaultConfig;
  }
}