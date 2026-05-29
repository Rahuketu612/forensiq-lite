import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class AnalysisRequestDto {
  @ApiPropertyOptional({
    description: 'Model to use for analysis',
    enum: ['phi4', 'llama3:8b', 'qwen3:14b'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['phi4', 'llama3:8b', 'qwen3:14b'])
  model?: string;
}

export class AnalysisResponseDto {
  @ApiProperty({ description: 'The AI-generated analysis' })
  analysis: string;

  @ApiProperty({ description: 'Model used for the analysis' })
  model: string;

  @ApiProperty({ description: 'Duration in milliseconds' })
  duration: number;

  @ApiPropertyOptional({ description: 'Number of tokens generated' })
  tokenCount?: number;
}

export class AiAnalysisRecordDto {
  @ApiProperty({ description: 'Analysis ID' })
  id: string;

  @ApiProperty({ description: 'Case ID' })
  caseId: string;

  @ApiProperty({ description: 'Type of analysis' })
  analysisType: string;

  @ApiProperty({ description: 'AI response' })
  response: string;

  @ApiProperty({ description: 'Model used' })
  modelName: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'User who requested' })
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

export class OllamaStatusDto {
  @ApiProperty({ description: 'Whether Ollama is available' })
  available: boolean;

  @ApiProperty({ description: 'Available models' })
  models: string[];
}
