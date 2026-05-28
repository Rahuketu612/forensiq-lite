// API client for ForensiQ Lite - MVP Architecture
// Uses NEXT_PUBLIC_API_URL from environment (no hardcoded localhost)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || 'api';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}/${API_PREFIX}/${API_VERSION}${cleanEndpoint}`;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = buildUrl(endpoint);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { email: string; password: string; name: string }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<User>('/auth/me'),

  // Cases
  getCases: () => request<Case[]>('/cases'),
  getCase: (id: string) => request<Case>(`/cases/${id}`),
  createCase: (data: { title: string; description?: string; clientName?: string }) =>
    request<Case>('/cases', { method: 'POST', body: JSON.stringify(data) }),

  // Transactions
  getTransactions: (caseId: string, params?: TransactionFilters) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString() ? '?' + searchParams.toString() : '';
    return request<TransactionList>(`/cases/${caseId}/transactions${query}`);
  },

  getTransactionStats: (caseId: string) =>
    request<TransactionStats>(`/cases/${caseId}/transactions/stats`),

  getImports: (caseId: string) =>
    request<TransactionImport[]>(`/cases/${caseId}/imports`),

  importTransactions: async (caseId: string, file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const response = await fetch(buildUrl(`/cases/${caseId}/import`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Import failed' }));
      throw new Error(error.message);
    }
    return response.json();
  },
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'AUDITOR' | 'VIEWER';
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'UNDER_REVIEW' | 'CLOSED';
  clientName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  caseId: string;
  importId: string;
  date: string;
  description?: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT' | 'TRANSFER' | 'REFUND' | 'FEE' | 'OTHER';
  balance?: number;
  counterparty?: string;
  mode: string;
  riskScore: number;
  createdAt: string;
  import?: {
    id: string;
    originalName: string;
    importedAt: string;
  };
}

export interface TransactionList {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TransactionFilters {
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

export interface TransactionStats {
  totalTransactions: number;
  totalAmount: number;
  creditTotal: number;
  debitTotal: number;
  netFlow: number;
  byType: { type: string; count: number; amount: number }[];
  byMode: { mode: string; count: number }[];
}

export interface TransactionImport {
  id: string;
  caseId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalRows: number;
  successRows: number;
  failedRows: number;
  importedAt: string;
  importedBy?: { id: string; name: string; email: string };
  _count?: { transactions: number };
}

export interface ImportResult {
  importId: string;
  fileName: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: { row: number; message: string; value: string[] }[];
}

export default api;