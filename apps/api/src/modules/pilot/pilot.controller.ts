import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PilotService } from './pilot.service';
import { CreatePilotDto, UpdatePilotDto, CreateDemoDto, RecordActivityDto, RecordMetricDto } from './pilot.dto';
import { JwtAuthGuard } from '../auth/guards';

@Controller('pilot')
@UseGuards(JwtAuthGuard)
export class PilotController {
  constructor(private readonly pilotService: PilotService) {}

  @Post()
  async create(@Body() dto: CreatePilotDto) {
    return this.pilotService.create(dto);
  }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('phase') phase?: string,
  ) {
    return this.pilotService.findAll({
      status: status as any,
      phase: phase as any,
    });
  }

  @Get('summary')
  async getSummary() {
    return this.pilotService.getPilotSummary();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.pilotService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePilotDto) {
    return this.pilotService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.pilotService.delete(id);
  }

  // Demo management
  @Post(':id/demos')
  async addDemo(@Param('id') id: string, @Body() dto: CreateDemoDto) {
    return this.pilotService.addDemo(id, dto);
  }

  @Get(':id/demos')
  async getDemos(@Param('id') id: string) {
    return this.pilotService.getDemos(id);
  }

  // Activity tracking
  @Post(':id/activities')
  async recordActivity(@Param('id') id: string, @Body() dto: RecordActivityDto) {
    return this.pilotService.recordActivity(id, dto);
  }

  // Metrics
  @Post(':id/metrics')
  async recordMetric(@Param('id') id: string, @Body() dto: RecordMetricDto) {
    return this.pilotService.recordMetric(id, dto);
  }
}