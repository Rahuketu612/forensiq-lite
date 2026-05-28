import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('v1/cases/:caseId')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('import')
  @ApiOperation({ summary: 'Import transactions from CSV/XLSX' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @UseInterceptors(FileInterceptor('file'))
  async importTransactions(
    @Param('caseId') caseId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
        fileIsRequired: true,
      })
    ) file: Express.Multer.File,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.transactionsService.importTransactions(caseId, file, user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transactions for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async getTransactions(
    @Param('caseId') caseId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @Query('mode') mode?: string,
    @Query('search') search?: string,
  ) {
    return this.transactionsService.getTransactions(caseId, {
      page,
      limit,
      startDate,
      endDate,
      type,
      mode,
      search,
    });
  }

  @Get('imports')
  @ApiOperation({ summary: 'Get import history for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async getImports(@Param('caseId') caseId: string) {
    return this.transactionsService.getImports(caseId);
  }
}