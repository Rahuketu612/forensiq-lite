import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CaseBriefRequestDto {
  @ApiPropertyOptional({ description: 'Model to use for analysis' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ description: 'Include executive summary' })
  @IsOptional()
  includeExecutiveSummary?: boolean = true;

  @ApiPropertyOptional({ description: 'Include key findings' })
  @IsOptional()
  includeKeyFindings?: boolean = true;

  @ApiPropertyOptional({ description: 'Include risk assessment' })
  @IsOptional()
  includeRiskAssessment?: boolean = true;
}

export class RedFlagExplainerRequestDto {
  @ApiProperty({ description: 'Red Flag ID to explain' })
  @IsString()
  redFlagId: string;

  @ApiPropertyOptional({ description: 'Model to use for analysis' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ description: 'Detail level: basic, detailed, comprehensive' })
  @IsString()
  @IsOptional()
  detailLevel?: 'basic' | 'detailed' | 'comprehensive' = 'detailed';
}

export class InterviewQuestionsRequestDto {
  @ApiPropertyOptional({ description: 'Model to use for analysis' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ description: 'Focus areas: redflags, transactions, entities, general' })
  @IsString()
  @IsOptional()
  focusArea?: string;

  @ApiPropertyOptional({ description: 'Number of questions to generate' })
  @IsOptional()
  count?: number = 10;
}

export class EvidenceRequestBuilderRequestDto {
  @ApiProperty({ description: 'Analysis type or evidence gap to address' })
  @IsString()
  analysisType: string;

  @ApiPropertyOptional({ description: 'Model to use for analysis' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ description: 'Request type: document, testimony, external' })
  @IsString()
  @IsOptional()
  requestType?: string;
}

export class SimilarPatternRequestDto {
  @ApiPropertyOptional({ description: 'Model to use for analysis' })
  @IsString()
  @IsOptional()
  model?: string;

  @ApiPropertyOptional({ description: 'Pattern types to search for' })
  @IsString()
  @IsOptional()
  patternTypes?: string;

  @ApiPropertyOptional({ description: 'Minimum transaction amount' })
  @IsOptional()
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum transaction amount' })
  @IsOptional()
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Time window in days' })
  @IsOptional()
  timeWindowDays?: number = 90;
}

export class IntelligenceResponseDto {
  @ApiProperty({ description: 'Analysis ID for audit trail' })
  analysisId: string;

  @ApiProperty({ description: 'Analysis content' })
  content: string;

  @ApiProperty({ description: 'Model used' })
  model: string;

  @ApiProperty({ description: 'Token count' })
  tokenCount: number;

  @ApiProperty({ description: 'Duration in ms' })
  duration: number;

  @ApiProperty({ description: 'Timestamp' })
  createdAt: Date;
}

export class CaseBriefResponseDto extends IntelligenceResponseDto {
  @ApiProperty({ description: 'Brief sections' })
  sections?: {
    executiveSummary?: string;
    keyFindings?: string[];
    riskAssessment?: string;
    recommendations?: string[];
  };
}

export class SimilarPatternResponseDto extends IntelligenceResponseDto {
  @ApiProperty({ description: 'Found patterns' })
  patterns?: {
    type: string;
    description: string;
    confidence: number;
    affectedTransactions: string[];
  }[];
}