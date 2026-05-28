import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { InvestigationService } from './investigation.service';
import { FileStorageService } from '../../common/services/file-storage.service';
import { JwtAuthGuard } from '../auth/guards';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { InvestigationStatus } from '@forensiq/database';

@ApiTags('Investigation')
@ApiBearerAuth()
@Controller('v1/cases/:caseId')
@UseGuards(JwtAuthGuard)
export class InvestigationController {
  constructor(
    private readonly investigationService: InvestigationService,
    private readonly fileStorageService: FileStorageService,
  ) {}

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
  // Evidence - File Upload
  // ============================================

  @Post('evidence/upload')
  @ApiOperation({ summary: 'Upload evidence file' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async uploadEvidence(
    @Param('caseId') caseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description: string,
    @Body('category') category: string,
    @Body('transactionId') transactionId: string,
    @Body('redFlagId') redFlagId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Save file and generate hash
    const savedFile = await this.fileStorageService.saveFile(
      caseId,
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    // Link evidence in database
    return this.investigationService.linkEvidence(caseId, user.id, {
      fileName: savedFile.fileName,
      originalName: savedFile.originalName,
      mimeType: savedFile.mimeType,
      size: savedFile.size,
      path: this.fileStorageService.getRelativePath(savedFile.path),
      hash: savedFile.hash,
      description,
      category,
      transactionId,
      redFlagId,
    });
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

  @Get('evidence/:evidenceId')
  @ApiOperation({ summary: 'Get evidence file metadata' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'evidenceId', description: 'Evidence ID' })
  async getEvidenceById(
    @Param('caseId') caseId: string,
    @Param('evidenceId') evidenceId: string,
  ) {
    return this.investigationService.getEvidenceById(caseId, evidenceId);
  }

  @Get('evidence/:evidenceId/download')
  @ApiOperation({ summary: 'Download evidence file' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'evidenceId', description: 'Evidence ID' })
  async downloadEvidence(
    @Param('caseId') caseId: string,
    @Param('evidenceId') evidenceId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const evidence = await this.investigationService.getEvidenceById(caseId, evidenceId);
    const filePath = this.fileStorageService.getAbsolutePath(evidence.path);
    const buffer = await this.fileStorageService.getFile(filePath);

    if (!buffer) {
      res.status(404);
      return { error: 'File not found' };
    }

    // Verify hash
    const isValid = await this.fileStorageService.verifyHash(filePath, evidence.hash);
    if (!isValid) {
      res.setHeader('X-File-Warning', 'Hash verification failed');
    }

    res.setHeader('Content-Type', evidence.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${evidence.originalName}"`);
    res.setHeader('X-File-Hash', evidence.hash);
    
    return buffer;
  }

  @Delete('evidence/:evidenceId')
  @ApiOperation({ summary: 'Delete evidence file' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'evidenceId', description: 'Evidence ID' })
  async deleteEvidence(
    @Param('caseId') caseId: string,
    @Param('evidenceId') evidenceId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Get evidence to delete file
    const evidence = await this.investigationService.getEvidenceById(caseId, evidenceId);
    
    // Delete file from storage
    const filePath = this.fileStorageService.getAbsolutePath(evidence.path);
    await this.fileStorageService.deleteFile(filePath);
    
    // Remove from database
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
  @ApiOperation({ summary: 'Upload evidence for red flag' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'flagId', description: 'Red Flag ID' })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async uploadEvidenceForRedFlag(
    @Param('caseId') caseId: string,
    @Param('flagId') flagId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description: string,
    @Body('category') category: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    // Save file and generate hash
    const savedFile = await this.fileStorageService.saveFile(
      caseId,
      file.buffer,
      file.originalname,
      file.mimetype,
    );

    // Link evidence in database
    return this.investigationService.linkEvidence(caseId, user.id, {
      fileName: savedFile.fileName,
      originalName: savedFile.originalName,
      mimeType: savedFile.mimeType,
      size: savedFile.size,
      path: this.fileStorageService.getRelativePath(savedFile.path),
      hash: savedFile.hash,
      description,
      category,
      redFlagId: flagId,
    });
  }
}