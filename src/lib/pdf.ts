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
    // Set a reasonable viewport size
    await page.setViewportSize({ width: 1280, height: 1024 });

    // Navigate and wait for network to be idle
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait a bit for any initial animations or dynamic content
    await page.waitForTimeout(1000);

    // Scroll through the entire page to trigger lazy loading
    console.log(`[${index}] Scrolling to load all content...`);
    await autoScroll(page);

    // Wait for any lazy-loaded content to finish loading
    await page.waitForTimeout(2000);

    // Wait for network to be idle again after scrolling
    await page.waitForLoadState('networkidle');

    console.log(`[${index}] Saving PDF: ${sanitizedFilename}`);

    // Generate PDF with full page height
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    return outputPath;
  } catch (error) {
    console.error(`[${index}] Error processing ${url}:`, error);
    throw error;
  }
}

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          // Scroll back to top
          window.scrollTo(0, 0);
          resolve();
        }
      }, 100);
    });
  });
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
