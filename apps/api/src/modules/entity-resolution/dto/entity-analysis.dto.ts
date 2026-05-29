import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class AnalyzeEntitiesDto {
  @ApiPropertyOptional({ description: 'Force re-analysis even if entities exist' })
  @IsBoolean()
  @IsOptional()
  force?: boolean;
}

export class EntityQueryDto {
  @ApiPropertyOptional({ description: 'Include reviewed entities' })
  @IsBoolean()
  @IsOptional()
  includeReviewed?: boolean;
}

export class ReviewEntityDto {
  @ApiPropertyOptional({ description: 'User ID who reviewed' })
  @IsString()
  @IsOptional()
  reviewedBy?: string;
}

export class EntityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  caseId: string;

  @ApiProperty()
  canonicalName: string;

  @ApiProperty()
  riskScore: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  transactionCount: number;

  @ApiProperty()
  reviewed: boolean;

  @ApiPropertyOptional()
  reviewedBy?: string;

  @ApiPropertyOptional()
  reviewedAt?: Date;

  @ApiPropertyOptional()
  explanation?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: 'array' })
  aliases: EntityAliasResponseDto[];

  @ApiPropertyOptional({ type: 'array' })
  transactions?: TransactionSummaryDto[];

  @ApiPropertyOptional({ type: 'array' })
  auditLogs?: AuditLogSummaryDto[];
}

export class EntityAliasResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  aliasName: string;

  @ApiProperty()
  matchType: string;

  @ApiPropertyOptional()
  source?: string;

  @ApiProperty()
  confidenceScore: number;

  @ApiPropertyOptional()
  matchReason?: string;

  @ApiProperty()
  createdAt: Date;
}

export class TransactionSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  type: string;

  @ApiPropertyOptional()
  counterparty?: string;

  @ApiPropertyOptional()
  description?: string;
}

export class AuditLogSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  action: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  confidenceScore?: number;

  @ApiProperty()
  createdAt: Date;
}

export class AnalyzeResultDto {
  @ApiProperty()
  totalEntities: number;

  @ApiProperty()
  totalTransactions: number;

  @ApiProperty()
  created: number;

  @ApiProperty()
  updated: number;

  @ApiProperty({ type: 'array' })
  entities: EntityListItemDto[];
}

export class EntityListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  canonicalName: string;

  @ApiProperty()
  transactionCount: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  riskScore: number;

  @ApiProperty()
  reviewed: boolean;

  @ApiProperty({ type: 'array' })
  aliases: string[];

  @ApiProperty()
  confidenceScore: number;
}
