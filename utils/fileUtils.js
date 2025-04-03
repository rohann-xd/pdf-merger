const fs = require("fs").promises;
const path = require("path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");

/**
 * Safely delete a file with error handling
 * @param {string} filePath - Path to file to delete
 */
const safeDeleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Failed to delete ${filePath}:`, error);
  }
};

/**
 * Upload a file to S3
 * @param {S3Client} s3Client - S3 client
 * @param {string} filePath - Path to local file
 * @param {string} originalName - Original file name
 * @returns {string} S3 key
 */
const uploadFileToS3 = async (s3Client, filePath, originalName) => {
  try {
    const fileContent = await fs.readFile(filePath);
    const s3Key = `uploads/${path.basename(filePath)}.pdf`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
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
};

module.exports = {
  safeDeleteFile,
  uploadFileToS3,
};
