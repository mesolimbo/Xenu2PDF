# Xenu2PDF

Convert Xenu Link Sleuth reports to PDF. This tool reads a tab-separated CSV file exported from Xenu Link Sleuth, visits each unique URL, saves them as individual PDFs, and merges them all into a single PDF document.

## Installation

```bash
npm install
```

## Preparation

Use [Xenu Link Sleuth](https://xenus-link-sleuth.en.softonic.com/) to crawl a site. Be sure to configure it with the right options to crawl only the pages you need (e.g. No external crawls, include/exclude filters, limit crawl depth, etc.)

When Xenu is done, use the `File > Export Page Map to TAB separated File...` option.

## Usage

Run the tool with a Xenu TSV file as input:

```bash
npm start <path-to-xenu-file.tsv>
```

### Example

```bash
npm start .tmp/phaser-docs.tsv
```

This will:
1. Parse the Xenu TSV file
2. Filter records to only include those with `LinkToPageStatusCode` of 200
3. Extract unique URLs from the `LinkToPage` column (using `LinkToPageTitle` for uniqueness)
4. Preserve the original order (no sorting)
5. Visit each URL using Playwright (headless Chromium) - processes 8 pages in parallel for performance
6. Scroll through each page to load all content (handles lazy loading)
7. Inject CSS to minimize whitespace and margins
8. Generate PDF with selectable/copyable text
9. Post-process to remove blank trailing pages
10. Merge all PDFs into a single file

**Note**: PDFs have selectable text and use dynamic width/height to capture full content without cropping. Very long pages may span multiple PDF pages due to browser engine limits (~14,400px).

### Output

The tool creates an `output` directory with:
- A `pages` subdirectory containing individual PDF files (named `page-0001.pdf`, `page-0002.pdf`, etc.)
- A merged PDF file containing all pages (same name as input file: `<filename>.pdf`)

Example output structure:
```
output/
  phaser-docs/
    pages/
      page-0001.pdf
      page-0002.pdf
      page-0003.pdf
      ...
    phaser-docs.pdf
```

## Development

Build the TypeScript code:

```bash
npm run build
```

Run in development mode:

```bash
npm run dev <path-to-xenu-file.csv>
```

### Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

The tests are fast and don't fetch real content - they use mocks for file system operations, Playwright, and PDF generation.

## Requirements

- Node.js 18 or higher
- Chromium browser (automatically installed by Playwright)
- [Xenu's Link Sleuth](https://xenus-link-sleuth.en.softonic.com/) ([FAQ](https://home.snafu.de/tilman/xenulink.html))

## Dependencies

- **Playwright**: Browser automation for capturing web pages
- **pdf-lib**: PDF manipulation and merging
- **csv-parse**: Parsing Xenu TSV files
- **TypeScript**: Type-safe development

