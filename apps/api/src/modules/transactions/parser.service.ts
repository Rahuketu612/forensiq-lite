import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { prisma } from '@forensiq/database';
import { ImportStatus, TransactionType, TransactionMode } from '@forensiq/database';

@Injectable()
export class TransactionParserService {
  private readonly logger = new Logger(TransactionParserService.name);

  /**
   * Parse CSV content into transaction records
   */
  parseCSV(content: string): { transactions: ParsedTransaction[]; errors: ParseError[] } {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
      return { transactions: [], errors: [] };
    }

    const headers = this.parseCSVLine(lines[0]);
    const headerMap = this.detectColumns(headers);

    const transactions: ParsedTransaction[] = [];
    const errors: ParseError[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.every(v => !v.trim())) continue;

      try {
        const tx = this.parseRow(values, headerMap, i + 1);
        transactions.push(tx);
      } catch (error) {
        errors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : 'Parse error',
          value: values,
        });
      }
    }

    return { transactions, errors };
  }

  /**
   * Parse XLSX worksheet data
   */
  parseXLSX(worksheet: Record<string, unknown>[]): { transactions: ParsedTransaction[]; errors: ParseError[] } {
    if (worksheet.length === 0) {
      return { transactions: [], errors: [] };
    }

    const headers = Object.keys(worksheet[0]);
    const headerMap = this.detectColumns(headers);

    const transactions: ParsedTransaction[] = [];
    const errors: ParseError[] = [];

    for (let i = 0; i < worksheet.length; i++) {
      const row = worksheet[i];
      const values = headers.map(h => String(row[h] || ''));
      if (values.every(v => !v.trim())) continue;

      try {
        const tx = this.parseRow(values, headerMap, i + 2);
        transactions.push(tx);
      } catch (error) {
        errors.push({
          row: i + 2,
          message: error instanceof Error ? error.message : 'Parse error',
          value: values,
        });
      }
    }

    return { transactions, errors };
  }

  private detectColumns(headers: string[]): Record<string, number> {
    const normalized = headers.map(h => h.toLowerCase().trim());
    const map: Record<string, number> = {};

    const patterns: Record<string, string[]> = {
      date: ['date', 'transaction date', 'txn date', 'posting date', 'value date'],
      description: ['description', 'desc', 'narrative', 'particulars', 'details'],
      debit: ['debit', 'withdrawal', 'dr', 'debit amount', 'withdrawn'],
      credit: ['credit', 'deposit', 'cr', 'credit amount', 'deposited'],
      amount: ['amount', 'amt', 'transaction amount'],
      balance: ['balance', 'closing balance', 'available balance'],
      counterparty: ['counterparty', 'beneficiary', 'receiver', 'payee', 'to/from'],
      mode: ['mode', 'payment mode', 'transaction mode', 'channel'],
    };

    for (const [field, aliases] of Object.entries(patterns)) {
      for (let i = 0; i < normalized.length; i++) {
        if (aliases.includes(normalized[i])) {
          map[field] = i;
          break;
        }
      }
    }

    return map;
  }

  private parseRow(values: string[], headerMap: Record<string, number>, rowNumber: number): ParsedTransaction {
    // Date
    const dateStr = headerMap.date !== undefined ? values[headerMap.date] : '';
    const date = this.parseDate(dateStr);
    if (!date) throw new Error(`Invalid date: ${dateStr}`);

    // Amount
    const debit = this.parseAmount(headerMap.debit !== undefined ? values[headerMap.debit] : '');
    const credit = this.parseAmount(headerMap.credit !== undefined ? values[headerMap.credit] : '');
    const amountVal = this.parseAmount(headerMap.amount !== undefined ? values[headerMap.amount] : '');

    let amount: number;
    let type: TransactionType;

    if (credit > 0) {
      amount = credit;
      type = TransactionType.CREDIT;
    } else if (debit > 0) {
      amount = debit;
      type = TransactionType.DEBIT;
    } else if (amountVal > 0) {
      amount = amountVal;
      type = TransactionType.OTHER;
    } else {
      throw new Error('No valid amount found');
    }

    // Description
    const description = headerMap.description !== undefined ? values[headerMap.description] : '';

    // Counterparty
    const counterparty = headerMap.counterparty !== undefined ? values[headerMap.counterparty] : '';

    // Balance
    const balanceStr = headerMap.balance !== undefined ? values[headerMap.balance] : '';
    const balance = this.parseAmount(balanceStr);

    // Mode detection
    const mode = this.detectMode(description);

    return {
      date,
      description: description.trim(),
      amount,
      type,
      balance: balance > 0 ? balance : undefined,
      counterparty: counterparty?.trim(),
      mode,
      rowNumber,
      rawData: {},
    };
  }

  private parseDate(value: string): Date | null {
    if (!value) return null;
    const trimmed = value.trim();

    const native = new Date(trimmed);
    if (!isNaN(native.getTime())) return native;

    const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const [, d, m, y] = ddmmyyyy;
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }

    const yyyymmdd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) {
      const [, y, m, d] = yyyymmdd;
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    }

    return null;
  }

  private parseAmount(value: string): number {
    if (!value) return 0;
    let cleaned = value.replace(/[₹$,\s]/g, '');
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }
    cleaned = cleaned.replace(/\s*(CR|DR)\s*/gi, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.abs(parsed);
  }

  private detectMode(description: string): TransactionMode {
    const lower = description.toLowerCase();
    if (lower.includes('cash') || lower.includes('atm')) return TransactionMode.CASH;
    if (lower.includes('cheque') || lower.includes('chq')) return TransactionMode.CHEQUE;
    if (lower.includes('neft')) return TransactionMode.NEFT;
    if (lower.includes('rtgs')) return TransactionMode.RTGS;
    if (lower.includes('upi') || lower.includes('gpay') || lower.includes('phonepe')) return TransactionMode.UPI;
    if (lower.includes('imps')) return TransactionMode.IMPS;
    if (lower.includes('online') || lower.includes('netbanking')) return TransactionMode.ONLINE;
    if (lower.includes('card') || lower.includes('pos')) return TransactionMode.CARD;
    if (lower.includes('transfer')) return TransactionMode.BANK;
    return TransactionMode.OTHER;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }
}

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: TransactionType;
  balance?: number;
  counterparty?: string;
  mode: TransactionMode;
  rowNumber: number;
  rawData: Record<string, unknown>;
}

export interface ParseError {
  row: number;
  message: string;
  value: string[];
}