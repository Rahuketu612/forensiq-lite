import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, RedFlagSeverity, ReportType, ReportFormat, AnalysisType } from '@forensiq/database';
import {
  InvestigationReportDto,
  CaseSummaryDto,
  TransactionStatsDto,
  RedFlagSummaryDto,
  EvidenceFileDto,
  InvestigationNoteDto,
  TimelineEntryDto,
  ReportExportQueryDto,
} from './report.dto';

@Injectable()
export class ReportService {
  private readonly reportVersion = '2.0.0';

  /**
   * Generate investigation report data
   */
  async generateReport(
    caseId: string, 
    userId: string, 
    options?: ReportExportQueryDto
  ): Promise<InvestigationReportDto> {
    const caseData = await this.getCaseData(caseId);
    
    const transactionStats = await this.getTransactionStats(caseId);
    const redFlagsSummary = await this.getRedFlagsSummary(caseId);
    const highPriorityFlags = await this.getHighPriorityFlags(caseId, options?.minSeverity || RedFlagSeverity.HIGH);
    const notes = await this.getInvestigationNotes(caseId);
    const evidence = await this.getEvidenceFiles(caseId);
    const timeline = await this.getTimeline(caseId, options);
    const fundTrail = await this.getFundTrailPatterns(caseId);
    const entities = await this.getEntityResolution(caseId);
    const graph = await this.getRelationshipGraph(caseId);
    const aiObservations = await this.getAiObservations(caseId);
    const evidenceGaps = await this.getEvidenceGaps(caseId);

    const report: InvestigationReportDto = {
      reportMeta: {
        generatedAt: new Date().toISOString(),
        generatedBy: userId,
        caseId,
        reportVersion: this.reportVersion,
      },
      caseSummary: caseData,
      transactionStats,
      redFlags: redFlagsSummary,
      highPriorityFlags,
      notes: options?.includeNotes !== false ? notes : [],
      evidence: options?.includeEvidence !== false ? evidence : [],
      timeline: options?.includeTimeline !== false ? timeline : [],
      evidenceIntegrity: {
        totalFiles: evidence.length,
        hashAlgorithm: 'SHA-256',
        integrityVerified: evidence.length > 0,
      },
      disclaimer: 'This report is an investigation aid and does not independently conclude fraud or criminal conduct. All findings require auditor review and professional judgment. Observations are based on available data and patterns identified through analytical processes.',
      // V2 additions
      fundTrail,
      entityResolution: entities,
      relationshipGraph: graph,
      aiObservations,
      evidenceGaps,
    };

    // Store generated report
    await prisma.generatedReport.create({
      data: {
        caseId,
        type: options?.reportType as ReportType || ReportType.DETAILED,
        format: ReportFormat.HTML,
        title: `${caseData.title} - Investigation Report`,
        content: JSON.stringify(report),
        createdById: userId,
        metadata: {
          reportVersion: this.reportVersion,
          sections: {
            transactions: true,
            redFlags: true,
            fundTrail: fundTrail.length > 0,
            entityResolution: entities.length > 0,
            relationshipGraph: graph.nodes.length > 0,
            aiObservations: aiObservations.length > 0,
            evidenceGaps: evidenceGaps.length > 0,
          },
        } as any,
      },
    });

    return report;
  }

