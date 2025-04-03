const { MAX_FILE_SIZE } = require("../utils/constants");
const { safeDeleteFile } = require("../utils/fileUtils");
const { mergePdfs } = require("../services/pdfService");
const fs = require("fs").promises;
const path = require("path");

// Show the home page
exports.showHomePage = (req, res) => {
  res.render("index", { errorMessage: null });
};

// Show the merge page
exports.showMergePage = (req, res) => {
  res.render("merge");
};

// Handle the arrange PDFs request
exports.arrangePdfs = async (req, res) => {
  try {
    if (!req.files || req.files.length < 1) {
      return res.render("index", {
        errorMessage: "Please select files to upload.",
      });
    }

    let validFiles = [];
    let skippedFiles = [];

    for (const file of req.files) {
      if (file.mimetype === "application/pdf") {
        if (file.size <= MAX_FILE_SIZE) {
          validFiles.push({
            path: file.path,
            name: file.originalname,
            size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
          });
        } else {
          skippedFiles.push({
            name: file.originalname,
            reason: `Too large: ${(file.size / (1024 * 1024)).toFixed(
              2
            )}MB (max 5MB)`,
          });
          await safeDeleteFile(file.path);
        }
      } else {
        skippedFiles.push({
          name: file.originalname,
          reason: "Not a PDF file",
        });
        await safeDeleteFile(file.path);
      }
    }

    if (validFiles.length < 2) {
      for (const file of validFiles) {
        await safeDeleteFile(file.path);
      }

      return res.render("index", {
        errorMessage:
          "You need at least 2 valid PDF files to merge, each with a size of 5MB or less.",
        skippedFiles: skippedFiles,
      });
    }

    res.render("arrange", {
      files: validFiles,
      skippedFiles: skippedFiles,
    });
  } catch (error) {
    console.error("Error processing files:", error);

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await safeDeleteFile(file.path);
      }
    }

    res.status(500).render("index", {
      errorMessage:
        "An error occurred while processing your files. Please try again.",
    });
  }
};

// Handle the direct merge request (without arranging)
exports.mergePdfs = async (req, res) => {
  const uploadedFiles = req.files || [];
  const validFiles = [];
  const skippedFiles = [];

  try {
    if (uploadedFiles.length < 1) {
      return res.render("index", {
        errorMessage: "Please select files to upload.",
      });
    }

    for (const file of uploadedFiles) {
      if (file.mimetype === "application/pdf") {
        if (file.size <= MAX_FILE_SIZE) {
          validFiles.push(file);
        } else {
          skippedFiles.push({
            name: file.originalname,
            reason: `Too large: ${(file.size / (1024 * 1024)).toFixed(
              2
            )}MB (max 5MB)`,
          });
          await safeDeleteFile(file.path);
        }
      } else {
        skippedFiles.push({
          name: file.originalname,
          reason: "Not a PDF file",
        });
        await safeDeleteFile(file.path);
      }
    }

    if (validFiles.length < 2) {
      for (const file of validFiles) {
        await safeDeleteFile(file.path);
      }

      return res.render("index", {
        errorMessage:
          "You need at least 2 valid PDF files to merge, each with a size of 5MB or less.",
        skippedFiles: skippedFiles,
      });
    }

    const storageService = req.app.locals.storageService;
    const localFilePaths = validFiles.map((file) => file.path);

    // Merge PDFs using configured storage service
    const { id, fileUrl } = await mergePdfs(storageService, ...localFilePaths);

    // Clean up local files
    await Promise.all(localFilePaths.map(safeDeleteFile));

    const formattedSkippedFiles = skippedFiles.map(
      (item) => `${item.name} (${item.reason})`
    );

    res.render("result", {
      mergedFileUrl: fileUrl,
      skippedFiles: formattedSkippedFiles,
    });
  } catch (error) {
    console.error("Error during merge operation:", error);

    if (uploadedFiles.length > 0) {
      await Promise.all(uploadedFiles.map((file) => safeDeleteFile(file.path)));
    }

    res.status(500).render("index", {
      errorMessage:
        "An error occurred while processing your files. Please try again.",
      skippedFiles: skippedFiles.length > 0 ? skippedFiles : undefined,
    });
  }
};

// Process arranged PDFs
exports.processMerge = async (req, res) => {
  try {
    const filePaths = req.body.filePaths.split(",");

    if (!filePaths || filePaths.length < 2) {
      return res.render("index", {
        errorMessage: "You need at least 2 valid PDF files to merge.",
      });
    }

    // Check if files still exist
    for (const filePath of filePaths) {
      try {
        await fs.access(filePath);
      } catch (error) {
        return res.render("index", {
          errorMessage:
            "Some files are no longer available. Please upload again.",
        });
      }
    }

    const storageService = req.app.locals.storageService;

    // Merge PDFs using configured storage service
    const { id, fileUrl } = await mergePdfs(storageService, ...filePaths);

    // Clean up local files
    await Promise.all(filePaths.map(safeDeleteFile));

    const skippedFiles = req.body.skippedFiles
      ? req.body.skippedFiles.split(",")
      : [];

    res.render("result", {
      mergedFileUrl: fileUrl,
      skippedFiles: skippedFiles,
    });
  } catch (error) {
    console.error("Error during merge operation:", error);
    res.status(500).render("index", {
      errorMessage:
        "An error occurred while merging your files. Please try again.",
    });
  }
};
