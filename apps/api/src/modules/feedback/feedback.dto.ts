import { IsString, IsEnum, IsOptional } from 'class-validator';
import { FeedbackType, FeedbackPriority, FeedbackStatus } from '@forensiq/database';

export class CreateFeedbackDto {
  @IsString()
  pilotId: string;

  @IsEnum(FeedbackType)
  feedbackType: FeedbackType;

  @IsString()
  subject: string;

  @IsString()
  description: string;

  @IsEnum(FeedbackPriority)
  @IsOptional()
  priority?: FeedbackPriority;

  @IsString()
  @IsOptional()
  pageUrl?: string;

  browserInfo?: Record<string, any>;

  @IsString()
  @IsOptional()
  screenshotUrl?: string;
}

export class UpdateFeedbackDto {
  @IsEnum(FeedbackStatus)
  @IsOptional()
  status?: FeedbackStatus;

  @IsString()
  @IsOptional()
  response?: string;

  @IsEnum(FeedbackPriority)
  @IsOptional()
  priority?: FeedbackPriority;
}

export class AddCommentDto {
  @IsString()
  comment: string;
}