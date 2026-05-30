import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsEmail,
  IsNumber,
  MinLength,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';
import { CaseStatus, RiskLevel } from '@forensiq/database';
import { Transform } from 'class-transformer';

export class CreateCaseDto {
  @ApiProperty({ example: 'FRA-2024-001', description: 'Unique case number' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  caseNumber: string;

  @ApiProperty({ example: 'Suspicious Transaction Analysis - ABC Corp', minLength: 5 })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Investigation into potential fraud at ABC Corp for Q4 2023' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'John Smith' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  clientName?: string;

  @ApiPropertyOptional({ example: 'client@company.com' })
  @IsEmail()
  @IsOptional()
  clientEmail?: string;

  @ApiPropertyOptional({ example: '+91 9876543210' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  clientPhone?: string;

  @ApiPropertyOptional({ example: '123 Business Street, Mumbai 400001' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  clientAddress?: string;

  @ApiPropertyOptional({ enum: CaseStatus, default: CaseStatus.DRAFT })
  @IsEnum(CaseStatus)
  @IsOptional()
  status?: CaseStatus;

  @ApiPropertyOptional({ enum: RiskLevel })
  @IsEnum(RiskLevel)
  @IsOptional()
  riskLevel?: RiskLevel;
}

export class UpdateCaseDto extends PartialType(CreateCaseDto) {
  @ApiPropertyOptional({ enum: CaseStatus })
  @IsEnum(CaseStatus)
  @IsOptional()
  status?: CaseStatus;

  @ApiPropertyOptional({ enum: RiskLevel })
  @IsEnum(RiskLevel)
  @IsOptional()
  riskLevel?: RiskLevel;
}

export class AssignCaseDto {
  @ApiProperty({ description: 'User ID to assign the case to' })
  @IsString()
  userId: string;
}

export class CaseQueryDto {
  @ApiPropertyOptional({ enum: CaseStatus })
  @IsEnum(CaseStatus)
  @IsOptional()
  status?: CaseStatus;

  @ApiPropertyOptional({ enum: RiskLevel })
  @IsEnum(RiskLevel)
  @IsOptional()
  riskLevel?: RiskLevel;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Sort by field' })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Sort order (asc/desc)', default: 'desc' })
  @IsEnum(['asc', 'desc'])
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ description: 'Search by title or case number' })
  @IsString()
  @IsOptional()
  search?: string;
}

export class CaseStatusUpdateDto {
  @ApiProperty({ enum: CaseStatus, description: 'New case status' })
  @IsEnum(CaseStatus)
  status: CaseStatus;
}