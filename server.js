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
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed!"));
    }
    cb(null, true);
  },
});

app.get("/", (req, res) => {
  res.render("index", { errorMessage: null });
});

app.post("/merge", upload.array("pdfs", 10), async function (req, res) {
  try {
    if (!req.files || req.files.length < 2) {
      return res.render("index", {
        errorMessage:
          "You need to upload at least 2 valid PDF files, each with a size of 2MB or less.",
      });
    }

    let validFiles = [];
    let skippedFiles = [];

    for (const file of req.files) {
      if (file.size <= 2 * 1024 * 1024) {
        validFiles.push(file);
      } else {
        skippedFiles.push(file.originalname);
        console.log(
          `Skipping file: ${file.originalname} (Too large: ${file.size} bytes)`
        );
        await fs.unlink(file.path);
      }
    }

    if (validFiles.length < 2) {
      return res.render("index", {
        errorMessage:
          "You need to upload at least 2 valid PDF files, each with a size of 2MB or less.",
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
    const localFilePaths = validFiles.map((file) =>
      path.join(__dirname, file.path)
    );

    const { id, s3Key } = await mergPdfs(...localFilePaths);

    await Promise.all(localFilePaths.map((file) => fs.unlink(file)));

    const mergedFileUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    res.render("result", {
      mergedFileUrl,
      skippedFiles,
    });
  } catch (error) {
    console.error("Error during merge or S3 operations:", error);
    res.status(500).json({ error: "An error occurred while merging PDFs." });
  }
});

app.listen(port, () => {
  console.log(`PDF merger app listening on http://localhost:${port}`);
});
