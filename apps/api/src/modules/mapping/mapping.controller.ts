import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards';
import { MappingService } from './mapping.service';
import { ConfirmMappingDto } from './mapping.dto';

@ApiTags('Mapping')
@ApiBearerAuth()
@Controller('v1/cases/:caseId/imports')
@UseGuards(JwtAuthGuard)
export class MappingController {
  constructor(private readonly mappingService: MappingService) {}

  @Get(':importId/mapping-preview')
  @ApiOperation({ summary: 'Get preview of data with suggested column mapping' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'importId', description: 'Import ID' })
  async getMappingPreview(
    @Param('caseId') caseId: string,
    @Param('importId') importId: string,
  ) {
    return this.mappingService.getMappingPreview(importId, caseId);
  }

  @Post(':importId/confirm-mapping')
  @ApiOperation({ 
    summary: 'Confirm column mapping and start transaction import',
    description: 'Please verify mapping before import. These records will become forensic transaction records.'
  })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'importId', description: 'Import ID' })
  async confirmMapping(
    @Param('caseId') caseId: string,
    @Param('importId') importId: string,
    @Body() dto: ConfirmMappingDto,
    @Request() req: { user: { userId: string } },
  ) {
    // Note: User ID comes from JWT in real implementation
    // For now, we'll use a placeholder
    const userId = req?.user?.userId || 'system';
    
    return this.mappingService.confirmMapping(importId, caseId, dto, userId);
  }

  @Get(':importId/mapping-status')
  @ApiOperation({ summary: 'Get current mapping status for an import' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'importId', description: 'Import ID' })
  async getMappingStatus(
    @Param('caseId') caseId: string,
    @Param('importId') importId: string,
  ) {
    const { prisma } = await import('@forensiq/database');
    const transactionImport = await prisma.transactionImport.findFirst({
      where: { id: importId, caseId },
      select: {
        id: true,
        status: true,
        mappingConfig: true,
        mappedBy: true,
        mappedAt: true,
        successRows: true,
        failedRows: true,
        totalRows: true,
      },
    });

    if (!transactionImport) {
      throw new NotFoundException('Import not found');
    }

    return {
      id: transactionImport.id,
      status: transactionImport.status,
      hasMapping: !!transactionImport.mappingConfig,
      mappingConfig: transactionImport.mappingConfig,
      mappedBy: transactionImport.mappedBy,
      mappedAt: transactionImport.mappedAt,
      progress: {
        total: transactionImport.totalRows,
        success: transactionImport.successRows,
        failed: transactionImport.failedRows,
        processed: transactionImport.successRows + transactionImport.failedRows,
      },
    };
  }
}
