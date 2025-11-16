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
    // Use wide viewport to allow content to render at natural width
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

    // Emulate screen media to get browser layout
    await page.emulateMedia({ media: 'screen' });

    // Inject CSS to minimize whitespace and prevent orphaned elements
    await page.addStyleTag({
      content: `
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body, html {
          margin: 0 !important;
          padding: 0 !important;
        }
        @page {
          margin: 0;
        }
        /* Prevent footers and other elements from being orphaned */
        footer, .footer, [role="contentinfo"],
        nav, .nav, .navigation, [role="navigation"],
        header, .header, [role="banner"] {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
        /* Keep sections together */
        section, article, .section, .content {
          break-inside: avoid-page !important;
          page-break-inside: avoid !important;
        }
        /* Prevent breaks after headings */
        h1, h2, h3, h4, h5, h6 {
          break-after: avoid !important;
          page-break-after: avoid !important;
        }
      `
    });

    // Get accurate content dimensions
    const { contentWidth, contentHeight } = await page.evaluate(() => {
      const width = Math.max(
        document.body.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.clientWidth,
        document.documentElement.scrollWidth,
        document.documentElement.offsetWidth
      );
      const height = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      return { contentWidth: width, contentHeight: height };
    });

    console.log(`[${index}] Content size: ${contentWidth}x${contentHeight}px - Generating PDF with selectable text...`);

    // Generate PDF with native text (selectable/copyable)
    await page.pdf({
      path: outputPath,
      width: `${contentWidth}px`,
      height: `${contentHeight}px`,
      printBackground: true,
      margin: {
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px'
      }
    });

    // Post-process to remove blank trailing pages
    console.log(`[${index}] Post-processing PDF to remove blank pages...`);
    await removeBlankTrailingPages(outputPath);

    return outputPath;
  } catch (error) {
    console.error(`[${index}] Error processing ${url}:`, error);
    throw error;
  }
}

async function removeBlankTrailingPages(pdfPath: string): Promise<void> {
  try {
    const pdfBytes = readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();

    if (pageCount <= 1) {
      return; // Nothing to check
    }

    const lastPage = pdfDoc.getPage(pageCount - 1);
    const secondLastPage = pdfDoc.getPage(pageCount - 2);

    const lastPageHeight = lastPage.getHeight();
    const secondLastPageHeight = secondLastPage.getHeight();

    // Calculate what percentage the last page is of the previous page
    const heightRatio = lastPageHeight / secondLastPageHeight;

    const BLANK_THRESHOLD = 0.10;
    const SAME_HEIGHT_THRESHOLD = 0.95; // If within 95% of same height

    let shouldRemove = false;
    let reason = '';

    // Case 1: Last page is tiny compared to previous (< 10% height)
    if (heightRatio < BLANK_THRESHOLD) {
      shouldRemove = true;
      reason = `only ${(heightRatio * 100).toFixed(1)}% of previous page height`;
    }
    // Case 2: Pages are same/similar height (pagination artifact)
    // This happens when Chromium splits content across equal-sized pages
    else if (heightRatio >= SAME_HEIGHT_THRESHOLD) {
      shouldRemove = true;
      reason = `same height as previous page (${(heightRatio * 100).toFixed(1)}% - likely pagination artifact)`;
    }

    if (shouldRemove) {
      console.log(`   Removing last page - ${reason}`);
      pdfDoc.removePage(pageCount - 1);

      const modifiedPdfBytes = await pdfDoc.save();
      writeFileSync(pdfPath, modifiedPdfBytes);
    } else {
      console.log(`   Keeping last page - ${(heightRatio * 100).toFixed(1)}% of previous page height`);
    }
  } catch (error) {
    console.error(`   Warning: Could not post-process PDF: ${error}`);
    // Don't fail the whole process if post-processing fails
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
