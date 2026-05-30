import { IsString, IsEnum, IsOptional } from 'class-validator';
import { VoteStatus } from '@forensiq/database';

export class CreateFeatureRequestDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  category?: string;
}

export class UpdateFeatureRequestDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(VoteStatus)
  @IsOptional()
  status?: VoteStatus;

  @IsString()
  @IsOptional()
  plannedFor?: string;
}

export class CastVoteDto {
  @IsString()
  featureId: string;

  @IsString()
  pilotId?: string;

  voteType: 'upvote' | 'downvote';

  @IsString()
  @IsOptional()
  comment?: string;
}