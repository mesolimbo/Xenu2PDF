import { describe, it, expect } from '@jest/globals';
import {
  parseXenuContent,
  filterByStatusCode,
  extractUniquePages,
  parseXenuFile,
  XenuRecord,
} from '../lib/parser';

describe('Parser Module', () => {
  const sampleXenuContent = `OriginPage\tLinkToPage\tLinkToPageStatusCode\tLinkToPageStatusText\tLinkToPageTitle\tOriginPageDate\tOriginPageTitle
https://example.com/page1\thttps://example.com/link1\t200\tok\tLink 1\t\tPage 1
https://example.com/page2\thttps://example.com/link2\t200\tok\tLink 2\t\tPage 2
https://example.com/page1\thttps://example.com/link3\t404\tnot found\tLink 3\t\tPage 1
https://example.com/page3\thttps://example.com/link4\t200\tok\tLink 4\t\tPage 3
https://example.com/page1\thttps://example.com/link5\t200\tok\tLink 5\t\tPage 1`;

  describe('parseXenuContent', () => {
    it('should parse tab-separated Xenu content correctly', () => {
      const records = parseXenuContent(sampleXenuContent);

      expect(records).toHaveLength(5);
      expect(records[0]).toEqual({
        OriginPage: 'https://example.com/page1',
        LinkToPage: 'https://example.com/link1',
        LinkToPageStatusCode: '200',
        LinkToPageStatusText: 'ok',
        LinkToPageTitle: 'Link 1',
        OriginPageDate: '',
        OriginPageTitle: 'Page 1',
      });
    });

    it('should handle empty content', () => {
      const emptyContent = 'OriginPage\tLinkToPage\tLinkToPageStatusCode\tLinkToPageStatusText\tLinkToPageTitle\tOriginPageDate\tOriginPageTitle\n';
      const records = parseXenuContent(emptyContent);

      expect(records).toHaveLength(0);
    });

    it('should handle quotes in TSV content without errors', () => {
      const contentWithQuotes = `OriginPage\tLinkToPage\tLinkToPageStatusCode\tLinkToPageStatusText\tLinkToPageTitle\tOriginPageDate\tOriginPageTitle
https://example.com/page1\thttps://example.com/link1\t200\tok\tLink 1\t\t<span title="Page Title">Page 1</span>
https://example.com/page2\thttps://example.com/link2\t200\tok\t"Quoted Title"\t\tPage 2`;

      const records = parseXenuContent(contentWithQuotes);

      expect(records).toHaveLength(2);
      expect(records[0].OriginPageTitle).toBe('<span title="Page Title">Page 1</span>');
      expect(records[1].LinkToPageTitle).toBe('"Quoted Title"');
    });
  });

  describe('filterByStatusCode', () => {
    let records: XenuRecord[];

    beforeEach(() => {
      records = parseXenuContent(sampleXenuContent);
    });

    it('should filter records with status code 200', () => {
      const filtered = filterByStatusCode(records, '200');

      expect(filtered).toHaveLength(4);
      filtered.forEach(record => {
        expect(record.LinkToPageStatusCode).toBe('200');
      });
    });

    it('should filter records with custom status code', () => {
      const filtered = filterByStatusCode(records, '404');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].LinkToPageStatusCode).toBe('404');
    });

    it('should return empty array when no records match', () => {
      const filtered = filterByStatusCode(records, '500');

      expect(filtered).toHaveLength(0);
    });

    it('should default to status code 200', () => {
      const filtered = filterByStatusCode(records);

      expect(filtered).toHaveLength(4);
    });
  });

  describe('extractUniquePages', () => {
    let records: XenuRecord[];

    beforeEach(() => {
      records = parseXenuContent(sampleXenuContent);
    });

    it('should extract unique pages by LinkToPageTitle', () => {
      const urls = extractUniquePages(records);

      // Should have 5 unique titles, extracting their LinkToPage URLs
      expect(urls).toHaveLength(5);
      expect(urls).toEqual([
        'https://example.com/link1',
        'https://example.com/link2',
        'https://example.com/link3',
        'https://example.com/link4',
        'https://example.com/link5',
      ]);
    });

    it('should preserve order of first occurrence', () => {
      const testContent = `OriginPage\tLinkToPage\tLinkToPageStatusCode\tLinkToPageStatusText\tLinkToPageTitle\tOriginPageDate\tOriginPageTitle
https://example.com/p1\thttps://example.com/link-a\t200\tok\tTitle A\t\tPage 1
https://example.com/p2\thttps://example.com/link-b\t200\tok\tTitle B\t\tPage 2
https://example.com/p3\thttps://example.com/link-c\t200\tok\tTitle A\t\tPage 3
https://example.com/p4\thttps://example.com/link-d\t200\tok\tTitle C\t\tPage 4`;

      const testRecords = parseXenuContent(testContent);
      const urls = extractUniquePages(testRecords);

      // Should only include first occurrence of "Title A"
      expect(urls).toHaveLength(3);
      expect(urls).toEqual([
        'https://example.com/link-a', // First "Title A"
        'https://example.com/link-b', // "Title B"
        'https://example.com/link-d', // "Title C"
      ]);
    });

    it('should filter out empty values', () => {
      const recordsWithEmpty: XenuRecord[] = [
        ...records,
        {
          OriginPage: 'https://example.com/page6',
          LinkToPage: '',
          LinkToPageStatusCode: '200',
          LinkToPageStatusText: 'ok',
          LinkToPageTitle: 'Empty Link',
          OriginPageDate: '',
          OriginPageTitle: '',
        },
        {
          OriginPage: 'https://example.com/page7',
          LinkToPage: 'https://example.com/link7',
          LinkToPageStatusCode: '200',
          LinkToPageStatusText: 'ok',
          LinkToPageTitle: '',
          OriginPageDate: '',
          OriginPageTitle: '',
        },
      ];

      const urls = extractUniquePages(recordsWithEmpty);

      // Should only include records with both title and URL
      expect(urls).toHaveLength(5);
      expect(urls).not.toContain('');
    });
  });

  describe('parseXenuFile (integration)', () => {
    it('should parse, filter, and extract URLs correctly', () => {
      const urls = parseXenuFile(sampleXenuContent);

      // Should filter to status 200 only, then extract unique pages by title
      expect(urls).toHaveLength(4);
      expect(urls).toEqual([
        'https://example.com/link1',
        'https://example.com/link2',
        'https://example.com/link4',
        'https://example.com/link5',
      ]);
    });

    it('should handle content with no 200 status codes', () => {
      const content = `OriginPage\tLinkToPage\tLinkToPageStatusCode\tLinkToPageStatusText\tLinkToPageTitle\tOriginPageDate\tOriginPageTitle
https://example.com/page1\thttps://example.com/link1\t404\tnot found\tLink 1\t\tPage 1
https://example.com/page2\thttps://example.com/link2\t500\terror\tLink 2\t\tPage 2`;

      const urls = parseXenuFile(content);

      expect(urls).toHaveLength(0);
    });

    it('should handle minimal valid content', () => {
      const content = `OriginPage\tLinkToPage\tLinkToPageStatusCode\tLinkToPageStatusText\tLinkToPageTitle\tOriginPageDate\tOriginPageTitle
https://example.com/page1\thttps://example.com/link1\t200\tok\tLink 1\t\tPage 1`;

      const urls = parseXenuFile(content);

      expect(urls).toHaveLength(1);
      expect(urls[0]).toBe('https://example.com/link1');
    });
  });
});
