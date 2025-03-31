import PDFMerger from "pdf-merger-js";

const mergPdfs = async (...files) => {
  try {
    const merger = new PDFMerger();

    for (const file of files) {
      await merger.add(file);
    }

    const d = new Date().getTime();
    await merger.save(`public/${d}.pdf`);
    return d;
  } catch (error) {
    console.error("Error merging PDFs:", error);
  }
};

export { mergPdfs };
