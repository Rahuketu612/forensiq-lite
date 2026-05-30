/**
 * Types for import and mapping operations
 */

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transform?: string;
}

export interface MappingPreview {
  id: string;
  fileName: string;
  status: ImportStatus;
  fileType: 'csv' | 'xlsx' | 'pdf' | 'ocr';
  isScanned: boolean;
  hasOcrText: boolean;
  availableColumns: string[];
  previewRows: Record<string, unknown>[];
  totalRows: number;
  requiredFields: string[];
  optionalFields: string[];
  suggestedMapping: ColumnMapping[];
}

export interface ConfirmMappingRequest {
  columns: ColumnMapping[];
  skipHeader?: boolean;
  skipInvalid?: boolean;
  startFromRow?: number;
}

export interface MappingResult {
  id: string;
  status: ImportStatus;
  totalRows: number;
  successRows: number;
  failedRows: number;
  mappingConfig: ColumnMapping[];
  errors: Array<{ row: number; error: string }>;
  message: string;
}

export interface MappingStatus {
  id: string;
  status: ImportStatus;
  hasMapping: boolean;
  mappingConfig: ColumnMapping[];
  mappedBy: string | null;
  mappedAt: string | null;
  progress: {
    total: number;
    success: number;
    failed: number;
    processed: number;
  };
}

export type ImportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'NEEDS_MANUAL_MAPPING'
  | 'MAPPING_CONFIRMED'
  | 'EXTRACTED_TEXT'
  | 'OCR_PENDING'
  | 'OCR_PROCESSING'
  | 'OCR_COMPLETED'
  | 'OCR_FAILED';

export const TARGET_FIELDS = [
  { value: 'date', label: 'Date', required: true },
  { value: 'description', label: 'Description / Narration', required: false },
  { value: 'amount', label: 'Amount', required: true },
  { value: 'debit', label: 'Debit', required: false },
  { value: 'credit', label: 'Credit', required: false },
  { value: 'balance', label: 'Balance', required: false },
  { value: 'counterparty', label: 'Counterparty / Beneficiary', required: false },
  { value: 'mode', label: 'Mode (NEFT/RTGS/UPI/etc)', required: false },
  { value: 'referenceNumber', label: 'Reference Number', required: false },
] as const;
