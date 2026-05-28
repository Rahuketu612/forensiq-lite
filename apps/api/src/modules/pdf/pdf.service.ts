import { Injectable, BadRequestException } from '@nestjs/common';

export interface PdfTextResult {
  hasText: boolean;
  text: string;
  pageCount: number;
  isScanned: boolean;
}

export interface OcrResult {
  success: boolean;
  text: string;
  confidence: number;
  pages: number;
}

@Injectable()
export class PdfService {
  /**
   * Extract text from a PDF file buffer
   * Uses pdf-parse for text extraction
   */
  async extractTextFromPdf(buffer: Buffer): Promise<PdfTextResult> {
    try {
      // Dynamic import to handle cases where pdf-parse is not installed
      const pdfParse = (await import('pdf-parse')).default;
      
      const data = await pdfParse(buffer);
      
      const text = data.text?.trim() || '';
      const hasText = text.length > 0;
      const pageCount = data.numpages || 0;
      
      // A PDF is considered "scanned" if:
      // 1. No text was extracted (all content is likely images)
      // 2. Text is very short compared to page count (might be image-only pages)
      const isScanned = !hasText || (pageCount > 0 && text.length < pageCount * 50);
      
      return {
        hasText,
        text,
        pageCount,
        isScanned,
      };
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      throw new BadRequestException('Failed to extract text from PDF');
    }
  }

  /**
   * Check if a file is a valid PDF
   */
  isValidPdf(buffer: Buffer): boolean {
    // PDF files start with %PDF
    const header = buffer.slice(0, 4).toString('ascii');
    return header === '%PDF';
  }

  /**
   * Get PDF metadata (page count, info)
   */
  async getPdfInfo(buffer: Buffer): Promise<{ pageCount: number; info?: Record<string, unknown> }> {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      
      return {
        pageCount: data.numpages || 0,
        info: data.info,
      };
    } catch (error) {
      console.error('PDF info extraction failed:', error);
      return { pageCount: 0 };
    }
  }
}
