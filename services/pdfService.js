import PDFMerger from "pdf-merger-js";
import "dotenv/config";

/**
 * Merges PDF files using the configured storage service
 * @param {StorageService} storageService - Storage service implementation
 * @param {string[]} files - Array of file paths to merge
 * @returns {Object} Object containing id and filePath/s3Key
 */
const mergePdfs = async (storageService, ...files) => {
  try {
    const merger = new PDFMerger();

    for (const file of files) {
      await merger.add(file);
    }

    const timestamp = new Date().getTime();
    const fileName = `${timestamp}.pdf`;

    // Use storage service to save the merged file
    let mergedFilePath;

    if (storageService.constructor.name === "LocalStorageService") {
      // Save to disk for local storage
      await merger.save(await storageService.saveMergedFile("", fileName));
      mergedFilePath = `merged/${fileName}`;
    } else {
      // Use buffer for S3 storage
      const mergedPdfBuffer = await merger.saveAsBuffer();
      mergedFilePath = await storageService.saveMergedFile(
        mergedPdfBuffer,
        fileName
      );
    }

    // Get URL using the storage service
    const fileUrl = storageService.getFileUrl(mergedFilePath);

    return { id: timestamp, filePath: mergedFilePath, fileUrl };
  } catch (error) {
    console.error("Error merging PDFs:", error);
    throw error;
  }
};

export { mergePdfs };
