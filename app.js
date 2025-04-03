const express = require("express");
const path = require("path");
const fs = require("fs").promises;
const { S3Client } = require("@aws-sdk/client-s3");
require("dotenv").config();

const errorHandler = require("./middleware/errorHandler");
const pdfRoutes = require("./routes/pdfRoutes");
const { createStorageService } = require("./services/storageService");

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Configure storage type based on environment variable
const STORAGE_TYPE = process.env.STORAGE_TYPE || "local"; // 'local' or 's3'

// Create appropriate storage service
let storageService;
if (STORAGE_TYPE === "s3") {
  // Create S3 client
  const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // Create S3 storage service
  storageService = createStorageService({
    type: "s3",
    s3Client,
    bucket: process.env.S3_BUCKET,
    region: process.env.AWS_REGION,
  });

  console.log(
    `Using S3 storage: bucket=${process.env.S3_BUCKET}, region=${process.env.AWS_REGION}`
  );
} else {
  // Create local storage service
  storageService = createStorageService({
    type: "local",
    mergedDir: "merged",
  });

  console.log("Using local file storage");
}

// Make storage service available to routes
app.locals.storageService = storageService;

// Set up view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Set up middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/merged", express.static(path.join(__dirname, "merged")));

// Ensure required directories exist
const ensureDirectories = async () => {
  try {
    await fs.mkdir("uploads", { recursive: true });
    console.log("Uploads directory verified");
  } catch (err) {
    console.error("Error creating uploads directory:", err);
  }
};
ensureDirectories();

// Routes
app.use("/", pdfRoutes);

// 404 Page Not Found Handler
app.use((req, res) => {
  res.status(404).render("404");
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`PDF merger app listening on http://localhost:${port}`);
});
