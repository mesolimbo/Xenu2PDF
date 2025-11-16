import { Page } from 'playwright';
import { PDFDocument } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export async function savePageToPDF(
  page: Page,
  url: string,
  outputDir: string,
  index: number
): Promise<string> {
  const sanitizedFilename = `page-${String(index).padStart(4, '0')}.pdf`;
  const outputPath = join(outputDir, sanitizedFilename);

  console.log(`[${index}] Navigating to: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log(`[${index}] Saving PDF: ${sanitizedFilename}`);
    await page.pdf({ path: outputPath, format: 'A4' });
    return outputPath;
  } catch (error) {
    console.error(`[${index}] Error processing ${url}:`, error);
    throw error;
  }
}

export async function mergePDFs(pdfPaths: string[], outputPath: string): Promise<void> {
  console.log(`\nMerging ${pdfPaths.length} PDFs...`);

  const mergedPdf = await PDFDocument.create();

  for (const pdfPath of pdfPaths) {
    const pdfBytes = readFileSync(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const mergedPdfBytes = await mergedPdf.save();
  writeFileSync(outputPath, mergedPdfBytes);
  console.log(`Merged PDF saved to: ${outputPath}`);
}
