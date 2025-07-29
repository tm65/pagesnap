import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import StorageProvider from './StorageProvider.js';

export default class S3Provider extends StorageProvider {
  constructor(options) {
    super(options);
    
    if (!options.location) {
      throw new Error('S3Provider requires a "location" (bucket name) in the configuration.');
    }
    
    this.bucket = options.location;
    this.s3Client = new S3Client({
      // The region can be specified in the config or through standard AWS env vars
      region: options.region || process.env.AWS_REGION,
    });
  }

  async save(fileName, data) {
    const params = {
      Bucket: this.bucket,
      Key: fileName,
      Body: data,
      // ACL: 'public-read', // Uncomment if you want objects to be publicly accessible
    };

    try {
      await this.s3Client.send(new PutObjectCommand(params));
      // Return an S3 URI for the object
      return `s3://${this.bucket}/${fileName}`;
    } catch (error) {
      console.error(`Failed to upload ${fileName} to S3:`, error);
      throw error;
    }
  }

  async cleanup() {
    if (!this.options.ttl) {
      console.log('Cleanup skipped: TTL not configured for S3Provider.');
      return;
    }

    const now = Date.now();
    const ttlMillis = this.options.ttl * 1000;

    try {
      const listResponse = await this.s3Client.send(new ListObjectsV2Command({ Bucket: this.bucket }));
      if (!listResponse.Contents) {
        return;
      }

      for (const object of listResponse.Contents) {
        if (now - object.LastModified.getTime() > ttlMillis) {
          console.log(`Cleaning up expired S3 object: ${object.Key}`);
          await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: object.Key }));
        }
      }
    } catch (error) {
      console.error('An error occurred during S3 cleanup:', error);
    }
  }
}