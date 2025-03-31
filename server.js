const express = require("express");
const app = express();
const multer = require("multer");
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed!"));
    }
    cb(null, true);
  },
});
const path = require("path");
const fs = require("fs").promises;
const { mergPdfs } = require("./pdfMerge");
const port = 3000;

app.use("/static", express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates/index.html"));
});

app.post("/merge", upload.array("pdfs", 10), async function (req, res) {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).send("Please upload at least 2 PDF files.");
    }

    const filePaths = req.files.map((file) => path.join(__dirname, file.path));
    const mergedFileId = await mergPdfs(...filePaths);

    await Promise.all(filePaths.map((file) => fs.unlink(file)));

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${mergedFileId}.pdf"`
    );
    res.sendFile(path.join(__dirname, `public/${mergedFileId}.pdf`));
  } catch (error) {
    console.error("Error during merge:", error);
    res.status(500).send("An error occurred while merging PDFs.");
  }
});

app.listen(port, () => {
  console.log(`PDF merger app listening on port http://localhost:${port}`);
});
