import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma, ImportStatus, TransactionType } from '@forensiq/database';
import { ColumnMappingDto, ConfirmMappingDto, MappingPreviewDto, MappingResultDto } from './mapping.dto';

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  rawData: Record<string, unknown>;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
  fileType: 'csv' | 'xlsx' | 'pdf' | 'ocr';
}

@Injectable()
export class MappingService {
  private readonly requiredFields = ['date', 'amount'];
  private readonly optionalFields = ['description', 'debit', 'credit', 'balance', 'counterparty', 'mode', 'referenceNumber'];

  /**
   * Get mapping preview for an import
   */
  async getMappingPreview(importId: string, caseId: string): Promise<MappingPreviewDto> {
    const transactionImport = await prisma.transactionImport.findFirst({
      where: { id: importId, caseId },
    });

    if (!transactionImport) {
      throw new NotFoundException('Import not found');
    }

    // Determine file type
    const fileType = this.getFileType(transactionImport);

    // Get parsed data based on file type
    const parseResult = await this.parseImportData(transactionImport);

    // Generate mapping suggestions based on column names
    const suggestedMapping = this.suggestMapping(parseResult.headers);

    return {
      id: transactionImport.id,
      fileName: transactionImport.originalName,
      status: transactionImport.status,
      fileType,
      isScanned: transactionImport.isScanned,
      hasOcrText: !!transactionImport.ocrText,
      availableColumns: parseResult.headers,
      previewRows: parseResult.rows.map(r => r.data),
      totalRows: parseResult.totalRows,
      requiredFields: this.requiredFields,
      optionalFields: this.optionalFields,
      suggestedMapping,
    };
  }

  /**
   * Confirm mapping and process import
   */
  async confirmMapping(
    importId: string,
    caseId: string,
    dto: ConfirmMappingDto,
    userId: string,
  ): Promise<MappingResultDto> {
    const transactionImport = await prisma.transactionImport.findFirst({
      where: { id: importId, caseId },
    });

    if (!transactionImport) {
      throw new NotFoundException('Import not found');
    }

    // Validate required fields are mapped
    this.validateMapping(dto.columns);

    // Update status to processing
    await prisma.transactionImport.update({
      where: { id: importId },
      data: { status: ImportStatus.PROCESSING },
    });

    // Get parsed data
    const parseResult = await this.parseImportData(transactionImport);

    // Process rows and create transactions
    const { successRows, failedRows, errors } = await this.processRows(
      parseResult,
      dto,
      importId,
      caseId,
      transactionImport.caseId,
    );

    // Update import with results
    const updatedImport = await prisma.transactionImport.update({
      where: { id: importId },
      data: {
        status: failedRows === parseResult.rows.length 
          ? ImportStatus.FAILED 
          : ImportStatus.COMPLETED,
        totalRows: parseResult.rows.length,
        successRows,
        failedRows,
        errorLog: errors.length > 0 ? JSON.parse(JSON.stringify(errors)) : undefined,
        mappingConfig: JSON.parse(JSON.stringify(dto.columns)),
        mappedBy: userId,
        mappedAt: new Date(),
      },
    });

    return {
      id: updatedImport.id,
      status: updatedImport.status,
      totalRows: updatedImport.totalRows,
      successRows: updatedImport.successRows,
      failedRows: updatedImport.failedRows,
      mappingConfig: dto.columns,
      errors,
      message: `Successfully imported ${successRows} of ${parseResult.rows.length} transactions.`,
    };
  }

  /**
   * Parse import data based on file type
   */
  private async parseImportData(importRecord: {
    mimeType: string;
    extractedText?: string | null;
    ocrText?: string | null;
  }): Promise<ParseResult> {
    const fileType = this.getFileType(importRecord);

    if (fileType === 'pdf' || fileType === 'ocr') {
      return this.parseTextData(importRecord.extractedText || importRecord.ocrText || '');
    }

    // For CSV/XLSX, we would normally read from storage
    // For now, return placeholder data
    return {
      headers: ['Date', 'Description', 'Debit', 'Credit', 'Balance'],
      rows: [],
      totalRows: 0,
      fileType,
    };
  }

