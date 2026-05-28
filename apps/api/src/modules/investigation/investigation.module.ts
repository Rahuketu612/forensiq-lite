import { Module } from '@nestjs/common';
import { InvestigationController } from './investigation.controller';
import { InvestigationService } from './investigation.service';
import { FileStorageService } from '../../common/services/file-storage.service';

@Module({
  controllers: [InvestigationController],
  providers: [InvestigationService, FileStorageService],
  exports: [InvestigationService, FileStorageService],
})
export class InvestigationModule {}