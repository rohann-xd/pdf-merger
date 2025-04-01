
# 📄 **PDF Merger App**

A simple web application that allows users to merge multiple PDF files into one. Users can upload multiple PDFs, merge them, and view the final document directly in the browser.

---

## 🚀 **Features**
- Upload and merge up to 10 PDF files at once.
- Merged PDFs open directly in the browser.
- Option to download the merged PDF if needed.
- PDF format validation to ensure only PDF files are accepted.
- Handle oversized files with error messages and show skipped files due to size issues.

---

## ⚙️ **Technologies Used**
- **Node.js** with **Express** for the backend
- **Multer** for handling file uploads
- **AWS SDK** for uploading files to S3 storage
- **JavaScript (ES6)** for modern syntax
- **EJS** for templating and rendering HTML views

---

## 📥 **Installation**

1. **Clone the repository:**  
   ```bash
   git clone https://github.com/rohann-xd/pdf-merger.git
   cd pdf-merger
   ```

2. **Install dependencies:**  
   ```bash
   npm install
   ```

3. **Run the server:**  
   ```bash
   node server.js
   ```

4. **Open in your browser:**  
   [http://localhost:3000](http://localhost:3000)

---

## 📤 **Usage**

1. Go to the web page.
2. Upload 2 or more PDF files (up to 10).
3. Click the merge button.
4. The merged PDF will open directly in your browser.
5. Use the browser’s download option if needed.
6. In case of errors due to file size, a message will be displayed, and any files exceeding 2MB will be skipped.

---

## 🗂️ **Project Structure**
```
pdf-merger-app/
├── templates/            # HTML templates
├── uploads/              # Temporary upload directory
├── server.js             # Main server file
├── pdfMerge.js           # PDF merging logic
├── package.json          # Project dependencies
└── README.txt            # This file
```

---

## ✅ **To Do / Future Enhancements**
- Add support for more file types (e.g., DOCX, images)
- Implement user authentication (optional)
- Add progress indicators for large files

---

## 🤝 **Contributing**

Contributions are welcome!
- Fork the repository
- Create a feature branch (`git checkout -b feature-branch`)
- Commit your changes (`git commit -m 'Add new feature'`)
- Push to the branch (`git push origin feature-branch`)
- Create a new Pull Request