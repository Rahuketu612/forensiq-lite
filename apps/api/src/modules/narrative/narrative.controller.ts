import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NarrativeService } from './narrative.service';
import { GenerateNarrativeDto, UpdateNarrativeDto, UpdateNarrativeSectionDto } from './narrative.dto';
import { JwtAuthGuard } from '../auth/guards';

@Controller('narratives')
@UseGuards(JwtAuthGuard)
export class NarrativeController {
  constructor(private readonly narrativeService: NarrativeService) {}

  @Post('generate')
  async generate(@Body() dto: GenerateNarrativeDto, @Request() req: any) {
    return this.narrativeService.generateNarrative(dto, req.user?.id);
  }

  @Get('case/:caseId')
  async findAllForCase(@Param('caseId') caseId: string) {
    return this.narrativeService.findAll(caseId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.narrativeService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateNarrativeDto, @Request() req: any) {
    return this.narrativeService.updateNarrative(id, dto, req.user?.id);
  }

  @Put(':id/section')
  async updateSection(@Param('id') id: string, @Body() dto: UpdateNarrativeSectionDto) {
    return this.narrativeService.updateSection(id, dto);
  }
}