import { Module } from '@nestjs/common';
import { RedFlagsController } from './red-flags.controller';
import { RedFlagRuleEngine } from './red-flag-rule-engine.service';

@Module({
  controllers: [RedFlagsController],
  providers: [RedFlagRuleEngine],
  exports: [RedFlagRuleEngine],
})
export class RedFlagsModule {}