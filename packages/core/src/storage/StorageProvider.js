// Base class for all storage providers
export default class StorageProvider {
  constructor(options) {
    this.options = options;
  }

  /**
   * Saves the image data.
   * @param {string} fileName - The name of the file to save.
   * @param {Buffer} data - The image data buffer.
   * @returns {Promise<string>} The path or identifier for the saved file.
   */
  async save(fileName, data) {
    throw new Error('StorageProvider#save must be implemented by subclasses');
  }

  /**
   * Performs cleanup of expired assets.
   * @returns {Promise<void>}
   */
  async cleanup() {
    // Optional: implement in subclasses if TTL is supported
    console.log(`Cleanup not implemented for ${this.constructor.name}`);
  }
}