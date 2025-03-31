const express = require("express");
const app = express();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const path = require("path");
const { mergPdfs } = require("./pdfMerge");
const port = 3000;

app.use("/static", express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates/index.html"));
});

app.post("/merge", upload.array("pdfs", 2), function (req, res, next) {
  console.log(req.files);
  mergPdfs(
    path.join(__dirname, req.files[0].path),
    path.join(__dirname, req.files[1].path)
  );
  res.redirect("http://localhost:3000/static/merged.pdf");
});

app.listen(port, () => {
  console.log(`PDF merger app listening on port http://localhost:${port}`);
});
