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
    // Set a desktop viewport size to avoid mobile/tablet layouts
    await page.setViewportSize({ width: 1920, height: 1080 });

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

    // Emulate screen media instead of print to get the same layout as browser
    await page.emulateMedia({ media: 'screen' });

    // Inject CSS to prevent page breaks and ensure single-page output
    await page.addStyleTag({
      content: `
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body, html {
          page-break-inside: avoid !important;
          page-break-after: avoid !important;
          page-break-before: avoid !important;
        }
      `
    });

    // Get the full page height - use the larger of body or documentElement
    const pageHeight = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
    });
    console.log(`[${index}] Page height: ${pageHeight}px`);

    // Generate PDF with full page height as a single page
    // Note: Playwright may still paginate based on default page size limits
    await page.pdf({
      path: outputPath,
      width: '1920px',
      height: `${Math.min(pageHeight, 14400)}px`, // Cap at ~10 A4 pages to avoid issues
      printBackground: true,
      preferCSSPageSize: false,
      scale: 1,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
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
