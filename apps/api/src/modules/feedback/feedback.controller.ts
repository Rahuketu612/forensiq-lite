import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto, UpdateFeedbackDto, AddCommentDto } from './feedback.dto';
import { JwtAuthGuard } from '../auth/guards';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  async create(@Body() dto: CreateFeedbackDto, @Request() req: any) {
    return this.feedbackService.create(dto, req.user.id);
  }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
  ) {
    return this.feedbackService.findAll({
      status: status as any,
      type,
      priority,
    });
  }

  @Get('stats')
  async getStats() {
    return this.feedbackService.getFeedbackStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.feedbackService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFeedbackDto, @Request() req: any) {
    return this.feedbackService.update(id, dto, req.user.id);
  }

  @Post(':id/comments')
  async addComment(@Param('id') id: string, @Body() dto: AddCommentDto, @Request() req: any) {
    return this.feedbackService.addComment(id, dto, req.user.id);
  }
}