import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { InvestigationAiModule } from '../investigation-ai/investigation-ai.module';
import { OllamaService } from '../investigation-ai/ollama.service';

@Module({
  imports: [ConfigModule, InvestigationAiModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService, OllamaService],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}