import { Module } from '@nestjs/common';
import { FundTrailController } from './fund-trail.controller';
import { FundTrailService } from './fund-trail.service';
import { PatternDetectionService } from './pattern-detection.service';

@Module({
  controllers: [FundTrailController],
  providers: [FundTrailService, PatternDetectionService],
  exports: [FundTrailService, PatternDetectionService],
})
export class FundTrailModule {}
