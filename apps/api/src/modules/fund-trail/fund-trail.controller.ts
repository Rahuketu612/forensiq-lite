import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FundTrailService } from './fund-trail.service';
import { PatternDetectionService } from './pattern-detection.service';
import { AnalyzePatternsDto, PatternStatusDto } from './dto/pattern.dto';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Fund Trail')
@ApiBearerAuth()
@Controller('cases/:caseId/fund-trail')
export class FundTrailController {
  constructor(
    private readonly fundTrailService: FundTrailService,
    private readonly patternDetectionService: PatternDetectionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get fund trail for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Fund trail retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async getFundTrail(
    @Param('caseId') caseId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.fundTrailService.getFundTrail(caseId, user.id);
  }

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate fund trail links for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 201, description: 'Fund trail generated successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async generateFundTrail(
    @Param('caseId') caseId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.fundTrailService.generateFundTrail(caseId, user.id);
  }

  @Post('analyze')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Analyze fund trail patterns for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 201, description: 'Patterns analyzed successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  @ApiResponse({ status: 400, description: 'Insufficient data for analysis' })
  async analyzePatterns(
    @Param('caseId') caseId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() options: AnalyzePatternsDto,
  ) {
    return this.patternDetectionService.analyzePatterns(caseId, user.id, options);
  }

  @Get('patterns')
  @ApiOperation({ summary: 'Get all fund trail patterns for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiResponse({ status: 200, description: 'Patterns retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async getPatterns(@Param('caseId') caseId: string) {
    return this.patternDetectionService.getPatterns(caseId);
  }

  @Get('patterns/:patternId')
  @ApiOperation({ summary: 'Get a specific fund trail pattern' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'patternId', description: 'Pattern ID' })
  @ApiResponse({ status: 200, description: 'Pattern retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Pattern not found' })
  async getPattern(
    @Param('caseId') caseId: string,
    @Param('patternId') patternId: string,
  ) {
    const result = await this.patternDetectionService.getPatternById(patternId);
    if (!result) {
      throw new NotFoundException('Pattern not found');
    }
    return result;
  }

  @Put('patterns/:patternId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update pattern review status' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'patternId', description: 'Pattern ID' })
  @ApiResponse({ status: 200, description: 'Pattern status updated' })
  @ApiResponse({ status: 404, description: 'Pattern not found' })
  async updatePatternStatus(
    @Param('caseId') caseId: string,
    @Param('patternId') patternId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: PatternStatusDto,
  ) {
    await this.patternDetectionService.updatePatternStatus(
      patternId,
      user.id,
      dto.status,
    );
    return { message: 'Pattern status updated successfully' };
  }

  @Delete('links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a transaction link' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'linkId', description: 'Link ID to delete' })
  @ApiResponse({ status: 204, description: 'Link deleted successfully' })
  @ApiResponse({ status: 404, description: 'Link not found' })
  async deleteLink(
    @Param('caseId') caseId: string,
    @Param('linkId') linkId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.fundTrailService.deleteLink(linkId, user.id);
  }
}
