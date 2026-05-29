import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('cases/:caseId')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get case investigation dashboard' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async getDashboard(@Param('caseId') caseId: string) {
    return this.dashboardService.getDashboard(caseId);
  }
}