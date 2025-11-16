import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { mergePDFs } from '../lib/pdf';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';

// Mock pdf-lib
jest.mock('pdf-lib', () => ({
  PDFDocument: {
    create: jest.fn(),
    load: jest.fn(),
  },
}));

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('PDF Module', () => {
  describe('mergePDFs', () => {
    const mockPdfPaths = [
      '/path/to/page-0001.pdf',
      '/path/to/page-0002.pdf',
      '/path/to/page-0003.pdf',
    ];
    const outputPath = '/path/to/merged.pdf';

    let mockMergedPdf: any;
    let mockSourcePdf: any;
    let mockPage: any;

    beforeEach(() => {
      // Reset all mocks
      jest.clearAllMocks();

      // Create mock objects
      mockPage = { type: 'mockPage' };
      mockSourcePdf = {
        getPageIndices: jest.fn(() => [0, 1]),
      };
      mockMergedPdf = {
        copyPages: jest.fn(async () => [mockPage, mockPage]),
        addPage: jest.fn(),
        save: jest.fn(async () => new Uint8Array([1, 2, 3, 4])),
      };

      // Setup mocks
      (PDFDocument.create as any).mockResolvedValue(mockMergedPdf);
      (PDFDocument.load as any).mockResolvedValue(mockSourcePdf);
      (fs.readFileSync as any).mockReturnValue(Buffer.from('mock pdf content'));
      (fs.writeFileSync as any).mockReturnValue(undefined);
    });

    it('should merge multiple PDFs into one', async () => {
      await mergePDFs(mockPdfPaths, outputPath);

      // Should create a new PDF document
      expect(PDFDocument.create).toHaveBeenCalledTimes(1);

      // Should read each source PDF
      expect(fs.readFileSync).toHaveBeenCalledTimes(3);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockPdfPaths[0]);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockPdfPaths[1]);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockPdfPaths[2]);

      // Should load each PDF
      expect(PDFDocument.load).toHaveBeenCalledTimes(3);

      // Should copy pages from each PDF
      expect(mockMergedPdf.copyPages).toHaveBeenCalledTimes(3);

      // Should add all copied pages (2 pages per PDF * 3 PDFs = 6 pages)
      expect(mockMergedPdf.addPage).toHaveBeenCalledTimes(6);

      // Should save the merged PDF
      expect(mockMergedPdf.save).toHaveBeenCalledTimes(1);

      // Should write the merged PDF to disk
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        outputPath,
        expect.any(Uint8Array)
      );
    });

    it('should handle single PDF', async () => {
      const singlePdfPath = ['/path/to/single.pdf'];

      await mergePDFs(singlePdfPath, outputPath);

      expect(PDFDocument.create).toHaveBeenCalledTimes(1);
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
      expect(PDFDocument.load).toHaveBeenCalledTimes(1);
      expect(mockMergedPdf.copyPages).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it('should handle empty PDF array', async () => {
      await mergePDFs([], outputPath);

      // Should still create a PDF document (empty)
      expect(PDFDocument.create).toHaveBeenCalledTimes(1);

      // Should not read any files
      expect(fs.readFileSync).not.toHaveBeenCalled();

      // Should still save (empty PDF)
      expect(mockMergedPdf.save).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });
  });
});
