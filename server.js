const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { mergPdfs } = require("./pdfMerge");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 10;

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "templates"));

const ensureUploadsDir = async () => {
  try {
    await fs.mkdir("uploads", { recursive: true });
    console.log("Uploads directory verified");
  } catch (err) {
    console.error("Error creating uploads directory:", err);
  }
};
ensureUploadsDir();

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(null, true);
    }
  },
});

const safeDeleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error(`Failed to delete ${filePath}:`, error);
  }
};

const uploadFileToS3 = async (filePath, originalName) => {
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

app.get("/", (req, res) => {
  res.render("index", { errorMessage: null });
});

app.get("/merge", (req, res) => {
  res.render("merge");
});

app.post("/merge", upload.array("pdfs", MAX_FILES), async function (req, res) {
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

    const s3UploadPromises = validFiles.map((file) =>
      uploadFileToS3(file.path, file.originalname)
    );
    await Promise.all(s3UploadPromises);

    const localFilePaths = validFiles.map((file) => file.path);

    const { id, s3Key } = await mergPdfs(...localFilePaths);

    await Promise.all(localFilePaths.map(safeDeleteFile));

    const mergedFileUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    const formattedSkippedFiles = skippedFiles.map(
      (item) => `${item.name} (${item.reason})`
    );

    res.render("result", {
      mergedFileUrl,
      skippedFiles: formattedSkippedFiles,
    });
  } catch (error) {
    console.error("Error during merge or S3 operations:", error);

    if (uploadedFiles.length > 0) {
      await Promise.all(uploadedFiles.map((file) => safeDeleteFile(file.path)));
    }

    res.status(500).render("index", {
      errorMessage:
        "An error occurred while processing your files. Please try again.",
      skippedFiles: skippedFiles.length > 0 ? skippedFiles : undefined,
    });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).render("index", {
    errorMessage: "Something went wrong. Please try again later.",
  });
});

// 404 Page Not Found Handler
app.use((req, res) => {
  res.status(404).render("404");
});

app.listen(port, () => {
  console.log(`PDF merger app listening on http://localhost:${port}`);
  console.log(
    `Using S3 bucket: ${process.env.S3_BUCKET} in region: ${process.env.AWS_REGION}`
  );
});
