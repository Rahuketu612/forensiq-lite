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
   * Import transactions from file (CSV/XLSX)
   * Transactions must remain traceable to original import file.
   */
  async importTransactions(
    caseId: string,
    file: Express.Multer.File,
    userId: string
  ): Promise<ImportResult> {
    // Verify case exists
    const caseData = await prisma.case.findUnique({ where: { id: caseId } });
    if (!caseData) {
      throw new NotFoundException('Case not found');
    }

    // Validate file type - CSV/XLSX only
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(file.mimetype) && ext !== 'csv' && ext !== 'xlsx') {
      throw new BadRequestException('Invalid file type. Only CSV and XLSX allowed.');
    }

    // Create import record
    const importRecord = await prisma.transactionImport.create({
      data: {
        caseId,
        fileName: `import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        importedById: userId,
        status: ImportStatus.PROCESSING,
      },
    });

    try {
      // Parse file based on type
      let parseResult: ParseResult;
      
      if (ext === 'csv') {
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
          for (const txData of parseResult.transactions) {
            try {
              await tx.transaction.create({
                data: {
                  importId: importRecord.id,
                  caseId,
                  date: txData.date,
                  description: txData.description,
                  amount: txData.amount,
                  type: txData.type,
                  balance: txData.balance,
                  counterparty: txData.counterparty,
                  mode: txData.mode,
                  rowNumber: txData.rowNumber,
                  rawData: txData.rawData as object,
                },
              });
              successCount++;
            } catch (error) {
              failedCount++;
              this.logger.warn(`Failed to store transaction row ${txData.rowNumber}:`, error);
            }
          }
        });
      }

      // Update import status to COMPLETED
      await prisma.transactionImport.update({
        where: { id: importRecord.id },
        data: {
          status: ImportStatus.COMPLETED,
          totalRows: parseResult.transactions.length + parseResult.errors.length,
          successRows: successCount,
          failedRows: failedCount,
          errorLog: parseResult.errors.length > 0 ? JSON.parse(JSON.stringify(parseResult.errors)) : undefined,
        },
      });

      return {
        importId: importRecord.id,
        fileName: file.originalname,
        totalRows: parseResult.transactions.length + parseResult.errors.length,
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
   * Get transactions with filters and pagination
   */
  async getTransactions(
    caseId: string,
    options: TransactionFilters = {}
  ): Promise<TransactionListResult> {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      type,
      mode,
      search,
      minAmount,
      maxAmount,
    } = options;

    // Build where clause
    const where: TransactionWhere = { caseId };

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Type filter
    if (type) where.type = type as 'CREDIT' | 'DEBIT' | 'TRANSFER' | 'REFUND' | 'FEE' | 'OTHER';

    // Mode filter
    if (mode) where.mode = mode as any;

    // Search filter (narration/counterparty)
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { counterparty: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Amount range filter
    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) where.amount.gte = minAmount;
      if (maxAmount !== undefined) where.amount.lte = maxAmount;
    }

    // Query with pagination
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          import: {
            select: {
              id: true,
              originalName: true,
              importedAt: true,
            },
          },
        },
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
   * Get transaction statistics for a case
   */
  async getStats(caseId: string): Promise<TransactionStats> {
    const [transactions, byType, byMode] = await Promise.all([
      prisma.transaction.findMany({ where: { caseId } }),
      prisma.transaction.groupBy({
        by: ['type'],
        where: { caseId },
        _count: true,
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ['mode'],
        where: { caseId },
        _count: true,
      }),
    ]);

    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const creditTotal = transactions.filter(tx => tx.type === 'CREDIT').reduce((sum, tx) => sum + tx.amount, 0);
    const debitTotal = transactions.filter(tx => tx.type === 'DEBIT').reduce((sum, tx) => sum + tx.amount, 0);

    return {
      totalTransactions: transactions.length,
      totalAmount,
      creditTotal,
      debitTotal,
      netFlow: creditTotal - debitTotal,
      byType: byType.map(t => ({
        type: t.type,
        count: t._count,
        amount: t._sum.amount || 0,
      })),
      byMode: byMode.map(m => ({
        mode: m.mode,
        count: m._count,
      })),
    };
  }

  /**
   * Get transaction imports for a case
   */
  async getImports(caseId: string): Promise<any[]> {
    return prisma.transactionImport.findMany({
      where: { caseId },
      orderBy: { importedAt: 'desc' },
      include: {
        importedBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { transactions: true },
        },
      },
    });
  }

  /**
   * Get single transaction by ID
   */
  async getTransaction(id: string): Promise<any> {
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        import: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }
}

// Type definitions
interface TransactionFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  type?: string;
  mode?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
}

interface TransactionWhere {
  caseId: string;
  date?: { gte?: Date; lte?: Date };
  type?: 'CREDIT' | 'DEBIT' | 'TRANSFER' | 'REFUND' | 'FEE' | 'OTHER';
  mode?: 'CASH' | 'CHEQUE' | 'NEFT' | 'RTGS' | 'UPI' | 'OTHER';
  OR?: Array<{ description?: { contains: string; mode: 'insensitive' }; counterparty?: { contains: string; mode: 'insensitive' } }>;
  amount?: { gte?: number; lte?: number };
}

interface ImportResult {
  importId: string;
  fileName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: ParseError[];
}

interface ParseResult {
  transactions: ParsedTransaction[];
  errors: ParseError[];
}

interface ParseError {
  row: number;
  message: string;
  value: string[];
}

interface TransactionListResult {
  transactions: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface TransactionStats {
  totalTransactions: number;
  totalAmount: number;
  creditTotal: number;
  debitTotal: number;
  netFlow: number;
  byType: { type: string; count: number; amount: number }[];
  byMode: { mode: string; count: number }[];
}