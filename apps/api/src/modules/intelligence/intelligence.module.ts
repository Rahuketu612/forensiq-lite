import { Module } from '@nestjs/common';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { InvestigationAiModule } from '../investigation-ai/investigation-ai.module';
import { OllamaService } from '../investigation-ai/ollama.service';

@Module({
  imports: [InvestigationAiModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService, OllamaService],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}