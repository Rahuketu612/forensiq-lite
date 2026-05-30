import { Module } from '@nestjs/common';
import { FeatureVoteController } from './feature-vote.controller';
import { FeatureVoteService } from './feature-vote.service';

@Module({
  controllers: [FeatureVoteController],
  providers: [FeatureVoteService],
  exports: [FeatureVoteService],
})
export class FeatureVoteModule {}