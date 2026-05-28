import { Module } from '@nestjs/common';
import { MappingController } from './mapping.controller';
import { MappingService } from './mapping.service';

@Module({
  controllers: [MappingController],
  providers: [MappingService],
  exports: [MappingService],
})
export class MappingModule {}

// Export DTOs for use in other modules
export { 
  ColumnMappingDto, 
  ConfirmMappingDto, 
  MappingPreviewDto, 
  MappingResultDto 
} from './mapping.dto';
