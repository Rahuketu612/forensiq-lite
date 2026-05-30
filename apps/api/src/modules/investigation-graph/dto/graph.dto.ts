import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class NodeFiltersDto {
  @IsOptional()
  @IsString()
  nodeType?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minRiskScore?: number;
}

export class EdgeFiltersDto {
  @IsOptional()
  @IsString()
  edgeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number;
}

export class GraphFiltersDto {
  @IsOptional()
  nodeFilters?: NodeFiltersDto;

  @IsOptional()
  edgeFilters?: EdgeFiltersDto;
}
