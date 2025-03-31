import PDFMerger from "pdf-merger-js";
import fs from "fs"; // Add this if you want to write the buffer directly

const mergPdfs = async (p1, p2) => {
  try {
    const merger = new PDFMerger();
    await merger.add(p1);
    await merger.add(p2);

    let d = new Date().getTime();
    // Save under a given name and reset the internal document
    await merger.save(`public/${d}.pdf`);
    return d;

    // If you need to export as a Buffer
    // const mergedPdfBuffer = await merger.saveAsBuffer();
    // fs.writeFileSync('merged.pdf', mergedPdfBuffer); // save the buffer to a file
  } catch (error) {
    console.error("Error merging PDFs:", error);
  }
};

export { mergPdfs };
