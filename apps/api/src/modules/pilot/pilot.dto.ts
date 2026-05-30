import { IsString, IsEmail, IsOptional, IsEnum, IsArray } from 'class-validator';
import { PilotStatus, PilotPhase } from '@forensiq/database';

export class CreatePilotDto {
  @IsString()
  firmName: string;

  @IsString()
  @IsOptional()
  firmSize?: string;

  @IsString()
  contactName: string;

  @IsEmail()
  contactEmail: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsEnum(PilotStatus)
  @IsOptional()
  pilotStatus?: PilotStatus;

  @IsEnum(PilotPhase)
  @IsOptional()
  currentPhase?: PilotPhase;

  @IsArray()
  @IsOptional()
  objectives?: string[];
}

export class UpdatePilotDto {
  @IsString()
  @IsOptional()
  firmName?: string;

  @IsString()
  @IsOptional()
  firmSize?: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsEnum(PilotStatus)
  @IsOptional()
  pilotStatus?: PilotStatus;

  @IsEnum(PilotPhase)
  @IsOptional()
  currentPhase?: PilotPhase;

  @IsArray()
  @IsOptional()
  objectives?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateDemoDto {
  @IsString()
  demoType: string;

  attendees?: string[];

  @IsString()
  @IsOptional()
  outcome?: string;

  @IsString()
  @IsOptional()
  nextSteps?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RecordActivityDto {
  @IsString()
  activity: string;

  metadata?: Record<string, any>;
}

export class RecordMetricDto {
  @IsString()
  metricType: string;

  value: number;

  @IsString()
  periodStart: string;

  @IsString()
  periodEnd: string;

  metadata?: Record<string, any>;
}