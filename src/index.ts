import { chromium, Browser, Page } from 'playwright';
import { parse } from 'csv-parse/sync';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { PDFDocument } from 'pdf-lib';
import { join, basename } from 'path';

interface XenuRecord {
  OriginPage: string;
  LinkToPage: string;
  LinkToPageStatusCode: string;
  LinkToPageStatusText: string;
  LinkToPageTitle: string;
  OriginPageDate: string;
  OriginPageTitle: string;
}

async function parseXenuFile(filePath: string): Promise<string[]> {
  console.log(`Reading Xenu file: ${filePath}`);
  const fileContent = readFileSync(filePath, 'utf-8');

  const records = parse(fileContent, {
    columns: true,
    delimiter: '\t',
    skip_empty_lines: true,
  }) as XenuRecord[];

  // Extract unique URLs from LinkToPage column
  const urls = [...new Set(records.map(r => r.LinkToPage))].filter(Boolean);
  console.log(`Found ${urls.length} unique URLs`);

  return urls;
}

async function savePageToPDF(page: Page, url: string, outputDir: string, index: number): Promise<string> {
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

async function mergePDFs(pdfPaths: string[], outputPath: string): Promise<void> {
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

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npm start <xenu-file.csv>');
    console.error('Example: npm start .tmp/phaser-docs.csv');
    process.exit(1);
  }

  const inputFile = args[0];

  if (!existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  // Create output directory
  const outputDir = join(process.cwd(), 'output', basename(inputFile, '.csv'));
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Output directory: ${outputDir}\n`);

  const urls = await parseXenuFile(inputFile);

  if (urls.length === 0) {
    console.log('No URLs found in the file.');
    return;
  }

  const browser: Browser = await chromium.launch({ headless: true });
  const page: Page = await browser.newPage();

  const pdfPaths: string[] = [];

  try {
    for (let i = 0; i < urls.length; i++) {
      const pdfPath = await savePageToPDF(page, urls[i], outputDir, i + 1);
      pdfPaths.push(pdfPath);
    }
  } finally {
    await browser.close();
  }

  // Merge all PDFs
  const mergedPdfPath = join(outputDir, `${basename(inputFile, '.csv')}-merged.pdf`);
  await mergePDFs(pdfPaths, mergedPdfPath);

  console.log('\nDone!');
  console.log(`Individual PDFs: ${outputDir}`);
  console.log(`Merged PDF: ${mergedPdfPath}`);
}

main().catch(console.error);
