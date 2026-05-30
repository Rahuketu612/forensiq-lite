import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RedFlagSeverity } from '@forensiq/database';

export class CaseSummaryDto {
  @ApiProperty({ description: 'Case ID' })
  id: string;

  @ApiProperty({ description: 'Case title' })
  title: string;

  @ApiPropertyOptional({ description: 'Case description' })
  description?: string;

  @ApiProperty({ description: 'Case status' })
  status: string;

  @ApiProperty({ description: 'Case created date' })
  createdAt: string;

  @ApiProperty({ description: 'Last updated date' })
  updatedAt: string;
}

export class TransactionStatsDto {
  @ApiProperty({ description: 'Total number of transactions' })
  totalTransactions: number;

  @ApiProperty({ description: 'Total credits' })
  totalCredits: number;

  @ApiProperty({ description: 'Total debits' })
  totalDebits: number;

  @ApiProperty({ description: 'Net amount' })
  netAmount: number;

  @ApiProperty({ description: 'Date range of transactions' })
  dateRange: {
    start: string;
    end: string;
  };

  @ApiPropertyOptional({ description: 'Unique counterparties count' })
  uniqueCounterparties?: number;
}

export class RedFlagSummaryDto {
  @ApiProperty({ description: 'Total red flags' })
  total: number;

  @ApiProperty({ description: 'Red flags by severity' })
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };

  @ApiProperty({ description: 'Red flags by category' })
  byCategory: Record<string, number>;

  @ApiProperty({ description: 'Reviewed vs unreviewed' })
  reviewed: {
    reviewed: number;
    unreviewed: number;
  };
}

export class EvidenceFileDto {
  @ApiProperty({ description: 'Evidence ID' })
  id: string;

  @ApiProperty({ description: 'File name' })
  fileName: string;

  @ApiProperty({ description: 'File type/MIME type' })
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({ description: 'SHA256 hash for integrity' })
  sha256Hash: string;

  @ApiProperty({ description: 'Upload date' })
  uploadedAt: string;

  @ApiPropertyOptional({ description: 'Uploaded by user' })
  uploadedBy?: string;

  @ApiPropertyOptional({ description: 'Description or notes' })
  description?: string;
}

export class InvestigationNoteDto {
  @ApiProperty({ description: 'Note ID' })
  id: string;

  @ApiProperty({ description: 'Note content' })
  content: string;

  @ApiProperty({ description: 'Author name' })
  author: string;

  @ApiProperty({ description: 'Created date' })
  createdAt: string;
}

export class TimelineEntryDto {
  @ApiProperty({ description: 'Entry date' })
  date: string;

  @ApiProperty({ description: 'Event type' })
  eventType: string;

  @ApiProperty({ description: 'Event description' })
  description: string;

  @ApiPropertyOptional({ description: 'Related entity' })
  entity?: string;
}

export class InvestigationReportDto {
  @ApiProperty({ description: 'Report metadata' })
  reportMeta: {
    generatedAt: string;
    generatedBy: string;
    caseId: string;
    reportVersion: string;
  };

  @ApiProperty({ description: 'Case summary' })
  caseSummary: CaseSummaryDto;

  @ApiProperty({ description: 'Transaction statistics' })
  transactionStats: TransactionStatsDto;

  @ApiProperty({ description: 'Red flags summary' })
  redFlags: RedFlagSummaryDto;

  @ApiProperty({ description: 'High severity flags requiring review' })
  highPriorityFlags: Array<{
    id: string;
    flagType: string;
    severity: string;
    description: string;
    flaggedTransactionId?: string;
    date: string;
  }>;

  @ApiProperty({ description: 'Investigation notes' })
  notes: InvestigationNoteDto[];

  @ApiProperty({ description: 'Evidence files with integrity hashes' })
  evidence: EvidenceFileDto[];

  @ApiProperty({ description: 'Timeline of investigation events' })
  timeline: TimelineEntryDto[];

  @ApiProperty({ description: 'Evidence integrity summary' })
  evidenceIntegrity: {
    totalFiles: number;
    hashAlgorithm: string;
    integrityVerified: boolean;
  };

  @ApiProperty({ description: 'Report disclaimer' })
  disclaimer: string;

  // V2 Report Sections
  @ApiPropertyOptional({ description: 'Fund trail patterns' })
  fundTrail?: Array<{
    id: string;
    type: string;
    description: string;
    totalAmount: number;
    transactionCount: number;
    transactions: Array<{
      id: string;
      date: string;
      amount: number;
      counterparty: string;
    }>;
  }>;

  @ApiPropertyOptional({ description: 'Entity resolution data' })
  entityResolution?: Array<{
    id: string;
    name: string;
    type: string;
    confidence: number;
    totalTransactions: number;
    totalAmount: number;
  }>;

  @ApiPropertyOptional({ description: 'Relationship graph' })
  relationshipGraph?: {
    nodes: Array<{
      id: string;
      label: string;
      type: string;
      properties: Record<string, any>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      weight: number;
      type: string;
    }>;
  };

  @ApiPropertyOptional({ description: 'AI-generated observations' })
  aiObservations?: Array<{
    id: string;
    type: string;
    summary: string;
    model: string;
    createdAt: string;
  }>;

  @ApiPropertyOptional({ description: 'Evidence gaps identified' })
  evidenceGaps?: Array<{
    id: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export class ReportExportQueryDto {
  @ApiPropertyOptional({ description: 'Include notes', default: true })
  includeNotes?: boolean;

  @ApiPropertyOptional({ description: 'Include evidence', default: true })
  includeEvidence?: boolean;

  @ApiPropertyOptional({ description: 'Include timeline', default: true })
  includeTimeline?: boolean;

  @ApiPropertyOptional({ description: 'Minimum severity for flags (default: HIGH)' })
  minSeverity?: RedFlagSeverity;

  @ApiPropertyOptional({ description: 'Report type: EXECUTIVE, DETAILED, BOARD' })
  reportType?: string;
}
