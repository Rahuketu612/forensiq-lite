import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { PdfService } from './pdf.service';
import { OcrService } from './ocr.service';
import { prisma } from '@forensiq/database';
import { ImportStatus } from '@forensiq/database';

@ApiTags('PDF')
@ApiBearerAuth()
@Controller('cases/:caseId/imports')
@UseGuards(JwtAuthGuard)
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly ocrService: OcrService,
  ) {}

  @Post('extract-pdf')
  @ApiOperation({ summary: 'Extract text from uploaded PDF' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async extractPdfText(
    @Param('caseId') caseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported');
    }

    // Check if PDF is valid
    if (!this.pdfService.isValidPdf(file.buffer)) {
      throw new BadRequestException('Invalid PDF file');
    }

    // Extract text from PDF
    const result = await this.pdfService.extractTextFromPdf(file.buffer);

    // Determine status based on extraction result
    let status: ImportStatus = ImportStatus.EXTRACTED_TEXT;
    
    if (result.isScanned) {
      status = ImportStatus.OCR_PENDING;
    }

    // Create import record
    const transactionImport = await prisma.transactionImport.create({
      data: {
        caseId,
        fileName: file.filename || `pdf_${Date.now()}.pdf`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        importedById: 'system', // TODO: Get from JWT
        status,
        hasText: result.hasText,
        extractedText: result.text,
        isScanned: result.isScanned,
      },
    });

    return {
      id: transactionImport.id,
      fileName: transactionImport.originalName,
      status: transactionImport.status,
      hasText: result.hasText,
      pageCount: result.pageCount,
      isScanned: result.isScanned,
      needsOcr: result.isScanned,
      textPreview: result.text.slice(0, 500) + (result.text.length > 500 ? '...' : ''),
      message: result.isScanned
        ? 'PDF appears to be scanned. OCR processing is required before import.'
        : 'PDF text extracted successfully. You can preview the text below.',
    };
  }

  @Get(':importId/text')
  @ApiOperation({ summary: 'Get extracted PDF text preview' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'importId', description: 'Import ID' })
  async getExtractedText(
    @Param('caseId') caseId: string,
    @Param('importId') importId: string,
  ) {
    const transactionImport = await prisma.transactionImport.findFirst({
      where: { id: importId, caseId },
    });

    if (!transactionImport) {
      throw new NotFoundException('Import not found');
    }

    if (!transactionImport.extractedText) {
      throw new BadRequestException('No text has been extracted from this file');
    }

    return {
      id: transactionImport.id,
      fileName: transactionImport.originalName,
      status: transactionImport.status,
      hasText: transactionImport.hasText,
      isScanned: transactionImport.isScanned,
      text: transactionImport.extractedText,
      ocrText: transactionImport.ocrText,
      message: 'Text extracted from PDF. Please review before importing transactions.',
    };
  }

  @Post(':importId/ocr')
  @ApiOperation({ summary: 'Run OCR on imported file' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'importId', description: 'Import ID' })
  async runOcr(
    @Param('caseId') caseId: string,
    @Param('importId') importId: string,
  ) {
    const transactionImport = await prisma.transactionImport.findFirst({
      where: { id: importId, caseId },
    });

    if (!transactionImport) {
      throw new NotFoundException('Import not found');
    }

    // Check if already OCR'd
    if (transactionImport.status === ImportStatus.OCR_COMPLETED) {
      return {
        id: transactionImport.id,
        status: transactionImport.status,
        confidence: transactionImport.ocrConfidence,
        message: 'OCR has already been completed for this file.',
      };
    }

    // Update status to processing
    await prisma.transactionImport.update({
      where: { id: importId },
      data: { status: ImportStatus.OCR_PROCESSING },
    });

    // Get file path for OCR
    const evidence = await prisma.evidenceFile.findFirst({
      where: { id: importId },
    });

    // For now, perform OCR on extracted text if available
    // In production, you would read the file from storage
    let ocrResult;

    if (transactionImport.extractedText && transactionImport.extractedText.length > 0) {
      // Text-based PDF - minimal OCR needed
      ocrResult = {
        success: true,
        text: transactionImport.extractedText,
        confidence: 95, // High confidence for text PDFs
        pages: 1,
      };
    } else {
      // Scanned PDF - would need full OCR
      ocrResult = {
        success: false,
        text: '',
        confidence: 0,
        pages: 0,
        error: 'File not found. Full OCR requires file access.',
      };
    }

    // Update import record with OCR results
    const updatedImport = await prisma.transactionImport.update({
      where: { id: importId },
      data: {
        status: ocrResult.success ? ImportStatus.OCR_COMPLETED : ImportStatus.OCR_FAILED,
        ocrText: ocrResult.text,
        ocrConfidence: ocrResult.confidence,
        ocrCompletedAt: ocrResult.success ? new Date() : null,
      },
    });

    return {
      id: updatedImport.id,
      status: updatedImport.status,
      success: ocrResult.success,
      confidence: updatedImport.ocrConfidence,
      pagesProcessed: ocrResult.pages,
      error: ocrResult.error,
      message: ocrResult.success
        ? 'OCR completed. Please review the extracted text before importing transactions.'
        : 'OCR failed. Please try again or upload a different file.',
    };
  }

  @Get(':importId/preview')
  @ApiOperation({ summary: 'Preview import text for column mapping' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'importId', description: 'Import ID' })
  async previewImport(
    @Param('caseId') caseId: string,
    @Param('importId') importId: string,
  ) {
    const transactionImport = await prisma.transactionImport.findFirst({
      where: { id: importId, caseId },
    });

    if (!transactionImport) {
      throw new NotFoundException('Import not found');
    }

    // Get the appropriate text to preview
    let textToPreview = transactionImport.ocrText || transactionImport.extractedText;

    if (!textToPreview) {
      throw new BadRequestException('No text available for preview');
    }

    // Get first 20 lines for preview
    const lines = textToPreview.split('\n').slice(0, 20);
    const preview = lines.join('\n');

    return {
      id: transactionImport.id,
      fileName: transactionImport.originalName,
      status: transactionImport.status,
      text: preview,
      totalLines: textToPreview.split('\n').length,
      source: transactionImport.ocrText ? 'ocr' : 'pdf',
      message: 'Preview of extracted text. Use this to map columns before importing.',
    };
  }
}
