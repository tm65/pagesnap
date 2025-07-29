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
    };
  } catch (e) {
    return defaultConfig;
  }
}