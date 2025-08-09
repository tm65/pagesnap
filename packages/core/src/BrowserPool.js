import { chromium } from 'playwright';

class BrowserPool {
  constructor(config = {}) {
    this.maxBrowsers = config.maxBrowsers || 4;
    this.maxPagesPerBrowser = config.maxPagesPerBrowser || 10;
    this.browserIdleTimeout = config.browserIdleTimeout || 300000; // 5 minutes
    
    this.browsers = [];
    this.availableBrowsers = [];
    this.browserStats = new Map(); // Track page counts per browser
    this.cleanupInterval = null;
    
    this.startCleanupTimer();
  }

  async getBrowser() {
    // Try to find an available browser with capacity
    for (const browser of this.availableBrowsers) {
      const stats = this.browserStats.get(browser);
      if (stats && stats.pageCount < this.maxPagesPerBrowser) {
        stats.pageCount++;
        stats.lastUsed = Date.now();
        return browser;
      }
    }

    // Create a new browser if we haven't hit the limit
    if (this.browsers.length < this.maxBrowsers) {
      const browser = await chromium.launch();
      this.browsers.push(browser);
      this.availableBrowsers.push(browser);
      this.browserStats.set(browser, {
        pageCount: 1,
        lastUsed: Date.now(),
        created: Date.now()
      });
      
      console.log(`Browser pool: Created new browser (${this.browsers.length}/${this.maxBrowsers})`);
      return browser;
    }

    // All browsers at capacity, wait and try again
    console.warn('Browser pool: All browsers at capacity, waiting for page to be released');
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.getBrowser(); // Recursive retry
  }

  releasePage(browser) {
    const stats = this.browserStats.get(browser);
    if (stats) {
      stats.pageCount = Math.max(0, stats.pageCount - 1);
      stats.lastUsed = Date.now();
    }
  }

  startCleanupTimer() {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupIdleBrowsers();
    }, 60000); // Check every minute
  }

  async cleanupIdleBrowsers() {
    const now = Date.now();
    const browsersToClose = [];

    for (const [browser, stats] of this.browserStats.entries()) {
      const isIdle = now - stats.lastUsed > this.browserIdleTimeout;
      const hasNoPages = stats.pageCount === 0;
      
      if (isIdle && hasNoPages && this.browsers.length > 1) {
        browsersToClose.push(browser);
      }
    }

    for (const browser of browsersToClose) {
      try {
        await browser.close();
        this.browsers = this.browsers.filter(b => b !== browser);
        this.availableBrowsers = this.availableBrowsers.filter(b => b !== browser);
        this.browserStats.delete(browser);
        console.log(`Browser pool: Closed idle browser (${this.browsers.length}/${this.maxBrowsers} remaining)`);
      } catch (error) {
        console.error('Failed to close idle browser:', error);
      }
    }
  }

  async close() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const closePromises = this.browsers.map(browser => 
      browser.close().catch(err => console.error('Error closing browser:', err))
    );
    
    await Promise.allSettled(closePromises);
    
    this.browsers.length = 0;
    this.availableBrowsers.length = 0;
    this.browserStats.clear();
    
    console.log('Browser pool: Closed all browsers');
  }

  getStats() {
    return {
      totalBrowsers: this.browsers.length,
      maxBrowsers: this.maxBrowsers,
      browserStats: Array.from(this.browserStats.entries()).map(([browser, stats]) => ({
        pageCount: stats.pageCount,
        lastUsed: new Date(stats.lastUsed).toISOString(),
        created: new Date(stats.created).toISOString()
      }))
    };
  }
}

export default BrowserPool;