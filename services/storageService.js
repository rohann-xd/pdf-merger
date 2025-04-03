/**
 * Abstract storage service for handling file operations
 * Different implementations handle local or S3 storage
 */
class StorageService {
  async saveFile(filePath, fileName) {
    throw new Error("Method not implemented");
  }

  async saveMergedFile(buffer, fileName) {
    throw new Error("Method not implemented");
  }

  getFileUrl(fileKey) {
    throw new Error("Method not implemented");
  }

  async deleteFile(fileKey) {
    throw new Error("Method not implemented");
  }
}

/**
 * Local file storage implementation
 */
class LocalStorageService extends StorageService {
  constructor(mergedDir = "merged") {
    super();
    this.mergedDir = mergedDir;
    this.fs = require("fs").promises;
    this.path = require("path");

    // Create merged directory if it doesn't exist
    this.fs
      .mkdir(this.mergedDir, { recursive: true })
      .catch((err) =>
        console.error(`Error creating ${this.mergedDir} directory:`, err)
      );
  }

  async saveFile(filePath, fileName) {
    // Local storage doesn't need to move the file as multer already saved it
    return filePath;
  }

  async saveMergedFile(buffer, fileName) {
    const filePath = this.path.join(this.mergedDir, fileName);
    await this.fs.writeFile(filePath, buffer);
    return filePath;
  }

  getFileUrl(filePath) {
    // For local storage, we use a relative URL
    return `/merged/${this.path.basename(filePath)}`;
  }

  async deleteFile(filePath) {
    try {
      await this.fs.unlink(filePath);
    } catch (err) {
      console.error(`Error deleting file ${filePath}:`, err);
    }
  }
}

/**
 * S3 storage implementation
 */
class S3StorageService extends StorageService {
  constructor(s3Client, bucket, region) {
    super();
    this.s3Client = s3Client;
    this.bucket = bucket;
    this.region = region;
    this.fs = require("fs").promises;
    this.path = require("path");
    // Here's the error - incorrect destructuring syntax
    this.PutObjectCommand = require("@aws-sdk/client-s3").PutObjectCommand;
  }

  async saveFile(filePath, originalName) {
    try {
      const fileContent = await this.fs.readFile(filePath);
      const s3Key = `uploads/${this.path.basename(filePath)}.pdf`;

      await this.s3Client.send(
        new this.PutObjectCommand({
          Bucket: this.bucket,
          Key: s3Key,
          Body: fileContent,
          ContentType: "application/pdf",
          Metadata: {
            originalname: encodeURIComponent(originalName),
          },
        })
      );

      return s3Key;
    } catch (error) {
      console.error(`Error uploading ${filePath} to S3:`, error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async saveMergedFile(buffer, fileName) {
    const s3Key = `merged/${fileName}`;

    await this.s3Client.send(
      new this.PutObjectCommand({
        Bucket: this.bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: "application/pdf",
      })
    );

    return s3Key;
  }

  getFileUrl(s3Key) {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${s3Key}`;
  }

  async deleteFile(s3Key) {
    // You could implement S3 deletion here if needed
    console.log(`Scheduled for deletion: ${s3Key}`);
  }
}

/**
 * Factory function to create the appropriate storage service
 */
function createStorageService(config) {
  if (config.type === "local") {
    return new LocalStorageService(config.mergedDir);
  } else if (config.type === "s3") {
    return new S3StorageService(config.s3Client, config.bucket, config.region);
  } else {
    throw new Error(`Unknown storage type: ${config.type}`);
  }
}

module.exports = {
  createStorageService,
  LocalStorageService,
  S3StorageService,
};
