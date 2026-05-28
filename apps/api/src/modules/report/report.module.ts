import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}

// Export DTOs
export { 
  InvestigationReportDto,
  CaseSummaryDto,
  TransactionStatsDto,
  RedFlagSummaryDto,
  EvidenceFileDto,
  InvestigationNoteDto,
  TimelineEntryDto,
  ReportExportQueryDto,
} from './report.dto';
