import { Module } from '@nestjs/common';
import { InvestigationGraphController } from './investigation-graph.controller';
import { InvestigationGraphService } from './investigation-graph.service';

@Module({
  controllers: [InvestigationGraphController],
  providers: [InvestigationGraphService],
  exports: [InvestigationGraphService],
})
export class InvestigationGraphModule {}
