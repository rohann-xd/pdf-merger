import PDFMerger from "pdf-merger-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import "dotenv/config";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const mergPdfs = async (...files) => {
  try {
    const merger = new PDFMerger();

    for (const file of files) {
      await merger.add(file);
    }

    const d = new Date().getTime();
    const mergedPdfBuffer = await merger.saveAsBuffer();

    const s3Key = `merged/${d}.pdf`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: s3Key,
        Body: mergedPdfBuffer,
        ContentType: "application/pdf",
      })
    );

    return { id: d, s3Key };
  } catch (error) {
    console.error("Error merging PDFs or uploading to S3:", error);
    throw error;
  }
};

export { mergPdfs };