  /**
   * Parse text data (PDF or OCR) into rows
   */
  private parseTextData(text: string): ParseResult {
    if (!text) {
      return { headers: [], rows: [], totalRows: 0, fileType: 'pdf' };
    }

    const lines = text.split('\n').filter(line => line.trim());
    
    // Try to detect header row
    const firstLine = lines[0] || '';
    const headers = this.extractColumns(firstLine);
    
    // Check if first line looks like headers
    const looksLikeHeader = headers.some(h => 
      /^(date|description|amount|debit|credit|balance|transaction|narration|particulars)$/i.test(h)
    );

    const dataRows = looksLikeHeader ? lines.slice(1) : lines;
    const rows: ParsedRow[] = dataRows.map((line, index) => {
      const columns = this.extractColumns(line);
      const data: Record<string, string> = {};
      headers.forEach((header, i) => {
        data[header] = columns[i] || '';
      });
      return {
        rowNumber: index + 2, // Account for potential header row
        data,
        rawData: { originalLine: line, columns },
      };
    });

    return {
      headers: headers.length > 0 ? headers : ['Column1', 'Column2', 'Column3', 'Column4', 'Column5'],
      rows,
      totalRows: rows.length,
      fileType: 'pdf',
    };
  }

  /**
   * Extract columns from a line of text
   */
  private extractColumns(line: string): string[] {
    // Try tab-separated first
    if (line.includes('\t')) {
      return line.split('\t').map(s => s.trim());
    }
    
    // Try multiple spaces
    const parts = line.split(/\s{2,}/);
    if (parts.length > 3) {
      return parts.map(s => s.trim());
    }
    
    // Single space split
    return line.split(/\s+/).map(s => s.trim());
  }

  /**
   * Get file type from MIME type
   */
  private getFileType(record: { mimeType: string; hasText?: boolean }): 'csv' | 'xlsx' | 'pdf' | 'ocr' {
    const mime = record.mimeType.toLowerCase();
    
    if (mime.includes('csv') || mime === 'text/csv') return 'csv';
    if (mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('xlsx')) return 'xlsx';
    if (mime.includes('pdf')) return record.hasText ? 'pdf' : 'ocr';
    
    return 'pdf';
  }

  /**
   * Suggest mapping based on common column names
   */
  private suggestMapping(columns: string[]): ColumnMappingDto[] {
    const suggestions: ColumnMappingDto[] = [];
    const columnLower = columns.map(c => c.toLowerCase());

    // Date detection
    const dateIndex = columnLower.findIndex(c => 
      /^(date|transaction[\s_-]?date|posted[\s_-]?date|value[\s_-]?date|trx[\s_-]?date)$/i.test(c)
    );
    if (dateIndex !== -1) {
      suggestions.push({ sourceColumn: columns[dateIndex], targetField: 'date' });
    }

    // Description/Narration detection
    const descIndex = columnLower.findIndex(c =>
      /^(description|narration|particulars|details|transaction|particular|remarks|narr)$/i.test(c)
    );
    if (descIndex !== -1) {
      suggestions.push({ sourceColumn: columns[descIndex], targetField: 'description' });
    }

    // Amount detection
    const amountIndex = columnLower.findIndex(c =>
      /^(amount|transaction[\s_-]?amount|value|sum|total)$/i.test(c)
    );
    if (amountIndex !== -1) {
      suggestions.push({ sourceColumn: columns[amountIndex], targetField: 'amount' });
    }

    // Debit detection
    const debitIndex = columnLower.findIndex(c =>
      /^(debit|withdrawal|dr|debit[\s_-]?amount)$/i.test(c)
    );
    if (debitIndex !== -1) {
      suggestions.push({ sourceColumn: columns[debitIndex], targetField: 'debit' });
    }

    // Credit detection
    const creditIndex = columnLower.findIndex(c =>
      /^(credit|deposit|cr|credit[\s_-]?amount)$/i.test(c)
    );
    if (creditIndex !== -1) {
      suggestions.push({ sourceColumn: columns[creditIndex], targetField: 'credit' });
    }

    // Balance detection
    const balanceIndex = columnLower.findIndex(c =>
      /^(balance|closing[\s_-]?balance|running[\s_-]?balance|available)$/i.test(c)
    );
    if (balanceIndex !== -1) {
      suggestions.push({ sourceColumn: columns[balanceIndex], targetField: 'balance' });
    }

    // Counterparty detection
    const counterpartyIndex = columnLower.findIndex(c =>
      /^(counterparty|beneficiary|payee|account[\s_-]?name|from|to|whom[\s_-]?paid)$/i.test(c)
    );
    if (counterpartyIndex !== -1) {
      suggestions.push({ sourceColumn: columns[counterpartyIndex], targetField: 'counterparty' });
    }

    return suggestions;
  }

