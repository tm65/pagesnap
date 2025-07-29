import { chromium } from 'playwright';
import PQueue from 'p-queue';
import { loadConfig } from './config.js';

// Note: The storage providers are now dynamically imported.

export default class PageSnap {
  constructor(config) {
    this.config = config; // Config is now loaded asynchronously before instantiation
    this.queue = new PQueue({ concurrency: this.config.performance.maxConcurrency });
  }

  // Must be called to initialize the provider
  async init() {
    this.storageProvider = await this._initStorageProvider();
    return this;
  }

  async _initStorageProvider() {
    const storageConfig = this.config.output.storage;
    const providerName = storageConfig.provider;
    
    try {
      const providerModule = await import(`./storage/${providerName.charAt(0).toUpperCase() + providerName.slice(1)}Provider.js`);
      const ProviderClass = providerModule.default;
      return new ProviderClass(storageConfig);
    } catch (e) {
      if (e.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(`Unknown or unsupported storage provider: ${providerName}`);
      }
      throw e;
    }
  }

  async capture(urls, options = {}) {
    const browser = await chromium.launch();
    const results = [];

    for (const url of urls) {
      this.queue.add(async () => {
        try {
          const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
          });
          const page = await context.newPage();
          
          console.log(`Processing: ${url}`);
          await page.goto(url, { waitUntil: 'load', timeout: 60000 });

          // Combined Sanitization Strategy
          if (this.config.sanitization.customRules.length > 0) {
            console.log(`  -> Applying 2-stage sanitization for ${url}`);
            const styleContent = `
              ${this.config.sanitization.customRules.join(', ')} {
                display: none !important;
              }
            `;
            await page.addStyleTag({ content: styleContent });
            await page.evaluate(async (selectors) => {
              for (let i = 0; i < 5; i++) {
                for (const selector of selectors) {
                  document.querySelectorAll(selector).forEach(el => el.remove());
                }
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            }, this.config.sanitization.customRules);
          }

          const screenshotOptions = {
            fullPage: !options.clip, // If a clip is provided, fullPage must be false
            ...options,
          };

          for (const format of this.config.output.formats) {
            const fileName = `${this._getFileName(url)}.${format}`;
            
            if (format === 'svg') {
              console.warn('SVG output is not yet supported.');
              continue;
            }
            
            screenshotOptions.type = format === 'jpg' ? 'jpeg' : 'png';
            const buffer = await page.screenshot(screenshotOptions);

            const outputPath = await this.storageProvider.save(fileName, buffer);
            
            results.push({ url, format, path: outputPath });
            console.log(`  -> Saved to ${outputPath}`);
          }

          await context.close();
        } catch (error) {
          console.error(`Failed to process ${url}:`, error);
          results.push({ url, error: error.message });
        }
      });
    }

    await this.queue.onIdle();
    await browser.close();
    return results;
  }

  _getFileName(url) {
    const urlObj = new URL(url);
    let name = `${urlObj.hostname}${urlObj.pathname}`.replace(/\/$/, ''); // remove trailing slash
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }
}