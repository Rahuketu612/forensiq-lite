import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EntityResolutionService } from './entity-resolution.service';
import { prisma } from '@forensiq/database';
import {
  AnalyzeEntitiesDto,
  EntityQueryDto,
  ReviewEntityDto,
  AnalyzeResultDto,
  EntityResponseDto,
} from './dto/entity-analysis.dto';

@ApiTags('Entity Resolution')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/:version/cases/:caseId/entities')
export class EntityResolutionController {
  constructor(private readonly entityResolutionService: EntityResolutionService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze transactions and perform entity resolution' })
  @ApiResponse({ status: 200, type: AnalyzeResultDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async analyzeEntities(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: AnalyzeEntitiesDto,
    @Request() req: any,
  ): Promise<AnalyzeResultDto> {
    // Get transaction count for response
    const totalTransactions = await prisma.transaction.count({
      where: { caseId },
    });

    // Run analysis
    const clusters = await this.entityResolutionService.analyzeTransactions(caseId);
    
    // Persist results
    const { created, updated } = await this.entityResolutionService.persistClusters(
      caseId,
      clusters,
    );

    // Get the created/updated entities
    const entities = await this.entityResolutionService.getEntitiesByCase(caseId);

    return {
      totalEntities: entities.length,
      totalTransactions,
      created,
      updated,
      entities: entities.map((e: any) => ({
        id: e.id,
        canonicalName: e.canonicalName,
        transactionCount: e.transactionCount,
        totalAmount: e.totalAmount,
        riskScore: e.riskScore,
        reviewed: e.reviewed,
        aliases: e.aliases.map((a: any) => a.aliasName),
        confidenceScore: e.aliases[0]?.confidenceScore || 0,
      })),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all entities for a case' })
  @ApiResponse({ status: 200, type: [EntityResponseDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async getEntities(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Query() query: EntityQueryDto,
  ): Promise<EntityResponseDto[]> {
    const entities = await this.entityResolutionService.getEntitiesByCase(
      caseId,
      query.includeReviewed,
    );

    return entities.map((e: any) => ({
      id: e.id,
      caseId: e.caseId,
      canonicalName: e.canonicalName,
      riskScore: e.riskScore,
      totalAmount: e.totalAmount,
      transactionCount: e.transactionCount,
      reviewed: e.reviewed,
      reviewedBy: e.reviewedBy || undefined,
      reviewedAt: e.reviewedAt || undefined,
      explanation: e.explanation || undefined,
      createdAt: e.createdAt,
      aliases: e.aliases.map((a: any) => ({
        id: a.id,
        aliasName: a.aliasName,
        matchType: a.matchType,
        source: a.source || undefined,
        confidenceScore: a.confidenceScore,
        matchReason: a.matchReason || undefined,
        createdAt: a.createdAt,
      })),
    }));
  }

  @Get(':entityId')
  @ApiOperation({ summary: 'Get entity details by ID' })
  @ApiParam({ name: 'entityId', type: 'string' })
  @ApiResponse({ status: 200, type: EntityResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async getEntity(
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ): Promise<any> {
    const entity = await this.entityResolutionService.getEntityById(entityId);

    if (!entity) {
      throw new Error('Entity not found');
    }

    return {
      id: entity.id,
      caseId: entity.caseId,
      canonicalName: entity.canonicalName,
      riskScore: entity.riskScore,
      totalAmount: entity.totalAmount,
      transactionCount: entity.transactionCount,
      reviewed: entity.reviewed,
      reviewedBy: entity.reviewedBy || undefined,
      reviewedAt: entity.reviewedAt || undefined,
      explanation: entity.explanation || undefined,
      createdAt: entity.createdAt,
      aliases: entity.aliases.map((a: any) => ({
        id: a.id,
        aliasName: a.aliasName,
        matchType: a.matchType,
        source: a.source || undefined,
        confidenceScore: a.confidenceScore,
        matchReason: a.matchReason || undefined,
        createdAt: a.createdAt,
      })),
      transactions: entity.transactions.map((te: any) => ({
        id: te.transaction.id,
        date: te.transaction.date,
        amount: te.transaction.amount,
        type: te.transaction.type,
        counterparty: te.transaction.counterparty || undefined,
        description: te.transaction.description || undefined,
      })),
      auditLogs: entity.auditLogs.map((log: any) => ({
        id: log.id,
        action: log.action,
        description: log.description,
        confidenceScore: log.confidenceScore || undefined,
        createdAt: log.createdAt,
      })),
    };
  }

  @Post(':entityId/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark entity as reviewed' })
  @ApiParam({ name: 'entityId', type: 'string' })
  @ApiResponse({ status: 200, type: EntityResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Entity not found' })
  async reviewEntity(
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Body() dto: ReviewEntityDto,
  ): Promise<EntityResponseDto> {
    await this.entityResolutionService.reviewEntity(entityId, dto.reviewedBy);
    return this.getEntity(entityId);
  }
}
