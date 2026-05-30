import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
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

  // ============== Report Generation ==============

  @Post('generate')
  @ApiOperation({ summary: 'Generate investigation report' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async generateReport(
    @Param('caseId') caseId: string,
    @Body() options: ReportExportQueryDto,
    @Request() req: any,
  ) {
    return this.reportService.generateReport(caseId, req.user?.id || 'system', options);
  }

  @Post('generate/executive')
  @ApiOperation({ summary: 'Generate Executive Summary Report' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async generateExecutiveReport(
    @Param('caseId') caseId: string,
    @Body() options: ReportExportQueryDto,
    @Request() req: any,
  ) {
    return this.reportService.generateExecutiveReport(caseId, req.user?.id || 'system', options);
  }

  @Post('generate/detailed')
  @ApiOperation({ summary: 'Generate Detailed Investigation Report' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async generateDetailedReport(
    @Param('caseId') caseId: string,
    @Body() options: ReportExportQueryDto,
    @Request() req: any,
  ) {
    return this.reportService.generateDetailedReport(caseId, req.user?.id || 'system', options);
  }

  @Post('generate/board')
  @ApiOperation({ summary: 'Generate Board Report' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async generateBoardReport(
    @Param('caseId') caseId: string,
    @Body() options: ReportExportQueryDto,
    @Request() req: any,
  ) {
    return this.reportService.generateBoardReport(caseId, req.user?.id || 'system', options);
  }

  // ============== Report Listing ==============

  @Get('history')
  @ApiOperation({ summary: 'Get generated report history' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async getReportHistory(@Param('caseId') caseId: string, @Query('type') type?: string) {
    return this.reportService.getStoredReports(caseId, type as any);
  }

  // ============== Report Export ==============

  @Get('preview')
  @ApiOperation({ summary: 'Get HTML preview of investigation report' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async getReportPreview(
    @Param('caseId') caseId: string,
    @Query() options: ReportExportQueryDto,
    @Res() res: Response,
  ) {
    const userId = 'system';
    const html = await this.reportService.generateHtmlReport(caseId, userId, options);
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  }

  @Get('export-json')
  @ApiOperation({ summary: 'Export investigation report as JSON' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async exportJson(
    @Param('caseId') caseId: string,
    @Query() options: ReportExportQueryDto,
  ) {
    return this.reportService.generateReport(caseId, 'system', options);
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
    const userId = 'system';
    
    try {
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
    
    const report = await this.reportService.generateReport(caseId, userId, options);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="investigation-report-${caseId}.json"`);
    res.json(report);
  }

  @Get('export/:reportId')
  @ApiOperation({ summary: 'Export stored report in specified format' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  async exportStoredReport(
    @Param('caseId') caseId: string,
    @Param('reportId') reportId: string,
    @Query('format') format: string = 'json',
  ) {
    return this.reportService.exportReport(reportId, format.toUpperCase() as any);
  }
}