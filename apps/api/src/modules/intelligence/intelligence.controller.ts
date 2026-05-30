import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { IntelligenceService } from './intelligence.service';
import {
  CaseBriefRequestDto,
  RedFlagExplainerRequestDto,
  InterviewQuestionsRequestDto,
  EvidenceRequestBuilderRequestDto,
  SimilarPatternRequestDto,
  IntelligenceResponseDto,
} from './dto/intelligence.dto';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('Investigation Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cases/:caseId/intelligence')
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Post('case-brief')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate AI Case Brief' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Case brief generated' })
  async generateCaseBrief(
    @Param('caseId') caseId: string,
    @Body() dto: CaseBriefRequestDto,
    @Request() req: any,
  ) {
    return this.intelligenceService.generateCaseBrief(caseId, {
      model: dto.model,
      userId: req.user.id,
    });
  }

  @Post('red-flag-explainer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Explain a Red Flag using AI' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Red flag explanation generated' })
  async explainRedFlag(
    @Param('caseId') caseId: string,
    @Body() dto: RedFlagExplainerRequestDto,
    @Request() req: any,
  ) {
    return this.intelligenceService.explainRedFlag(caseId, dto.redFlagId, {
      model: dto.model,
      detailLevel: dto.detailLevel,
      userId: req.user.id,
    });
  }

  @Post('interview-questions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate AI Interview Questions' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Interview questions generated' })
  async generateInterviewQuestions(
    @Param('caseId') caseId: string,
    @Body() dto: InterviewQuestionsRequestDto,
    @Request() req: any,
  ) {
    return this.intelligenceService.generateInterviewQuestions(caseId, {
      model: dto.model,
      focusArea: dto.focusArea,
      count: dto.count,
      userId: req.user.id,
    });
  }

  @Post('evidence-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Build AI Evidence Request Document' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Evidence request generated' })
  async buildEvidenceRequest(
    @Param('caseId') caseId: string,
    @Body() dto: EvidenceRequestBuilderRequestDto,
    @Request() req: any,
  ) {
    return this.intelligenceService.buildEvidenceRequest(caseId, dto.analysisType, {
      model: dto.model,
      requestType: dto.requestType,
      userId: req.user.id,
    });
  }

  @Post('similar-patterns')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search for Similar Patterns' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Pattern search results' })
  async searchSimilarPatterns(
    @Param('caseId') caseId: string,
    @Body() dto: SimilarPatternRequestDto,
    @Request() req: any,
  ) {
    return this.intelligenceService.searchSimilarPatterns(caseId, {
      model: dto.model,
      patternTypes: dto.patternTypes,
      minAmount: dto.minAmount,
      maxAmount: dto.maxAmount,
      timeWindowDays: dto.timeWindowDays,
      userId: req.user.id,
    });
  }

  @Get('history')
  @ApiOperation({ summary: 'Get AI Intelligence History' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Analysis history' })
  async getHistory(@Param('caseId') caseId: string) {
    return this.intelligenceService.getAnalysisHistory(caseId);
  }
}