const multer = require("multer");
const path = require("path");

const MAX_FILES = 10;

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for upload
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(null, true); // Accept all files, they'll be filtered later
    }
  },
});

module.exports = {
  upload,
  MAX_FILES,
};