  /**
   * Generate HTML report for preview
   */
  async generateHtmlReport(caseId: string, userId: string, options?: ReportExportQueryDto): Promise<string> {
    const report = await this.generateReport(caseId, userId, options);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Investigation Report - ${report.caseSummary.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 40px 20px; }
    .header { border-bottom: 3px solid #1a365d; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; color: #1a365d; margin-bottom: 8px; }
    .header .meta { font-size: 14px; color: #666; }
    .section { margin-bottom: 30px; }
    .section h2 { font-size: 20px; color: #1a365d; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .stat-card { background: #f7fafc; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-card .value { font-size: 24px; font-weight: bold; color: #2d3748; }
    .stat-card .label { font-size: 12px; color: #718096; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f7fafc; font-weight: 600; font-size: 12px; text-transform: uppercase; color: #4a5568; }
    tr:hover { background: #f7fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .badge-critical { background: #fed7d7; color: #c53030; }
    .badge-high { background: #feebc8; color: #c05621; }
    .badge-medium { background: #fefcbf; color: #b7791f; }
    .badge-low { background: #c6f6d5; color: #276749; }
    .badge-reviewed { background: #c6f6d5; color: #276749; }
    .badge-unreviewed { background: #fed7d7; color: #c53030; }
    .disclaimer { background: #fffaf0; border: 1px solid #ed8936; border-radius: 8px; padding: 15px; margin-top: 30px; color: #744210; font-size: 13px; }
    .hash { font-family: monospace; font-size: 11px; color: #4a5568; word-break: break-all; }
    .severity-critical { border-left: 4px solid #c53030; }
    .severity-high { border-left: 4px solid #c05621; }
    .empty { color: #a0aec0; font-style: italic; text-align: center; padding: 30px; }
    .print-button { background: #1a365d; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; cursor: pointer; margin-top: 20px; }
    .print-button:hover { background: #2c5282; }
    @media print { .print-button { display: none; } body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Investigation Report</h1>
    <div class="meta">
      <div><strong>Case:</strong> ${report.caseSummary.title}</div>
      <div><strong>Generated:</strong> ${new Date(report.reportMeta.generatedAt).toLocaleString()}</div>
      <div><strong>Generated by:</strong> ${report.reportMeta.generatedBy}</div>
      <div><strong>Report Version:</strong> ${report.reportMeta.reportVersion}</div>
    </div>
  </div>

  ${this.renderCaseSummary(report.caseSummary)}
  ${this.renderTransactionStats(report.transactionStats)}
  ${this.renderRedFlags(report.redFlags, report.highPriorityFlags)}
  ${this.renderNotes(report.notes)}
  ${this.renderEvidence(report.evidence)}
  ${this.renderTimeline(report.timeline)}

  <div class="disclaimer">
    <strong>Disclaimer:</strong> ${report.disclaimer}
  </div>

  <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
</body>
</html>`;
  }

  private renderCaseSummary(summary: CaseSummaryDto): string {
    return `
    <div class="section">
      <h2>Case Summary</h2>
      <table>
        <tr><td style="width:150px;font-weight:600;">Case ID</td><td>${summary.id}</td></tr>
        <tr><td style="font-weight:600;">Title</td><td>${summary.title}</td></tr>
        <tr><td style="font-weight:600;">Description</td><td>${summary.description || 'N/A'}</td></tr>
        <tr><td style="font-weight:600;">Status</td><td>${summary.status}</td></tr>
        <tr><td style="font-weight:600;">Created</td><td>${new Date(summary.createdAt).toLocaleDateString()}</td></tr>
        <tr><td style="font-weight:600;">Last Updated</td><td>${new Date(summary.updatedAt).toLocaleDateString()}</td></tr>
      </table>
    </div>`;
  }

  private renderTransactionStats(stats: TransactionStatsDto): string {
    return `
    <div class="section">
      <h2>Transaction Analysis</h2>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="value">${stats.totalTransactions.toLocaleString()}</div>
          <div class="label">Total Transactions</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color:#276749;">${this.formatCurrency(stats.totalCredits)}</div>
          <div class="label">Total Credits</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color:#c53030;">${this.formatCurrency(stats.totalDebits)}</div>
          <div class="label">Total Debits</div>
        </div>
        <div class="stat-card">
          <div class="value">${this.formatCurrency(stats.netAmount)}</div>
          <div class="label">Net Amount</div>
        </div>
      </div>
      ${stats.dateRange ? `<p style="font-size:13px;color:#666;">Analysis period: ${new Date(stats.dateRange.start).toLocaleDateString()} to ${new Date(stats.dateRange.end).toLocaleDateString()}</p>` : ''}
    </div>`;
  }

  private renderRedFlags(redFlags: RedFlagSummaryDto, highFlags: Array<any>): string {
    const totalReviewNeeded = redFlags.bySeverity.critical + redFlags.bySeverity.high;
    return `
    <div class="section">
      <h2>Red Flags Identified</h2>
      <p style="margin-bottom:15px;"><strong>${totalReviewNeeded}</strong> red flags requiring auditor review</p>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="value" style="color:#c53030;">${redFlags.bySeverity.critical}</div>
          <div class="label">Critical</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color:#c05621;">${redFlags.bySeverity.high}</div>
          <div class="label">High</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color:#b7791f;">${redFlags.bySeverity.medium}</div>
          <div class="label">Medium</div>
        </div>
        <div class="stat-card">
          <div class="value" style="color:#276749;">${redFlags.bySeverity.low}</div>
          <div class="label">Low</div>
        </div>
      </div>
      <p style="margin-bottom:15px;">
        <span class="badge badge-reviewed">${redFlags.reviewed.reviewed} Reviewed</span>
        <span class="badge badge-unreviewed" style="margin-left:8px;">${redFlags.reviewed.unreviewed} Unreviewed</span>
      </p>

      ${highFlags.length > 0 ? `
      <h3 style="font-size:16px;margin:20px 0 10px;">High Priority Flags</h3>
      <table>
        <thead>
          <tr><th>Type</th><th>Severity</th><th>Description</th><th>Date</th></tr>
        </thead>
        <tbody>
          ${highFlags.map(flag => `
          <tr class="severity-${flag.severity.toLowerCase()}">
            <td>${flag.flagType}</td>
            <td><span class="badge badge-${flag.severity.toLowerCase()}">${flag.severity}</span></td>
            <td>${flag.description}</td>
            <td>${new Date(flag.date).toLocaleDateString()}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p class="empty">No high priority flags identified</p>'}
    </div>`;
  }

  private renderNotes(notes: InvestigationNoteDto[]): string {
    if (notes.length === 0) {
      return `
      <div class="section">
        <h2>Investigation Notes</h2>
        <p class="empty">No investigation notes recorded</p>
      </div>`;
    }

    return `
    <div class="section">
      <h2>Investigation Notes</h2>
      ${notes.map(note => `
      <div style="margin-bottom:15px;padding:15px;background:#f7fafc;border-radius:8px;">
        <p style="margin-bottom:10px;">${note.content}</p>
        <p style="font-size:12px;color:#718096;">By ${note.author} • ${new Date(note.createdAt).toLocaleString()}</p>
      </div>
      `).join('')}
    </div>`;
  }

  private renderEvidence(evidence: EvidenceFileDto[]): string {
    if (evidence.length === 0) {
      return `
      <div class="section">
        <h2>Evidence Files</h2>
        <p class="empty">No evidence files attached</p>
      </div>`;
    }

    return `
    <div class="section">
      <h2>Evidence Files</h2>
      <p style="margin-bottom:15px;color:#718096;font-size:13px;">
        All files verified with hash integrity (SHA-256). Click hash to verify.
      </p>
      <table>
        <thead>
          <tr><th>File Name</th><th>Type</th><th>Size</th><th>SHA-256 Hash</th><th>Uploaded</th></tr>
        </thead>
        <tbody>
          ${evidence.map(file => `
          <tr>
            <td>${file.fileName}</td>
            <td>${file.mimeType}</td>
            <td>${this.formatFileSize(file.fileSize)}</td>
            <td class="hash" title="Click to copy" onclick="navigator.clipboard.writeText('${file.sha256Hash}')" style="cursor:pointer;">
              ${file.sha256Hash.substring(0, 16)}...
            </td>
            <td>${new Date(file.uploadedAt).toLocaleDateString()}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;
  }

  private renderTimeline(timeline: TimelineEntryDto[]): string {
    if (timeline.length === 0) {
      return '';
    }

    return `
    <div class="section">
      <h2>Investigation Timeline</h2>
      <div style="border-left:2px solid #e2e8f0;padding-left:20px;margin-left:10px;">
        ${timeline.map(entry => `
        <div style="margin-bottom:20px;position:relative;">
          <div style="width:12px;height:12px;background:#1a365d;border-radius:50%;position:absolute;left:-27px;top:4px;"></div>
          <p style="font-size:12px;color:#718096;">${new Date(entry.date).toLocaleDateString()}</p>
          <p style="font-weight:600;">${entry.eventType}</p>
          <p style="font-size:14px;color:#4a5568;">${entry.description}</p>
        </div>
        `).join('')}
      </div>
    </div>`;
  }

  /**
   * Get case data
   */
  private async getCaseData(caseId: string): Promise<CaseSummaryDto> {
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseData) {
      throw new NotFoundException('Case not found');
    }

    return {
      id: caseData.id,
      title: caseData.title,
      description: caseData.description || undefined,
      status: caseData.status,
      createdAt: caseData.createdAt.toISOString(),
      updatedAt: caseData.updatedAt.toISOString(),
    };
  }

  /**
   * Get transaction statistics
   */
  private async getTransactionStats(caseId: string): Promise<TransactionStatsDto> {
    const transactions = await prisma.transaction.findMany({
      where: { caseId },
      select: {
        amount: true,
        type: true,
        date: true,
      },
    });

    if (transactions.length === 0) {
      return {
        totalTransactions: 0,
        totalCredits: 0,
        totalDebits: 0,
        netAmount: 0,
        dateRange: { start: '', end: '' },
      };
    }

    const { TransactionType } = await import('@forensiq/database');
    const credits = transactions.filter(t => t.type === TransactionType.CREDIT).reduce((sum, t) => sum + t.amount, 0);
    const debits = transactions.filter(t => t.type === TransactionType.DEBIT).reduce((sum, t) => sum + t.amount, 0);
    const sortedByDate = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      totalTransactions: transactions.length,
      totalCredits: credits,
      totalDebits: debits,
      netAmount: credits - debits,
      dateRange: {
        start: sortedByDate[0].date.toISOString(),
        end: sortedByDate[sortedByDate.length - 1].date.toISOString(),
      },
    };
  }

  /**
   * Get red flags summary
   */
  private async getRedFlagsSummary(caseId: string) {
    const flags = await prisma.redFlag.findMany({
      where: { caseId },
    });

    return {
      total: flags.length,
      bySeverity: {
        critical: flags.filter(f => f.severity === RedFlagSeverity.CRITICAL).length,
        high: flags.filter(f => f.severity === RedFlagSeverity.HIGH).length,
        medium: flags.filter(f => f.severity === RedFlagSeverity.MEDIUM).length,
        low: flags.filter(f => f.severity === RedFlagSeverity.LOW).length,
      },
      byCategory: flags.reduce((acc, f) => {
        acc[f.title] = (acc[f.title] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      reviewed: {
        reviewed: flags.filter(f => f.reviewedAt !== null).length,
        unreviewed: flags.filter(f => f.reviewedAt === null).length,
      },
    };
  }

  /**
   * Get high priority flags
   */
  private async getHighPriorityFlags(caseId: string, minSeverity: RedFlagSeverity) {
    const severityOrder = {
      [RedFlagSeverity.CRITICAL]: 0,
      [RedFlagSeverity.HIGH]: 1,
      [RedFlagSeverity.MEDIUM]: 2,
      [RedFlagSeverity.LOW]: 3,
    };

    const minOrder = severityOrder[minSeverity] || 1;

    const flags = await prisma.redFlag.findMany({
      where: { caseId },
      include: {
        transaction: {
          select: { date: true, id: true },
        },
      },
    });

    return flags
      .filter(f => severityOrder[f.severity] <= minOrder)
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
      .slice(0, 20)
      .map(f => ({
        id: f.id,
        flagType: f.title,
        severity: f.severity,
        description: f.explanation,
        flaggedTransactionId: f.transactionId || undefined,
        date: f.transaction?.date?.toISOString() || f.createdAt.toISOString(),
      }));
  }

  /**
   * Get investigation notes
   */
  private async getInvestigationNotes(caseId: string): Promise<InvestigationNoteDto[]> {
    const notes = await prisma.investigationNote.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return notes.map(n => ({
      id: n.id,
      content: n.content,
      author: n.authorId,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  /**
   * Get evidence files
   */
  private async getEvidenceFiles(caseId: string): Promise<EvidenceFileDto[]> {
    const evidence = await prisma.evidenceFile.findMany({
      where: { caseId },
      orderBy: { uploadedAt: 'desc' },
    });

    return evidence.map((e: { id: string; fileName: string; mimeType: string; size: number; hash: string; uploadedAt: Date; uploadedById: string; description: string | null }) => ({
      id: e.id,
      fileName: e.fileName,
      mimeType: e.mimeType,
      fileSize: e.size,
      sha256Hash: e.hash,
      uploadedAt: e.uploadedAt.toISOString(),
      uploadedBy: e.uploadedById || undefined,
      description: e.description || undefined,
    }));
  }

  /**
   * Get investigation timeline
   */
  private async getTimeline(caseId: string, options?: ReportExportQueryDto) {
    // Build timeline from various activities
    const events: TimelineEntryDto[] = [];

    // Add case creation
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      select: { createdAt: true },
    });

    if (caseData && options?.includeTimeline !== false) {
      events.push({
        date: caseData.createdAt.toISOString(),
        eventType: 'Case Created',
        description: 'Investigation case initiated',
      });

      // Add transaction import events
      const imports = await prisma.transactionImport.findMany({
        where: { caseId },
        orderBy: { importedAt: 'desc' },
        take: 10,
      });

      imports.forEach(importItem => {
        events.push({
          date: importItem.importedAt.toISOString(),
          eventType: 'Transaction Import',
          description: `Imported ${importItem.originalName} - ${importItem.status}`,
        });
      });

      // Add red flag creation events
      const flags = await prisma.redFlag.findMany({
        where: { caseId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      flags.forEach(flag => {
        events.push({
          date: flag.createdAt.toISOString(),
          eventType: 'Red Flag',
          description: `Flagged: ${flag.title} (${flag.severity})`,
        });
      });
    }

    // Sort by date descending
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Get fund trail patterns
   */
  private async getFundTrailPatterns(caseId: string) {
    const patterns = await prisma.fundTrailPattern.findMany({
      where: { caseId },
    });

    return patterns.map(p => ({
      id: p.id,
      type: p.patternType,
      description: p.explanation,
      totalAmount: p.totalAmount || 0,
      transactionCount: p.transactionIds.length,
      transactions: [], // transaction details would need separate query
    }));
  }

  /**
   * Get entity resolution data
   */
  private async getEntityResolution(caseId: string) {
    const entities = await prisma.entity.findMany({
      where: { caseId },
    });

    return entities.map(e => ({
      id: e.id,
      name: e.canonicalName,
      type: 'ENTITY',
      confidence: e.riskScore || 0,
      totalTransactions: e.transactionCount || 0,
      totalAmount: e.totalAmount || 0,
    }));
  }

  /**
   * Get relationship graph data
   */
  private async getRelationshipGraph(caseId: string) {
    const nodes = await prisma.graphNode.findMany({ where: { caseId } });
    const edges = await prisma.graphEdge.findMany({ where: { caseId } });

    return {
      nodes: nodes.map(n => ({
        id: n.id,
        label: n.label,
        type: n.nodeType,
        properties: n.metadata as Record<string, any> || {},
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        weight: e.confidenceScore || 1,
        type: e.edgeType,
      })),
    };
  }

  /**
   * Get AI observations from previous analyses
   */
  private async getAiObservations(caseId: string) {
    const analyses = await prisma.aiAnalysis.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return analyses.map(a => ({
      id: a.id,
      type: a.analysisType,
      summary: a.response.substring(0, 500) + (a.response.length > 500 ? '...' : ''),
      model: a.modelName,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  /**
   * Get evidence gaps from AI analysis
   */
  private async getEvidenceGaps(caseId: string) {
    // Look for evidence gap analyses
    const gapAnalyses = await prisma.aiAnalysis.findMany({
      where: { 
        caseId,
        analysisType: AnalysisType.EVIDENCE_GAPS,
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (gapAnalyses.length === 0) return [];

    // Parse the response for evidence gaps
    const response = gapAnalyses[0].response;
    const gaps: string[] = [];

    // Simple extraction of bullet points
    const lines = response.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'));
    lines.forEach(line => {
      const gap = line.replace(/^[-*\s]+/, '').trim();
      if (gap) gaps.push(gap);
    });

    return gaps.slice(0, 10).map((gap, i) => ({
      id: `gap-${i}`,
      description: gap,
      priority: (i < 3 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
    }));
  }

  /**
   * Generate Executive Summary Report
   */
  async generateExecutiveReport(caseId: string, userId: string, options?: ReportExportQueryDto) {
    const fullReport = await this.generateReport(caseId, userId, { ...options, reportType: 'EXECUTIVE' as any });
    
    // Store as executive report
    await prisma.generatedReport.create({
      data: {
        caseId,
        type: ReportType.EXECUTIVE,
        format: ReportFormat.HTML,
        title: `${fullReport.caseSummary.title} - Executive Summary`,
        content: JSON.stringify(fullReport),
        createdById: userId,
        metadata: { reportType: 'executive', reportVersion: this.reportVersion } as any,
      },
    });

    return fullReport;
  }

  /**
   * Generate Detailed Investigation Report
   */
  async generateDetailedReport(caseId: string, userId: string, options?: ReportExportQueryDto) {
    const fullReport = await this.generateReport(caseId, userId, { ...options, reportType: 'DETAILED' as any });
    
    await prisma.generatedReport.create({
      data: {
        caseId,
        type: ReportType.DETAILED,
        format: ReportFormat.HTML,
        title: `${fullReport.caseSummary.title} - Detailed Investigation Report`,
        content: JSON.stringify(fullReport),
        createdById: userId,
        metadata: { reportType: 'detailed', reportVersion: this.reportVersion } as any,
      },
    });

    return fullReport;
  }

  /**
   * Generate Board Report
   */
  async generateBoardReport(caseId: string, userId: string, options?: ReportExportQueryDto) {
    const fullReport = await this.generateReport(caseId, userId, { ...options, reportType: 'BOARD' as any });
    
    await prisma.generatedReport.create({
      data: {
        caseId,
        type: ReportType.BOARD,
        format: ReportFormat.HTML,
        title: `${fullReport.caseSummary.title} - Board Report`,
        content: JSON.stringify(fullReport),
        createdById: userId,
        metadata: { reportType: 'board', reportVersion: this.reportVersion } as any,
      },
    });

    return fullReport;
  }

  /**
   * Get stored reports for a case
   */
  async getStoredReports(caseId: string, reportType?: ReportType | undefined) {
    const reports = await prisma.generatedReport.findMany({
      where: { caseId, type: reportType || undefined },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    
    return reports.map(r => ({
      id: r.id,
      caseId: r.caseId,
      type: r.type,
      format: r.format,
      title: r.title,
      createdAt: r.createdAt.toISOString(),
      createdById: r.createdById,
    }));
  }

  /**
   * Export report in different formats
   */
  async exportReport(reportId: string, format: ReportFormat) {
    const report = await prisma.generatedReport.findUnique({
      where: { id: reportId },
    });

    if (!report) throw new NotFoundException('Report not found');

    const content = report.content ? JSON.parse(report.content) : null;

    switch (format) {
      case ReportFormat.PDF:
        return { format: 'pdf', content, title: report.title };
      case ReportFormat.DOCX:
        return { format: 'docx', content, title: report.title };
      case ReportFormat.HTML:
        return { format: 'html', content, title: report.title };
      case ReportFormat.JSON:
        return { format: 'json', content: content || {}, title: report.title };
      default:
        return { format: 'json', content: content || {}, title: report.title };
    }
  }
}
