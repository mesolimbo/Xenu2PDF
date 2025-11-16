import { chromium, Browser } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';
import pLimit from 'p-limit';
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
  const pagesDir = join(outputDir, 'pages');
  if (!existsSync(pagesDir)) {
    mkdirSync(pagesDir, { recursive: true });
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
  const CONCURRENCY = 8;
  const limit = pLimit(CONCURRENCY);

  console.log(`Processing ${urls.length} URLs with ${CONCURRENCY} parallel workers...\n`);

  const pdfPaths: string[] = [];

  try {
    // Process URLs in parallel with concurrency limit
    const tasks = urls.map((url, index) =>
      limit(async () => {
        const page = await browser.newPage();
        try {
          const pdfPath = await savePageToPDF(page, url, pagesDir, index + 1);
          pdfPaths[index] = pdfPath; // Preserve order
          return pdfPath;
        } finally {
          await page.close();
        }
      })
    );

    await Promise.all(tasks);
  } finally {
    await browser.close();
  }

  // Merge all PDFs
  const mergedPdfPath = join(outputDir, `${basename(inputFile, '.tsv')}.pdf`);
  await mergePDFs(pdfPaths, mergedPdfPath);

  console.log('\nDone!');
  console.log(`Individual PDFs: ${pagesDir}`);
  console.log(`Final PDF: ${mergedPdfPath}`);
}

main().catch(console.error);
