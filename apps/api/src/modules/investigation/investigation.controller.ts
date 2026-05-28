import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { InvestigationService } from './investigation.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { InvestigationStatus } from '@forensiq/database';

@ApiTags('Investigation')
@ApiBearerAuth()
@Controller('v1/cases/:caseId')
@UseGuards(JwtAuthGuard)
export class InvestigationController {
  constructor(private readonly investigationService: InvestigationService) {}

  // ============================================
  // Notes
  // ============================================

  @Post('notes')
  @ApiOperation({ summary: 'Create investigation note' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async createNote(
    @Param('caseId') caseId: string,
    @Body() body: { title: string; content: string; transactionId?: string; redFlagId?: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.investigationService.createNote(caseId, user.id, body);
  }

  @Get('notes')
  @ApiOperation({ summary: 'Get investigation notes' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async getNotes(
    @Param('caseId') caseId: string,
    @Query('transactionId') transactionId?: string,
    @Query('redFlagId') redFlagId?: string,
    @Query('authorId') authorId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.investigationService.getNotes(caseId, {
      transactionId,
      redFlagId,
      authorId,
      page,
      limit,
    });
  }

  @Put('notes/:noteId')
  @ApiOperation({ summary: 'Update investigation note' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'noteId', description: 'Note ID' })
  async updateNote(
    @Param('noteId') noteId: string,
    @Body() body: { title?: string; content?: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.investigationService.updateNote(noteId, user.id, body);
  }

  @Delete('notes/:noteId')
  @ApiOperation({ summary: 'Delete investigation note' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'noteId', description: 'Note ID' })
  async deleteNote(@Param('noteId') noteId: string) {
    return this.investigationService.deleteNote(noteId);
  }

  // ============================================
  // Evidence
  // ============================================

  @Post('evidence')
  @ApiOperation({ summary: 'Link evidence file' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async linkEvidence(
    @Param('caseId') caseId: string,
    @Body() body: {
      fileName: string;
      originalName: string;
      mimeType: string;
      size: number;
      path: string;
      description?: string;
      category?: string;
      transactionId?: string;
      redFlagId?: string;
    },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.investigationService.linkEvidence(caseId, user.id, body);
  }

  @Get('evidence')
  @ApiOperation({ summary: 'Get evidence files' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async getEvidence(
    @Param('caseId') caseId: string,
    @Query('transactionId') transactionId?: string,
    @Query('redFlagId') redFlagId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.investigationService.getEvidence(caseId, {
      transactionId,
      redFlagId,
      page,
      limit,
    });
  }

  @Delete('evidence/:evidenceId')
  @ApiOperation({ summary: 'Remove evidence file' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'evidenceId', description: 'Evidence ID' })
  async removeEvidence(
    @Param('caseId') caseId: string,
    @Param('evidenceId') evidenceId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.investigationService.removeEvidence(caseId, user.id, evidenceId);
  }

  // ============================================
  // Timeline
  // ============================================

  @Get('timeline')
  @ApiOperation({ summary: 'Get investigation timeline' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async getTimeline(
    @Param('caseId') caseId: string,
    @Query('redFlagId') redFlagId?: string,
    @Query('transactionId') transactionId?: string,
    @Query('eventType') eventType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.investigationService.getTimeline(caseId, {
      redFlagId,
      transactionId,
      eventType: eventType as any,
      page,
      limit,
    });
  }

  // ============================================
  // Red Flag Investigation
  // ============================================

  @Get('red-flags/:flagId')
  @ApiOperation({ summary: 'Get red flag with investigation details' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'flagId', description: 'Red Flag ID' })
  async getRedFlagDetails(@Param('flagId') flagId: string) {
    return this.investigationService.getRedFlagDetails(flagId);
  }

  @Put('red-flags/:flagId/status')
  @ApiOperation({ summary: 'Update red flag investigation status' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'flagId', description: 'Red Flag ID' })
  async updateRedFlagStatus(
    @Param('caseId') caseId: string,
    @Param('flagId') flagId: string,
    @Body() body: { status: InvestigationStatus; note?: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.investigationService.updateRedFlagStatus(flagId, caseId, user.id, body.status, body.note);
  }

  @Post('red-flags/:flagId/notes')
  @ApiOperation({ summary: 'Add note to red flag' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'flagId', description: 'Red Flag ID' })
  async addNoteToRedFlag(
    @Param('caseId') caseId: string,
    @Param('flagId') flagId: string,
    @Body() body: { title: string; content: string },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.investigationService.createNote(caseId, user.id, {
      ...body,
      redFlagId: flagId,
    });
  }

  @Post('red-flags/:flagId/evidence')
  @ApiOperation({ summary: 'Attach evidence to red flag' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'flagId', description: 'Red Flag ID' })
  async attachEvidenceToRedFlag(
    @Param('caseId') caseId: string,
    @Param('flagId') flagId: string,
    @Body() body: {
      fileName: string;
      originalName: string;
      mimeType: string;
      size: number;
      path: string;
      description?: string;
      category?: string;
    },
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.investigationService.linkEvidence(caseId, user.id, {
      ...body,
      redFlagId: flagId,
    });
  }
}