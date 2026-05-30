import { Module } from '@nestjs/common';
import { InvestigationAiController } from './investigation-ai.controller';
import { InvestigationAiService } from './investigation-ai.service';
import { OllamaService } from './ollama.service';
import { PromptBuilderService } from './prompt-builder.service';

@Module({
  controllers: [InvestigationAiController],
  providers: [
    InvestigationAiService,
    OllamaService,
    PromptBuilderService,
  ],
  exports: [InvestigationAiService, OllamaService],
})
export class InvestigationAiModule {}
