import { Injectable, BadRequestException } from '@nestjs/common';

export interface OcrResult {
  success: boolean;
  text: string;
  confidence: number;
  pages: number;
  error?: string;
}

export interface OcrProgress {
  status: string;
  progress: number;
}

@Injectable()
export class OcrService {
  /**
   * Perform OCR on image/PDF buffer using Tesseract.js
   * Returns raw text that needs manual review before import
   */
  async performOcr(
    buffer: Buffer,
    mimeType: string,
    onProgress?: (progress: OcrProgress) => void,
  ): Promise<OcrResult> {
    try {
      // Dynamic import to handle optional dependency
      const Tesseract = await import('tesseract.js');
      
      // Create worker with English language
      const worker = await Tesseract.createWorker('eng');
      
      // Set up progress callback
      if (onProgress) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (worker as any).on('progress', (progress: { status: string; progress: number }) => {
          onProgress({
            status: progress.status,
            progress: Math.round(progress.progress * 100),
          });
        });
      }
      
      // Perform OCR
      const { data } = await worker.recognize(buffer);
      
      // Terminate worker
      await worker.terminate();
      
      return {
        success: true,
        text: data.text,
        confidence: data.confidence,
        pages: 1, // Tesseract processes one image at a time
      };
    } catch (error) {
      console.error('OCR processing failed:', error);
      return {
        success: false,
        text: '',
        confidence: 0,
        pages: 0,
        error: error instanceof Error ? error.message : 'OCR processing failed',
      };
    }
  }

  /**
   * Perform OCR on a PDF (for scanned PDFs)
   * Each page is processed as an image
   */
  async performOcrOnPdf(
    buffer: Buffer,
    onProgress?: (progress: OcrProgress) => void,
  ): Promise<OcrResult> {
    try {
      // Dynamic imports
      const pdfParse = (await import('pdf-parse')).default;
      const Tesseract = await import('tesseract.js');
      
      // Extract images from PDF (basic implementation)
      // For full PDF OCR, you'd need pdf-lib + image extraction
      // This is a simplified version that processes the PDF buffer as-is
      const data = await pdfParse(buffer);
      
      const worker = await Tesseract.createWorker('eng');
      let fullText = '';
      let totalConfidence = 0;
      let pagesProcessed = 0;
      
      if (onProgress) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (worker as any).on('progress', (progress: { status: string; progress: number }) => {
          onProgress({
            status: `Processing page ${pagesProcessed + 1}: ${progress.status}`,
            progress: Math.round(progress.progress * 100),
          });
        });
      }
      
      // Note: Full PDF OCR with page-by-page processing requires
      // additional image extraction from PDF. This is a placeholder
      // that processes the entire PDF as a single unit.
      const { data: ocrData } = await worker.recognize(buffer);
      
      fullText = ocrData.text;
      totalConfidence = ocrData.confidence;
      pagesProcessed = data.numpages || 1;
      
      await worker.terminate();
      
      return {
        success: true,
        text: fullText,
        confidence: totalConfidence,
        pages: pagesProcessed,
      };
    } catch (error) {
      console.error('PDF OCR processing failed:', error);
      return {
        success: false,
        text: '',
        confidence: 0,
        pages: 0,
        error: error instanceof Error ? error.message : 'PDF OCR failed',
      };
    }
  }

  /**
   * Estimate if a PDF needs OCR based on extracted text
   */
  needsOcr(text: string, pageCount: number): boolean {
    // If text is empty or very short per page, OCR might help
    const avgCharsPerPage = text.length / Math.max(pageCount, 1);
    return avgCharsPerPage < 100;
  }
}
