const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { mergPdfs } = require("./pdfMerge");
require("dotenv").config();

const app = express();
const port = 3000;

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "templates"));

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 20 * 1024 * 1024 },
});

app.get("/", (req, res) => {
  res.render("index", { errorMessage: null });
});

app.get("/merge", (req, res) => {
  res.render("merge");
});

app.post("/merge", upload.array("pdfs", 10), async function (req, res) {
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
        if (file.size <= 5 * 1024 * 1024) {
          validFiles.push(file);
        } else {
          skippedFiles.push({
            name: file.originalname,
            reason: `Too large: ${(file.size / (1024 * 1024)).toFixed(
              2
            )}MB (max 5MB)`,
          });
          await fs
            .unlink(file.path)
            .catch((e) => console.error(`Failed to delete ${file.path}:`, e));
        }
      } else {
        skippedFiles.push({
          name: file.originalname,
          reason: "Not a PDF file",
        });
        await fs
          .unlink(file.path)
          .catch((e) => console.error(`Failed to delete ${file.path}:`, e));
      }
    }

    if (validFiles.length < 2) {
      for (const file of validFiles) {
        await fs
          .unlink(file.path)
          .catch((e) => console.error(`Failed to delete ${file.path}:`, e));
      }

      return res.render("index", {
        errorMessage:
          "You need at least 2 valid PDF files to merge, each with a size of 2MB or less.",
        skippedFiles: skippedFiles,
      });
    }

    const s3UploadPromises = validFiles.map(async (file) => {
      const fileContent = await fs.readFile(file.path);
      const s3Key = `uploads/${file.filename}.pdf`;
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: s3Key,
          Body: fileContent,
          ContentType: "application/pdf",
        })
      );
      return s3Key;
    });

    const s3Keys = await Promise.all(s3UploadPromises);
    const localFilePaths = validFiles.map((file) => file.path);

    const { id, s3Key } = await mergPdfs(...localFilePaths);

    await Promise.all(
      localFilePaths.map((file) =>
        fs
          .unlink(file)
          .catch((e) => console.error(`Failed to delete ${file}:`, e))
      )
    );

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

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await fs
          .unlink(file.path)
          .catch((e) => console.error(`Failed to delete ${file.path}:`, e));
      }
    }

    res.status(500).render("index", {
      errorMessage:
        "An error occurred while processing your files. Please try again.",
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
});
