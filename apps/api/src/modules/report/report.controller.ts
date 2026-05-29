import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportService } from './report.service';
import { ReportExportQueryDto } from './report.dto';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('Report')
@ApiBearerAuth()
@Controller('cases/:caseId/report')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('preview')
  @ApiOperation({ summary: 'Get HTML preview of investigation report' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiOkResponse({ description: 'HTML report preview' })
  async getReportPreview(
    @Param('caseId') caseId: string,
    @Query() options: ReportExportQueryDto,
    @Res() res: Response,
  ) {
    // Use 'system' as placeholder - in real app, get from JWT
    const userId = 'auditor';
    
    const html = await this.reportService.generateHtmlReport(caseId, userId, options);
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  }

  @Get('export-json')
  @ApiOperation({ summary: 'Export investigation report as JSON' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiOkResponse({ description: 'JSON report data' })
  async exportJson(
    @Param('caseId') caseId: string,
    @Query() options: ReportExportQueryDto,
  ) {
    const userId = 'auditor';
    return this.reportService.generateReport(caseId, userId, options);
  }

  @Get('export-pdf')
  @ApiOperation({ 
    summary: 'Export investigation report as PDF',
    description: 'Falls back to JSON if PDF generation is not available'
  })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async exportPdf(
    @Param('caseId') caseId: string,
    @Query() options: ReportExportQueryDto,
    @Res() res: Response,
  ) {
    const userId = 'auditor';
    
    // Try PDF generation with puppeteer
    try {
      // Import puppeteer only if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const puppeteerModule = await import('puppeteer').catch(() => null) as any;
      
      if (puppeteerModule?.default || puppeteerModule) {
        const html = await this.reportService.generateHtmlReport(caseId, userId, options);
        const puppeteer = puppeteerModule.default || puppeteerModule;
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
        });
        
        await browser.close();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="investigation-report-${caseId}.pdf"`);
        res.send(pdfBuffer);
        return;
      }
    } catch (error) {
      console.warn('PDF generation failed, falling back to JSON:', error);
    }
    
    // Fallback to JSON
    const report = await this.reportService.generateReport(caseId, userId, options);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="investigation-report-${caseId}.json"`);
    res.json(report);
  }
}
