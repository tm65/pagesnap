import { chromium } from 'playwright';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { loadConfig } from './config.js';
import fs from 'fs/promises';

import FileSystemProvider from './storage/FileSystemProvider.js';
import S3Provider from './storage/S3Provider.js';
import InMemoryProvider from './storage/InMemoryProvider.js';

const QUEUE_NAME = 'screenshotJobs';

class JobQueue {
  constructor(config) {
    const connection = new Redis(config?.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
    this.queue = new Queue(QUEUE_NAME, { connection });
  }

  async add(jobName, data) {
    return this.queue.add(jobName, data);
  }

  close() {
    return this.queue.close();
  }
}

export default class PageSnap {
  constructor(config, browser = null) {
    this.config = config;
    this.browser = browser;
    this.jobQueue = new JobQueue(config);
    this.storageProvider = null; // Will be initialized in init()
  }

  async init() {
    this.storageProvider = await this._initStorageProvider();
    return this;
  }

  async _processJob(input, options) {
    const browser = this.browser || await chromium.launch();
    let page;
    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      });
      page = await context.newPage();
      
      const isUrl = input.startsWith('http://') || input.startsWith('https://');
      const fileNamePrefix = isUrl ? this._getFileName(input) : 'rendered_html';
      
      if (isUrl) {
        await page.goto(input, { waitUntil: 'load', timeout: 60000 });
      } else {
        await page.setContent(input, { waitUntil: 'load' });
      }

      let metadata = isUrl ? await this._extractMetadata(page) : {};

      const results = [];
      for (const format of this.config.output.formats) {
        const fileName = `${fileNamePrefix}_${Date.now()}.${format}`;
        let buffer;

        if (format === 'pdf') {
          buffer = await page.pdf(options.pdfOptions || this.config.pdf);
        } else {
          buffer = await page.screenshot({
            type: format,
            quality: this.config.output.quality,
            fullPage: this.config.output.fullPage,
          });
        }
        
        const outputPath = await this.storageProvider.save(fileName, buffer);
        results.push({ 
          url: isUrl ? input : null, 
          html: isUrl ? null : input, 
          format, 
          path: outputPath,
          metadata: isUrl ? metadata : null,
        });
      }
      
      await context.close();
      if (!this.browser) {
        await browser.close();
      }
      return results;

    } catch (error) {
      console.error(`Failed to process input:`, error);
      throw error; // Throw error to let BullMQ handle job failure
    }
  }

  async capture(inputs, options = {}) {
    const inputsArray = Array.isArray(inputs) ? inputs : [inputs];
    const jobs = await Promise.all(
      inputsArray.map(input => 
        this.jobQueue.add('process-screenshot', { input, options })
      )
    );
    
    const results = await Promise.all(jobs.map(job => job.waitUntilFinished()));
    return results;
  }

  async _initStorageProvider() {
    const storageConfig = this.config.output.storage;
    const providerName = storageConfig.provider;
    
    switch (providerName.toLowerCase()) {
      case 'filesystem':
        return new FileSystemProvider(storageConfig);
      case 's3':
        return new S3Provider(storageConfig);
      case 'inmemory':
        return new InMemoryProvider(storageConfig);
      default:
        throw new Error(`Unknown or unsupported storage provider: ${providerName}`);
    }
  }

  async _extractMetadata(page) {
    return await page.evaluate(() => {
      const data = {};
      data.title = document.title;
      const metaTags = document.querySelectorAll('meta');
      data.meta = {};
      metaTags.forEach(tag => {
        const name = tag.getAttribute('name') || tag.getAttribute('property');
        if (name) {
          data.meta[name] = tag.getAttribute('content');
        }
      });
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      data.jsonLd = [];
      jsonLdScripts.forEach(script => {
        try {
          data.jsonLd.push(JSON.parse(script.textContent));
        } catch (e) { /* Ignore */ }
      });
      return data;
    });
  }

  _getFileName(url) {
    const urlObj = new URL(url);
    let name = `${urlObj.hostname}${urlObj.pathname}`.replace(/\/$/, '');
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }
}
