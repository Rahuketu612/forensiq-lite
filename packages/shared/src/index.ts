// Shared types and utilities for ForensiQ Lite
// MVP Architecture - Simplified

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  services: {
    database: { status: 'up' | 'down' };
    api: { status: 'up' | 'down' };
  };
}

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[+]?[\d\s-]{10,}$/,
  CASE_NUMBER: /^[A-Z]{2,4}-\d{4}-\d{3,6}$/,
} as const;

export function isValidEmail(email: string): boolean {
  return VALIDATION_RULES.EMAIL.test(email);
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string, format: 'short' | 'long' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: format === 'long' ? 'long' : 'short',
    year: 'numeric',
  }).format(d);
}

export function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900 + 100);
  return `FR-${year}-${random}`;
}