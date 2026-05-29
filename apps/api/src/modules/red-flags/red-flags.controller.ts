import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RedFlagRuleEngine } from './red-flag-rule-engine.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Red Flags')
@ApiBearerAuth()
@Controller('cases/:caseId')
@UseGuards(JwtAuthGuard)
export class RedFlagsController {
  constructor(private readonly ruleEngine: RedFlagRuleEngine) {}

  @Post('run-red-flags')
  @ApiOperation({ 
    summary: 'Run red flag detection on all transactions',
    description: 'Executes all active rules against transactions in the case. Results are stored as RedFlag records.'
  })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async runRedFlags(
    @Param('caseId') caseId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Run rule engine
    const result = await this.ruleEngine.runRules(caseId);

    // Create red flag records
    const createdCount = await this.ruleEngine.createRedFlags(caseId, result.flags);

    return {
      message: `Red flag detection complete. ${createdCount} new flags created.`,
      totalFlagsFound: result.flags.length,
      newFlagsCreated: createdCount,
      stats: result.stats,
    };
  }

  @Get('red-flags')
  @ApiOperation({ 
    summary: 'Get red flags with filters',
    description: 'Retrieves red flags for a case with optional filters for severity, review status, and rule name.'
  })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async getRedFlags(
    @Param('caseId') caseId: string,
    @Query('severity') severity?: string,
    @Query('reviewed') reviewed?: string,
    @Query('ruleName') ruleName?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const reviewedBool = reviewed === 'true' ? true : reviewed === 'false' ? false : undefined;

    return this.ruleEngine.getRedFlags(caseId, {
      severity,
      reviewed: reviewedBool,
      ruleName,
      page,
      limit,
    });
  }

  @Get('red-flags/stats')
  @ApiOperation({ 
    summary: 'Get red flag statistics',
    description: 'Returns aggregated statistics about red flags including counts by severity and rule.'
  })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async getStats(@Param('caseId') caseId: string) {
    return this.ruleEngine.getStats(caseId);
  }

  @Post('red-flags/:flagId/review')
  @ApiOperation({ 
    summary: 'Mark red flag as reviewed',
    description: 'Marks a specific red flag as reviewed by the auditor.'
  })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'flagId', description: 'Red Flag ID' })
  async markReviewed(
    @Param('caseId') caseId: string,
    @Param('flagId') flagId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.ruleEngine.markReviewed(flagId, user.id);
  }

  @Post('red-flags/:flagId/feedback')
  @ApiOperation({ 
    summary: 'Add feedback to red flag',
    description: 'Adds auditor feedback to a red flag (IMPORTANT, FALSE_POSITIVE, NEEDS_EVIDENCE, IGNORE).'
  })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'flagId', description: 'Red Flag ID' })
  async addFeedback(
    @Param('caseId') caseId: string,
    @Param('flagId') flagId: string,
    @Body() body: { feedback: string; type: 'IMPORTANT' | 'FALSE_POSITIVE' | 'NEEDS_EVIDENCE' | 'IGNORE' },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.ruleEngine.addFeedback(flagId, user.id, body.feedback, body.type);
  }
}