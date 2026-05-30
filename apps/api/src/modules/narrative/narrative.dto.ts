import { IsString, IsEnum, IsOptional, IsObject, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { NarrativeStatus } from '@forensiq/database';

// Timeline event structure
export class TimelineEventDto {
  date: string;
  type: string;
  title: string;
  description: string;
  transactionId?: string;
  flagId?: string;
  entityId?: string;
  importance: 'low' | 'medium' | 'high';
}

// Observation structure
export class ObservationDto {
  id: string;
  category: string;
  title: string;
  description: string;
  evidence: string[];
  confidence: number;
}

// Open question structure
export class OpenQuestionDto {
  id: string;
  question: string;
  context: string;
  priority: 'low' | 'medium' | 'high';
  relatedTransactions?: string[];
  relatedEntities?: string[];
  relatedFlags?: string[];
}

// Evidence gap structure
export class EvidenceGapDto {
  id: string;
  gap: string;
  whyItMatters: string;
  suggestedAction: string;
  priority: 'low' | 'medium' | 'high';
}

// Recommendation structure
export class RecommendationDto {
  id: string;
  recommendation: string;
  rationale: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

// Generate narrative DTO
export class GenerateNarrativeDto {
  @IsString()
  caseId: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  prompt?: string;

  @IsArray()
  @IsOptional()
  includeSections?: string[];
}

// Update narrative DTO
export class UpdateNarrativeDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsArray()
  @IsOptional()
  timeline?: TimelineEventDto[];

  @IsArray()
  @IsOptional()
  observations?: ObservationDto[];

  @IsArray()
  @IsOptional()
  openQuestions?: OpenQuestionDto[];

  @IsArray()
  @IsOptional()
  evidenceGaps?: EvidenceGapDto[];

  @IsArray()
  @IsOptional()
  recommendations?: RecommendationDto[];

  @IsString()
  @IsOptional()
  summary?: string;

  @IsEnum(NarrativeStatus)
  @IsOptional()
  status?: NarrativeStatus;
}

// Manual narrative section update
export class UpdateNarrativeSectionDto {
  @IsString()
  section: 'timeline' | 'observations' | 'openQuestions' | 'evidenceGaps' | 'recommendations';

  @IsArray()
  data: any[];
}