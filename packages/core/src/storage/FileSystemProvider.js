import { promises as fs } from 'fs';
import path from 'path';
import StorageProvider from './StorageProvider.js';

export default class FileSystemProvider extends StorageProvider {
  constructor(options) {
    super(options);
    this.location = path.resolve(process.cwd(), options.location || './snapshots');
  }

  async save(fileName, data) {
    await fs.mkdir(this.location, { recursive: true });
    const filePath = path.join(this.location, fileName);

    if (!this.options.overwrite) {
      try {
        await fs.access(filePath);
        // If access does not throw, the file exists.
        console.warn(`File ${filePath} already exists and overwrite is false. Skipping.`);
        return filePath;
      } catch (error) {
        // File doesn't exist, proceed to write.
      }
    }

    await fs.writeFile(filePath, data);
    return filePath;
  }

  async cleanup() {
    if (!this.options.ttl) {
      console.log('Cleanup skipped: TTL not configured for FileSystemProvider.');
      return;
    }

    const files = await fs.readdir(this.location);
    const now = Date.now();
    const ttlMillis = this.options.ttl * 1000;

    for (const file of files) {
      const filePath = path.join(this.location, file);
      const stat = await fs.stat(filePath);
      if (now - stat.mtimeMs > ttlMillis) {
        console.log(`Cleaning up expired file: ${filePath}`);
        await fs.unlink(filePath);
      }
    }
  }
}