import { chromium } from 'playwright';
import PQueue from 'p-queue';
import { loadConfig } from './config.js';
import fs from 'fs/promises';


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

          // Apply watermark if enabled
          if (this.config.watermark && this.config.watermark.enabled) {
            const watermarkConfig = { ...this.config.watermark };
            if (watermarkConfig.type === 'image' && watermarkConfig.image.path) {
              try {
                const imageBuffer = await fs.readFile(watermarkConfig.image.path);
                const mimeType = this._getMimeType(watermarkConfig.image.path);
                watermarkConfig.image.path = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
              } catch (e) {
                console.error(`Failed to read watermark image: ${watermarkConfig.image.path}`, e);
                // Disable watermark if image fails to load
                watermarkConfig.enabled = false;
              }
            }
            if (watermarkConfig.enabled) {
              await this._applyWatermark(page, watermarkConfig);
            }
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