  /**
   * Validate that required fields are mapped
   */
  private validateMapping(columns: ColumnMappingDto[]): void {
    const mappedFields = columns.map(c => c.targetField);
    
    const missingRequired = this.requiredFields.filter(f => !mappedFields.includes(f));
    
    if (missingRequired.length > 0) {
      throw new BadRequestException(
        `Missing required field mappings: ${missingRequired.join(', ')}`
      );
    }
  }

  /**
   * Process rows and create transactions
   */
  private async processRows(
    parseResult: ParseResult,
    dto: ConfirmMappingDto,
    importId: string,
    caseId: string,
    caseRecordId: string,
  ): Promise<{ successRows: number; failedRows: number; errors: Array<{ row: number; error: string }> }> {
    let successRows = 0;
    const errors: Array<{ row: number; error: string }> = [];

    const startRow = dto.startFromRow || (dto.skipHeader ? 2 : 1);
    const rowsToProcess = parseResult.rows.filter(r => r.rowNumber >= startRow);

    for (const row of rowsToProcess) {
      try {
        // Apply mapping to extract transaction data
        const transactionData = this.applyMapping(row.data, dto.columns);

        if (!transactionData) {
          if (!dto.skipInvalid) {
            throw new Error('Missing required data');
          }
          continue;
        }

        // Create transaction
        await prisma.transaction.create({
          data: {
            importId,
            caseId: caseRecordId,
            date: transactionData.date,
            description: transactionData.description,
            amount: transactionData.amount,
            type: transactionData.type,
            balance: transactionData.balance,
            counterparty: transactionData.counterparty,
            mode: transactionData.mode as any,
            referenceNumber: transactionData.referenceNumber,
            rowNumber: row.rowNumber,
            rawData: JSON.parse(JSON.stringify(row.rawData)),
          },
        });

        successRows++;
      } catch (error) {
        errors.push({
          row: row.rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        if (!dto.skipInvalid) {
          throw error;
        }
      }
    }

    return { successRows, failedRows: errors.length, errors };
  }

  /**
   * Apply mapping to extract transaction data from a row
   */
  private applyMapping(
    rowData: Record<string, string>,
    columns: ColumnMappingDto[],
  ): {
    date: Date;
    description?: string;
    amount: number;
    type: TransactionType;
    balance?: number;
    counterparty?: string;
    mode?: string;
    referenceNumber?: string;
  } | null {
    const mapped: Record<string, unknown> = {};

    for (const col of columns) {
      mapped[col.targetField] = rowData[col.sourceColumn];
    }

    // Parse date
    const dateStr = mapped.date as string;
    if (!dateStr) return null;
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    // Parse amount
    let amount = 0;
    let type: TransactionType = TransactionType.OTHER;

    if (mapped.amount) {
      amount = this.parseAmount(mapped.amount as string);
      type = amount >= 0 ? TransactionType.CREDIT : TransactionType.DEBIT;
    } else {
      const debit = this.parseAmount((mapped.debit as string) || '0');
      const credit = this.parseAmount((mapped.credit as string) || '0');
      amount = credit - Math.abs(debit);
      type = credit > 0 ? TransactionType.CREDIT : TransactionType.DEBIT;
    }

    if (amount === 0) return null;

    return {
      date,
      description: (mapped.description as string) || undefined,
      amount: Math.abs(amount),
      type,
      balance: mapped.balance ? this.parseAmount(mapped.balance as string) : undefined,
      counterparty: (mapped.counterparty as string) || undefined,
      mode: (mapped.mode as string) || undefined,
      referenceNumber: (mapped.referenceNumber as string) || undefined,
    };
  }

  /**
   * Parse amount string to number
   */
  private parseAmount(value: string): number {
    if (!value) return 0;
    
    // Remove currency symbols, commas, spaces
    const cleaned = value.replace(/[₹$€£,\s]/g, '').trim();
    
    // Handle parentheses as negative
    const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
    const numStr = isNegative ? cleaned.slice(1, -1) : cleaned;
    
    const num = parseFloat(numStr);
    return isNaN(num) ? 0 : (isNegative ? -num : num);
  }
}
