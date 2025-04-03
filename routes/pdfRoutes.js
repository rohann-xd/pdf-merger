const express = require("express");
const router = express.Router();
const pdfController = require("../controllers/pdfController");
const { upload, MAX_FILES } = require("../config/multer");

// Home page
router.get("/", pdfController.showHomePage);

// Merge page
router.get("/merge", pdfController.showMergePage);

// Arrange PDFs
router.post(
  "/arrange",
  upload.array("pdfs", MAX_FILES),
  pdfController.arrangePdfs
);

// Direct merge
router.post("/merge", upload.array("pdfs", MAX_FILES), pdfController.mergePdfs);

// Process arranged PDFs
router.post("/process-merge", pdfController.processMerge);

module.exports = router;
