import { Module } from '@nestjs/common';
import { FundTrailController } from './fund-trail.controller';
import { FundTrailService } from './fund-trail.service';

@Module({
  controllers: [FundTrailController],
  providers: [FundTrailService],
  exports: [FundTrailService],
})
export class FundTrailModule {}
