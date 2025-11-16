import { chromium, Browser, Page } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import { parseXenuFile } from './lib/parser';
import { savePageToPDF, mergePDFs } from './lib/pdf';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npm start <xenu-file.tsv>');
    console.error('Example: npm start .tmp/phaser-docs.tsv');
    process.exit(1);
  }

  const inputFile = args[0];

  if (!existsSync(inputFile)) {
    console.error(`File not found: ${inputFile}`);
    process.exit(1);
  }

  // Create output directory
  const outputDir = join(process.cwd(), 'output', basename(inputFile, '.tsv'));
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Output directory: ${outputDir}\n`);

  // Parse Xenu TSV file
  console.log(`Reading Xenu TSV file: ${inputFile}`);
  const fileContent = readFileSync(inputFile, 'utf-8');
  const urls = parseXenuFile(fileContent);

  console.log(`Found ${urls.length} unique URLs to process`);

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
  const mergedPdfPath = join(outputDir, `${basename(inputFile, '.tsv')}.pdf`);
  await mergePDFs(pdfPaths, mergedPdfPath);

  console.log('\nDone!');
  console.log(`Individual PDFs: ${outputDir}`);
  console.log(`Final PDF: ${mergedPdfPath}`);
}

main().catch(console.error);
