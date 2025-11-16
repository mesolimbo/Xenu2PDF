import { describe, it, expect } from '@jest/globals';
import {
  parseXenuContent,
  filterByStatusCode,
  extractUniqueOriginPages,
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

  describe('extractUniqueOriginPages', () => {
    let records: XenuRecord[];

    beforeEach(() => {
      records = parseXenuContent(sampleXenuContent);
    });

    it('should extract unique origin pages', () => {
      const urls = extractUniqueOriginPages(records);

      expect(urls).toHaveLength(3);
      expect(urls).toEqual([
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3',
      ]);
    });

    it('should preserve order of first occurrence', () => {
      const urls = extractUniqueOriginPages(records);

      // page1 appears first (index 0), then page2 (index 1), then page3 (index 3)
      expect(urls[0]).toBe('https://example.com/page1');
      expect(urls[1]).toBe('https://example.com/page2');
      expect(urls[2]).toBe('https://example.com/page3');
    });

    it('should filter out empty values', () => {
      const recordsWithEmpty: XenuRecord[] = [
        ...records,
        {
          OriginPage: '',
          LinkToPage: 'https://example.com/link6',
          LinkToPageStatusCode: '200',
          LinkToPageStatusText: 'ok',
          LinkToPageTitle: 'Link 6',
          OriginPageDate: '',
          OriginPageTitle: '',
        },
      ];

      const urls = extractUniqueOriginPages(recordsWithEmpty);

      expect(urls).toHaveLength(3);
      expect(urls).not.toContain('');
    });
  });

  describe('parseXenuFile (integration)', () => {
    it('should parse, filter, and extract URLs correctly', () => {
      const urls = parseXenuFile(sampleXenuContent);

      // Should filter to status 200 only, then extract unique origin pages
      expect(urls).toHaveLength(3);
      expect(urls).toEqual([
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3',
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
      expect(urls[0]).toBe('https://example.com/page1');
    });
  });
});
