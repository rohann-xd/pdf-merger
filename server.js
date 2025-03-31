const express = require("express");
const app = express();
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const path = require("path");
const port = 3000;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates/index.html"));
});

app.post('/merge', upload.array('pdfs', 2), function (req, res, next) {
    console.log(req.files)
    res.send({data:req.files})
  })

app.listen(port, () => {
  console.log(`PDF merger app listening on port http://localhost:${port}`);
});
