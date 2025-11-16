# Xenu2PDF

Convert Xenu Link Sleuth reports to PDF. This tool reads a tab-separated CSV file exported from Xenu Link Sleuth, visits each unique URL, saves them as individual PDFs, and merges them all into a single PDF document.

## Installation

```bash
npm install
```

## Usage

Run the tool with a Xenu CSV file as input:

```bash
npm start <path-to-xenu-file.csv>
```

### Example

```bash
npm start .tmp/phaser-docs.csv
```

This will:
1. Parse the Xenu CSV file
2. Extract unique URLs from the `LinkToPage` column
3. Visit each URL using Playwright (headless Chromium)
4. Save each page as a PDF
5. Merge all PDFs into a single file

### Output

The tool creates an `output` directory with:
- Individual PDF files for each page (named `page-0001.pdf`, `page-0002.pdf`, etc.)
- A merged PDF file containing all pages (`<filename>-merged.pdf`)

Example output structure:
```
output/
  phaser-docs/
    page-0001.pdf
    page-0002.pdf
    page-0003.pdf
    ...
    phaser-docs-merged.pdf
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

## Requirements

- Node.js 18 or higher
- Chromium browser (automatically installed by Playwright)

## Dependencies

- **Playwright**: Browser automation for capturing web pages
- **pdf-lib**: PDF manipulation and merging
- **csv-parse**: Parsing Xenu CSV files
- **TypeScript**: Type-safe development
