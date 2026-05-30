import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Column mapping configuration for transaction import
 */
export class ColumnMappingDto {
  @ApiProperty({ description: 'Source column name from the import file' })
  @IsString()
  sourceColumn: string;

  @ApiProperty({ 
    description: 'Target field in Transaction model',
    enum: ['date', 'description', 'debit', 'credit', 'amount', 'balance', 'counterparty', 'mode', 'referenceNumber']
  })
  @IsString()
  targetField: string;

  @ApiPropertyOptional({ description: 'Transform function to apply (optional)' })
  @IsOptional()
  @IsString()
  transform?: string;
}

/**
 * Request to confirm column mapping and start import
 */
export class ConfirmMappingDto {
  @ApiProperty({ description: 'Column mapping configuration', type: [ColumnMappingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnMappingDto)
  columns: ColumnMappingDto[];

  @ApiPropertyOptional({ description: 'Skip header row', default: true })
  @IsOptional()
  @IsBoolean()
  skipHeader?: boolean;

  @ApiPropertyOptional({ description: 'Skip rows with invalid data', default: true })
  @IsOptional()
  @IsBoolean()
  skipInvalid?: boolean;

  @ApiPropertyOptional({ description: 'Start processing from row number' })
  @IsOptional()
  @IsNumber()
  startFromRow?: number;
}

/**
 * Preview of data to be imported with mapping applied
 */
export class MappingPreviewDto {
  @ApiProperty({ description: 'Import ID' })
  id: string;

  @ApiProperty({ description: 'Original file name' })
  fileName: string;

  @ApiProperty({ description: 'Current import status' })
  status: string;

  @ApiProperty({ description: 'File type: csv, xlsx, or pdf' })
  fileType: string;

  @ApiProperty({ description: 'Is this a scanned PDF requiring OCR' })
  isScanned: boolean;

  @ApiProperty({ description: 'Does this file have OCR text' })
  hasOcrText: boolean;

  @ApiProperty({ description: 'Available columns from the import file' })
  availableColumns: string[];

  @ApiProperty({ description: 'Preview rows with data', type: [Object] })
  previewRows: Record<string, unknown>[];

  @ApiProperty({ description: 'Total number of rows in file' })
  totalRows: number;

  @ApiProperty({ description: 'Required fields for a valid transaction' })
  requiredFields: string[];

  @ApiProperty({ description: 'Optional fields that can be mapped' })
  optionalFields: string[];

  @ApiProperty({ description: 'Mapping suggestion based on column names' })
  suggestedMapping: ColumnMappingDto[];
}

/**
 * Result of confirming mapping and starting import
 */
export class MappingResultDto {
  @ApiProperty({ description: 'Import ID' })
  id: string;

  @ApiProperty({ description: 'New import status' })
  status: string;

  @ApiProperty({ description: 'Total rows found' })
  totalRows: number;

  @ApiProperty({ description: 'Successfully imported rows' })
  successRows: number;

  @ApiProperty({ description: 'Failed rows' })
  failedRows: number;

  @ApiProperty({ description: 'Mapping configuration used' })
  mappingConfig: ColumnMappingDto[];

  @ApiProperty({ description: 'Error log if any' })
  errors: Array<{ row: number; error: string }>;

  @ApiProperty({ description: 'Success message' })
  message: string;
}
