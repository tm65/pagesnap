import { chromium } from 'playwright';
import PQueue from 'p-queue';
import { loadConfig } from './config.js';
import fs from 'fs/promises';


import FileSystemProvider from './storage/FileSystemProvider.js';
import S3Provider from './storage/S3Provider.js';
import InMemoryProvider from './storage/InMemoryProvider.js';

// Note: The storage providers are now dynamically imported.

export default class PageSnap {
  constructor(config, browser = null) {
    this.config = config;
    this.browser = browser; // Allow injecting a browser instance for testing
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

  async capture(inputs, options = {}) {
    const browser = this.browser || await chromium.launch();
    const results = [];
    const inputsArray = Array.isArray(inputs) ? inputs : [inputs];

    for (const input of inputsArray) {
      this.queue.add(async () => {
        let page;
        try {
          const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
          });
          page = await context.newPage();
          
          const isUrl = input.startsWith('http://') || input.startsWith('https://');
          const fileNamePrefix = isUrl ? this._getFileName(input) : 'rendered_html';
          
          if (isUrl) {
            console.log(`Processing URL: ${input}`);
            await page.goto(input, { waitUntil: 'load', timeout: 60000 });
          } else {
            console.log('Processing HTML content.');
            await page.setContent(input, { waitUntil: 'load' });
          }

          // Combined Sanitization Strategy (only for URLs)
          if (isUrl && this.config.sanitization.customRules.length > 0) {
            console.log(`  -> Applying 2-stage sanitization for ${input}`);
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

          // Apply watermark if enabled
          if (this.config.watermark && this.config.watermark.enabled) {
            // ... (watermark logic remains the same)
          }

          // (after page.goto or page.setContent)

          let metadata = {};
          if (isUrl) {
            metadata = await this._extractMetadata(page);
          }

          // ... (sanitization and watermark logic)

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
            console.log(`  -> Saved to ${outputPath}`);
          }
          
          await context.close();
        } catch (error) {
          console.error(`Failed to process input:`, error);
          results.push({ input, error: error.message, metadata: null });
        }
      });
    }
    
    await this.queue.onIdle();
    if (!this.browser) {
      await browser.close();
    }
    return results;
  }

  async _extractMetadata(page) {
    return await page.evaluate(() => {
      const data = {};
      
      // Title
      data.title = document.title;

      // Meta tags
      const metaTags = document.querySelectorAll('meta');
      data.meta = {};
      metaTags.forEach(tag => {
        const name = tag.getAttribute('name') || tag.getAttribute('property');
        if (name) {
          data.meta[name] = tag.getAttribute('content');
        }
      });

      // JSON-LD
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      data.jsonLd = [];
      jsonLdScripts.forEach(script => {
        try {
          data.jsonLd.push(JSON.parse(script.textContent));
        } catch (e) {
          // Ignore parsing errors
        }
      });

      return data;
    });
  }

  _getFileName(url) {
  // ... (rest of the class)
    const urlObj = new URL(url);
    let name = `${urlObj.hostname}${urlObj.pathname}`.replace(/\/$/, ''); // remove trailing slash
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  _getMimeType(filePath) {
    const extension = filePath.split('.').pop().toLowerCase();
    switch (extension) {
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'gif':
        return 'image/gif';
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'application/octet-stream';
    }
  }

  async _applyWatermark(page, watermark) {
    if (!watermark || !watermark.enabled) {
      return;
    }

    await page.evaluate((watermark) => {
      const watermarkElement = document.createElement('div');
      watermarkElement.id = 'pagesnap-watermark';
      
      let style = 'position: fixed; z-index: 999999; pointer-events: none;';

      if (watermark.type === 'text') {
        watermarkElement.textContent = watermark.text.content;
        style += `
          font-family: ${watermark.text.font};
          font-size: ${watermark.text.size};
          color: ${watermark.text.color};
        `;
      } else if (watermark.type === 'image') {
        const img = document.createElement('img');
        img.src = watermark.image.path; // This will be a data URI
        img.style.width = watermark.image.width;
        img.style.height = watermark.image.height;
        img.style.opacity = watermark.image.opacity;
        watermarkElement.appendChild(img);
      }

      const { position, x_offset, y_offset } = watermark.type === 'text' ? watermark.text : watermark.image;

      switch (position) {
        case 'top-left':
          style += `top: ${y_offset}px; left: ${x_offset}px;`;
          break;
        case 'top-right':
          style += `top: ${y_offset}px; right: ${x_offset}px;`;
          break;
        case 'bottom-left':
          style += `bottom: ${y_offset}px; left: ${x_offset}px;`;
          break;
        case 'bottom-right':
          style += `bottom: ${y_offset}px; right: ${x_offset}px;`;
          break;
        case 'center':
          style += `top: 50%; left: 50%; transform: translate(-50%, -50%);`;
          break;
        case 'tile':
          // Tiling will be handled differently
          break;
      }
      
      watermarkElement.style.cssText = style;

      if (position === 'tile') {
        const tileContainer = document.createElement('div');
        tileContainer.id = 'pagesnap-watermark-container';
        tileContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 999999; pointer-events: none; overflow: hidden;';
        
        const watermarkDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="200" height="100">
            <text x="10" y="50" font-family="${watermark.text.font}" font-size="${watermark.text.size}" fill="${watermark.text.color}" transform="rotate(-30, 10, 50)">
              ${watermark.text.content}
            </text>
          </svg>
        `)}`;
        
        tileContainer.style.backgroundImage = `url("${watermarkDataUri}")`;
        tileContainer.style.backgroundRepeat = 'repeat';
        document.body.appendChild(tileContainer);
      } else {
        document.body.appendChild(watermarkElement);
      }
    }, watermark);
  }
}