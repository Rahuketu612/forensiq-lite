import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { FeatureVoteService } from './feature-vote.service';
import { CreateFeatureRequestDto, UpdateFeatureRequestDto, CastVoteDto } from './feature-vote.dto';
import { JwtAuthGuard } from '../auth/guards';

@Controller('features')
@UseGuards(JwtAuthGuard)
export class FeatureVoteController {
  constructor(private readonly featureVoteService: FeatureVoteService) {}

  @Post()
  async create(@Body() dto: CreateFeatureRequestDto, @Request() req: any) {
    return this.featureVoteService.createFeatureRequest(dto, req.user?.id);
  }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.featureVoteService.findAllFeatures({
      status: status as any,
      category,
    });
  }

  @Get('top')
  async getTop(@Query('limit') limit?: string) {
    return this.featureVoteService.getTopFeatures(limit ? parseInt(limit) : 10);
  }

  @Get('stats')
  async getStats() {
    return this.featureVoteService.getFeatureStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.featureVoteService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFeatureRequestDto) {
    return this.featureVoteService.updateFeatureRequest(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.featureVoteService.updateFeatureRequest(id, { status: 'DECLINED' } as any);
  }

  @Post('vote')
  async castVote(@Body() dto: CastVoteDto, @Request() req: any) {
    return this.featureVoteService.castVote(dto, req.user?.id);
  }
}