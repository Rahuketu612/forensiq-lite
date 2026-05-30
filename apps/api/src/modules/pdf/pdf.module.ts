import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { OcrService } from './ocr.service';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
      },
    }),
  ],
  controllers: [PdfController],
  providers: [PdfService, OcrService],
  exports: [PdfService, OcrService],
})
export class PdfModule {}

// Export types for use in other modules
export { PdfService, PdfTextResult } from './pdf.service';
export { OcrService, OcrResult } from './ocr.service';
