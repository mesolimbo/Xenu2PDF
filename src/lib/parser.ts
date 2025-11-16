import { parse } from 'csv-parse/sync';

export interface XenuRecord {
  OriginPage: string;
  LinkToPage: string;
  LinkToPageStatusCode: string;
  LinkToPageStatusText: string;
  LinkToPageTitle: string;
  OriginPageDate: string;
  OriginPageTitle: string;
}

export function parseXenuContent(content: string): XenuRecord[] {
  const records = parse(content, {
    columns: true,
    delimiter: '\t',
    skip_empty_lines: true,
    quote: false, // Disable quote parsing for raw TSV files
    relax_quotes: true, // Don't treat quotes as special characters
  }) as XenuRecord[];

  return records;
}

export function filterByStatusCode(records: XenuRecord[], statusCode: string = '200'): XenuRecord[] {
  return records.filter(r => r.LinkToPageStatusCode === statusCode);
}

export function extractUniqueOriginPages(records: XenuRecord[]): string[] {
  const urls = [...new Set(records.map(r => r.OriginPage))].filter(Boolean);
  // Sort URLs alphabetically for consistent ordering
  return urls.sort();
}

export function parseXenuFile(content: string): string[] {
  const records = parseXenuContent(content);
  const successfulRecords = filterByStatusCode(records, '200');
  const urls = extractUniqueOriginPages(successfulRecords);
  return urls;
}
