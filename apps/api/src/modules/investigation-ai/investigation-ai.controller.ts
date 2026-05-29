import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InvestigationAiService, AnalysisType } from './investigation-ai.service';
import { AnalysisRequestDto, AnalysisResponseDto, OllamaStatusDto } from './dto/analysis.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('Investigation AI')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cases/:caseId/ai')
export class InvestigationAiController {
  constructor(private readonly investigationAiService: InvestigationAiService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check Ollama status' })
  @ApiResponse({ status: 200, description: 'Ollama availability status' })
  async checkStatus(): Promise<OllamaStatusDto> {
    return this.investigationAiService.checkOllamaHealth();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get previous AI analyses for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'List of previous analyses' })
  async getHistory(@Param('caseId') caseId: string) {
    return this.investigationAiService.getPreviousAnalyses(caseId);
  }

  @Post('summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate case summary analysis' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Case summary analysis' })
  async generateSummary(
    @Param('caseId') caseId: string,
    @Body() dto: AnalysisRequestDto,
    @Request() req: any,
  ): Promise<AnalysisResponseDto> {
    return this.investigationAiService.performAnalysis(
      caseId,
      'SUMMARY',
      req.user.id,
      dto.model,
    );
  }

  @Post('timeline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate chronological timeline analysis' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Timeline analysis' })
  async generateTimeline(
    @Param('caseId') caseId: string,
    @Body() dto: AnalysisRequestDto,
    @Request() req: any,
  ): Promise<AnalysisResponseDto> {
    return this.investigationAiService.performAnalysis(
      caseId,
      'TIMELINE',
      req.user.id,
      dto.model,
    );
  }

  @Post('questions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate investigation questions' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Investigation questions' })
  async generateQuestions(
    @Param('caseId') caseId: string,
    @Body() dto: AnalysisRequestDto,
    @Request() req: any,
  ): Promise<AnalysisResponseDto> {
    return this.investigationAiService.performAnalysis(
      caseId,
      'QUESTIONS',
      req.user.id,
      dto.model,
    );
  }

  @Post('evidence-gaps')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Identify evidence gaps' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Evidence gaps analysis' })
  async identifyEvidenceGaps(
    @Param('caseId') caseId: string,
    @Body() dto: AnalysisRequestDto,
    @Request() req: any,
  ): Promise<AnalysisResponseDto> {
    return this.investigationAiService.performAnalysis(
      caseId,
      'EVIDENCE_GAPS',
      req.user.id,
      dto.model,
    );
  }

  @Post('full-analysis')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate comprehensive full analysis' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Full analysis report' })
  async generateFullAnalysis(
    @Param('caseId') caseId: string,
    @Body() dto: AnalysisRequestDto,
    @Request() req: any,
  ): Promise<AnalysisResponseDto> {
    return this.investigationAiService.performAnalysis(
      caseId,
      'FULL_ANALYSIS',
      req.user.id,
      dto.model,
    );
  }
}
