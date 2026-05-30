import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboardMetrics() {
    return this.analyticsService.getDashboardMetrics();
  }

  @Get('case/:caseId')
  async getCaseAnalytics(@Param('caseId') caseId: string) {
    return this.analyticsService.getCaseAnalytics(caseId);
  }

  @Get('pilot')
  async getPilotAnalytics() {
    return this.analyticsService.getPilotAnalytics();
  }
}