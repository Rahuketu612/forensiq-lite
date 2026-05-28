import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { prisma } from '@forensiq/database';
import { TransactionParserService, ParsedTransaction } from './parser.service';
import { ImportStatus } from '@forensiq/database';
import * as XLSX from 'xlsx';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  private readonly parser = new TransactionParserService();

  /**
   * Import transactions from file
   */
  async importTransactions(
    caseId: string,
    file: Express.Multer.File,
    userId: string
  ) {
    // Verify case exists
    const caseData = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caseData) {
      throw new NotFoundException('Case not found');
    }

    // Validate file
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!validTypes.includes(file.mimetype) && !file.originalname.endsWith('.csv') && !file.originalname.endsWith('.xlsx')) {
      throw new BadRequestException('Invalid file type. Only CSV and XLSX allowed.');
    }

    // Create import record
    const importRecord = await prisma.transactionImport.create({
      data: {
        caseId,
        fileName: `import_${Date.now()}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        importedById: userId,
        status: ImportStatus.PROCESSING,
      },
    });

    try {
      // Parse file
      let parseResult: { transactions: ParsedTransaction[]; errors: { row: number; message: string; value: string[] }[] };
      
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        const content = file.buffer.toString('utf-8');
        parseResult = this.parser.parseCSV(content);
      } else {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as Record<string, unknown>[];
        parseResult = this.parser.parseXLSX(worksheet);
      }

      // Store transactions
      let successCount = 0;
      let failedCount = 0;

      if (parseResult.transactions.length > 0) {
        await prisma.$transaction(async (tx) => {
          for (const tx_data of parseResult.transactions) {
            try {
              await tx.transaction.create({
                data: {
                  importId: importRecord.id,
                  caseId,
                  date: tx_data.date,
                  description: tx_data.description,
                  amount: tx_data.amount,
                  type: tx_data.type,
                  balance: tx_data.balance,
                  counterparty: tx_data.counterparty,
                  mode: tx_data.mode,
                  rowNumber: tx_data.rowNumber,
                  rawData: tx_data.rawData as object,
                },
              });
              successCount++;
            } catch (error) {
              failedCount++;
            }
          }
        });
      }

      // Update import status
      await prisma.transactionImport.update({
        where: { id: importRecord.id },
        data: {
          status: ImportStatus.COMPLETED,
          totalRows: parseResult.transactions.length + parseResult.errors.length,
          successRows: successCount,
          failedRows: failedCount,
          errorLog: parseResult.errors.length > 0 ? parseResult.errors : undefined,
        },
      });

      return {
        importId: importRecord.id,
        totalRows: parseResult.transactions.length,
        successRows: successCount,
        failedRows: failedCount,
        errors: parseResult.errors,
      };
    } catch (error) {
      this.logger.error(`Import failed:`, error);
      await prisma.transactionImport.update({
        where: { id: importRecord.id },
        data: {
          status: ImportStatus.FAILED,
          errorLog: { message: error instanceof Error ? error.message : 'Unknown error' },
        },
      });
      throw error;
    }
  }

  /**
   * Get transactions for a case
   */
  async getTransactions(caseId: string, options: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    type?: string;
    mode?: string;
    search?: string;
  } = {}) {
    const { page = 1, limit = 50, startDate, endDate, type, mode, search } = options;

    const where: Record<string, unknown> = { caseId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }
    if (type) where.type = type;
    if (mode) where.mode = mode;
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { counterparty: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get transaction imports for a case
   */
  async getImports(caseId: string) {
    return prisma.transactionImport.findMany({
      where: { caseId },
      orderBy: { importedAt: 'desc' },
    });
  }
}