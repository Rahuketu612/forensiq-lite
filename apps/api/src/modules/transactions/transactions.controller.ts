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
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';

@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('v1/cases/:caseId')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('import')
  @ApiOperation({ summary: 'Import transactions from CSV/XLSX file' })
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
  ): Promise<any> {
    return this.transactionsService.importTransactions(caseId, file, user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transactions for a case with filters and pagination' })
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
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
  ): Promise<any> {
    return this.transactionsService.getTransactions(caseId, {
      page,
      limit,
      startDate,
      endDate,
      type,
      mode,
      search,
      minAmount: minAmount ? parseFloat(minAmount) : undefined,
      maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
    });
  }

  @Get('transactions/stats')
  @ApiOperation({ summary: 'Get transaction statistics for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async getStats(@Param('caseId') caseId: string): Promise<any> {
    return this.transactionsService.getStats(caseId);
  }

  @Get('imports')
  @ApiOperation({ summary: 'Get import history for a case' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  async getImports(@Param('caseId') caseId: string): Promise<any[]> {
    return this.transactionsService.getImports(caseId);
  }

  @Get('transactions/:transactionId')
  @ApiOperation({ summary: 'Get single transaction by ID' })
  @ApiParam({ name: 'caseId', description: 'Case ID' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  async getTransaction(
    @Param('caseId') caseId: string,
    @Param('transactionId') transactionId: string,
  ): Promise<any> {
    const transaction = await this.transactionsService.getTransaction(transactionId);
    if (transaction.caseId !== caseId) {
      throw new NotFoundException('Transaction not found in this case');
    }
    return transaction;
  }
}