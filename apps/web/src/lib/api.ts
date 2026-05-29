// API client for ForensiQ Lite - MVP Architecture
// Uses NEXT_PUBLIC_API_URL from environment (no hardcoded localhost)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || 'api';
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('forensiq_token');
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
    request<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (data: { email: string; password: string; name: string }) =>
    request<{ accessToken: string; user: User }>('/auth/register', {
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
    const token = localStorage.getItem('forensiq_token');
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

  // Red Flags
  runRedFlags: (caseId: string) =>
    request<RunRedFlagsResult>(`/cases/${caseId}/run-red-flags`, { method: 'POST' }),

  getRedFlags: (caseId: string, filters?: RedFlagFilters) => {
    const searchParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          searchParams.set(key, String(value));
        }
      });
    }
    const query = searchParams.toString() ? '?' + searchParams.toString() : '';
    return request<RedFlagList>(`/cases/${caseId}/red-flags${query}`);
  },

  getRedFlagStats: (caseId: string) =>
    request<RedFlagStats>(`/cases/${caseId}/red-flags/stats`),

  markRedFlagReviewed: (caseId: string, flagId: string) =>
    request<RedFlag>(`/cases/${caseId}/red-flags/${flagId}/review`, { method: 'POST' }),

  addRedFlagFeedback: (caseId: string, flagId: string, feedback: string, type: 'IMPORTANT' | 'FALSE_POSITIVE' | 'NEEDS_EVIDENCE' | 'IGNORE') =>
    request<RedFlag>(`/cases/${caseId}/red-flags/${flagId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback, type }),
    }),

  // Investigation - Notes
  createNote: (caseId: string, data: { title: string; content: string; transactionId?: string; redFlagId?: string }) =>
    request<InvestigationNote>(`/cases/${caseId}/notes`, { method: 'POST', body: JSON.stringify(data) }),

  getNotes: (caseId: string, filters?: InvestigationFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value));
      });
    }
    const query = params.toString() ? '?' + params.toString() : '';
    return request<InvestigationNoteList>(`/cases/${caseId}/notes${query}`);
  },

  // Investigation - Evidence
  uploadEvidence: async (caseId: string, file: File, metadata: {
    description?: string;
    category?: string;
    transactionId?: string;
    redFlagId?: string;
  }): Promise<EvidenceFile> => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.description) formData.append('description', metadata.description);
    if (metadata.category) formData.append('category', metadata.category);
    if (metadata.transactionId) formData.append('transactionId', metadata.transactionId);
    if (metadata.redFlagId) formData.append('redFlagId', metadata.redFlagId);
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('forensiq_token') : null;
    return fetch(`${API_BASE_URL}/cases/${caseId}/evidence/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token || ''}` },
      body: formData,
    }).then((res) => res.json());
  },

  getEvidence: (caseId: string, filters?: { transactionId?: string; redFlagId?: string }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value));
      });
    }
    const query = params.toString() ? '?' + params.toString() : '';
    return request<EvidenceFileList>(`/cases/${caseId}/evidence${query}`);
  },

  getEvidenceById: (caseId: string, evidenceId: string) =>
    request<EvidenceFile>(`/cases/${caseId}/evidence/${evidenceId}`),

  getEvidenceDownloadUrl: (caseId: string, evidenceId: string) =>
    `${API_BASE_URL}/cases/${caseId}/evidence/${evidenceId}/download`,

  deleteEvidence: (caseId: string, evidenceId: string) =>
    request(`/cases/${caseId}/evidence/${evidenceId}`, { method: 'DELETE' }),

  // Investigation - Timeline
  getTimeline: (caseId: string, filters?: { redFlagId?: string; transactionId?: string }) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') params.set(key, String(value));
      });
    }
    const query = params.toString() ? '?' + params.toString() : '';
    return request<TimelineList>(`/cases/${caseId}/timeline${query}`);
  },

  // Investigation - Red Flag Details
  getRedFlagDetails: (caseId: string, flagId: string) =>
    request<RedFlagDetails>(`/cases/${caseId}/red-flags/${flagId}`),

  updateRedFlagStatus: (caseId: string, flagId: string, status: string, note?: string) =>
    request<RedFlag>(`/cases/${caseId}/red-flags/${flagId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, note }),
    }),

  addNoteToRedFlag: (caseId: string, flagId: string, data: { title: string; content: string }) =>
    request<InvestigationNote>(`/cases/${caseId}/red-flags/${flagId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Dashboard
  getDashboard: (caseId: string) =>
    request<CaseDashboard>(`/cases/${caseId}/dashboard`),

  // Entity Resolution
  analyzeEntities: (caseId: string, force?: boolean) =>
    request<EntityAnalyzeResult>(`/cases/${caseId}/entities/analyze`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    }),

  getEntities: (caseId: string, includeReviewed?: boolean) => {
    const params = new URLSearchParams();
    if (includeReviewed !== undefined) params.set('includeReviewed', String(includeReviewed));
    const query = params.toString() ? '?' + params.toString() : '';
    return request<EntityList>(`/cases/${caseId}/entities${query}`);
  },

  getEntity: (caseId: string, entityId: string) =>
    request<Entity>(`/cases/${caseId}/entities/${entityId}`),

  reviewEntity: (caseId: string, entityId: string, reviewedBy?: string) =>
    request<Entity>(`/cases/${caseId}/entities/${entityId}/review`, {
      method: 'POST',
      body: JSON.stringify({ reviewedBy }),
    }),

  // AI Analysis
  checkAiStatus: (): Promise<{ available: boolean; models: string[] }> =>
    request<{ available: boolean; models: string[] }>('/cases/ai/status'),

  getAiHistory: (caseId: string) =>
    request<AiAnalysisRecord[]>(`/cases/${caseId}/ai/history`),

  generateAiSummary: (caseId: string, model?: string) =>
    request<AiAnalysisResult>(`/cases/${caseId}/ai/summary`, {
      method: 'POST',
      body: JSON.stringify({ model }),
    }),

  generateAiTimeline: (caseId: string, model?: string) =>
    request<AiAnalysisResult>(`/cases/${caseId}/ai/timeline`, {
      method: 'POST',
      body: JSON.stringify({ model }),
    }),

  generateAiQuestions: (caseId: string, model?: string) =>
    request<AiAnalysisResult>(`/cases/${caseId}/ai/questions`, {
      method: 'POST',
      body: JSON.stringify({ model }),
    }),

  generateAiEvidenceGaps: (caseId: string, model?: string) =>
    request<AiAnalysisResult>(`/cases/${caseId}/ai/evidence-gaps`, {
      method: 'POST',
      body: JSON.stringify({ model }),
    }),

  generateAiFullAnalysis: (caseId: string, model?: string) =>
    request<AiAnalysisResult>(`/cases/${caseId}/ai/full-analysis`, {
      method: 'POST',
      body: JSON.stringify({ model }),
    }),
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

// Red Flags
export interface RedFlag {
  id: string;
  caseId: string;
  ruleId: string;
  ruleName: string;
  transactionId: string;
  explanation: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  feedbackType?: 'IMPORTANT' | 'FALSE_POSITIVE' | 'NEEDS_EVIDENCE' | 'IGNORE';
  feedbackNote?: string;
  createdAt: string;
  transaction?: Transaction;
}

export interface RedFlagList {
  flags: RedFlag[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RedFlagStats {
  total: number;
  high: number;
  medium: number;
  low: number;
  critical: number;
  reviewed: number;
  unreviewed: number;
  bySeverity: { severity: string; count: number }[];
  byRule: { ruleName: string; count: number }[];
}

export interface RedFlagFilters {
  page?: number;
  limit?: number;
  severity?: string;
  reviewed?: boolean;
  ruleName?: string;
}

export interface RunRedFlagsResult {
  message: string;
  totalFlagsFound: number;
  newFlagsCreated: number;
  stats: {
    total: number;
    bySeverity: Record<string, number>;
    byRule: Record<string, number>;
  };
}

// Investigation
export interface InvestigationNote {
  id: string;
  caseId: string;
  title: string;
  content: string;
  authorId: string;
  author?: { id: string; name: string; email: string };
  transactionId?: string;
  transaction?: { id: string; date: string; amount: number; type: string };
  redFlagId?: string;
  redFlag?: { id: string; ruleName: string; severity: string; status: string };
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationNoteList {
  notes: InvestigationNote[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EvidenceFile {
  id: string;
  caseId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  hash: string;
  description?: string;
  category?: string;
  transactionId?: string;
  transaction?: { id: string; date: string; amount: number };
  redFlagId?: string;
  redFlag?: { id: string; ruleName: string; severity: string };
  uploadedById: string;
  uploadedBy?: { id: string; name: string; email: string };
  uploadedAt: string;
}

export interface EvidenceFileList {
  files: EvidenceFile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TimelineEntry {
  id: string;
  caseId: string;
  eventType: string;
  title: string;
  description?: string;
  redFlagId?: string;
  redFlag?: { id: string; ruleName: string; severity: string; status: string };
  transactionId?: string;
  transaction?: { id: string; date: string; amount: number; type: string };
  userId: string;
  user?: { id: string; name: string; email: string };
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface TimelineList {
  entries: TimelineEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RedFlagDetails {
  id: string;
  caseId: string;
  ruleId?: string;
  ruleName: string;
  transactionId: string;
  title: string;
  explanation: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'FALSE_POSITIVE';
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  feedbackType?: string;
  feedbackNote?: string;
  createdAt: string;
  updatedAt: string;
  transaction: {
    id: string;
    date: string;
    description?: string;
    amount: number;
    type: string;
    counterparty?: string;
    balance?: number;
    mode: string;
  };
  evidenceFiles: EvidenceFile[];
  investigationNotes: InvestigationNote[];
  timeline: TimelineEntry[];
}

export interface InvestigationFilters {
  page?: number;
  limit?: number;
  transactionId?: string;
  redFlagId?: string;
  authorId?: string;
}

// Dashboard
export interface CaseDashboard {
  caseId: string;
  caseData: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  statistics: {
    totalTransactions: number;
    totalImports: number;
    totalRedFlags: number;
    highSeverityFlags: number;
    reviewedFlags: number;
    unreviewedFlags: number;
    evidenceFilesCount: number;
    investigationNotesCount: number;
    latestActivity: string | null;
  };
  progress: {
    redFlagsReviewedPercent: number;
  };
  recentActivity: ActivityEntry[];
}

export interface ActivityEntry {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  user: { id: string; name: string; email: string } | null;
  createdAt: string;
  entityType?: string;
}

export default api;
// Fund Trail
export interface FundTrailLink {
  id: string;
  sourceTransaction: {
    id: string;
    date: string;
    amount: number;
    type: string;
    counterparty: string | null;
    description: string | null;
  };
  targetTransaction: {
    id: string;
    date: string;
    amount: number;
    type: string;
    counterparty: string | null;
    description: string | null;
  };
  linkReason: string;
  confidenceScore: number;
  explanation: string;
  amountDifference: number | null;
  timeDifferenceMs: number | null;
  narrationSimilarity: number | null;
  createdAt: string;
}

export interface FundTrailAuditEntry {
  action: string;
  timestamp: string;
  details: string;
}

export interface FundTrailResult {
  caseId: string;
  transactionCount: number;
  linksCreated: number;
  links: FundTrailLink[];
  auditTrail: FundTrailAuditEntry[];
}

// Entity Resolution
export interface EntityAlias {
  id: string;
  aliasName: string;
  matchType: string;
  source?: string;
  confidenceScore: number;
  matchReason?: string;
  createdAt: string;
}

export interface EntityTransaction {
  id: string;
  date: string;
  amount: number;
  type: string;
  counterparty?: string;
  description?: string;
}

export interface EntityAuditLog {
  id: string;
  action: string;
  description: string;
  confidenceScore?: number;
  createdAt: string;
}

export interface Entity {
  id: string;
  caseId: string;
  canonicalName: string;
  riskScore: number;
  totalAmount: number;
  transactionCount: number;
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  explanation?: string;
  createdAt: string;
  aliases: EntityAlias[];
  transactions?: EntityTransaction[];
  auditLogs?: EntityAuditLog[];
}

export interface EntityAnalyzeResult {
  totalEntities: number;
  totalTransactions: number;
  created: number;
  updated: number;
  entities: Entity[];
}

export interface EntityList {
  entities: Entity[];
  total: number;
}

// Fund Trail Patterns
export type PatternType = 'CIRCULAR_FLOW' | 'LAYERING' | 'ROUND_TRIPPING' | 'REPEATED_CHAIN';

export interface FundTrailPattern {
  id: string;
  caseId: string;
  patternType: PatternType;
  title: string;
  explanation: string;
  confidenceScore: number;
  totalAmount: number | null;
  transactionIds: string[];
  counterparties: string[];
  timeWindowStart: string | null;
  timeWindowEnd: string | null;
  reviewed: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'FALSE_POSITIVE';
  createdAt: string;
  createdBy?: { id: string; name: string; email: string };
}

export interface PatternAnalysisResult {
  caseId: string;
  patternsDetected: number;
  byType: Record<string, number>;
  patterns: Array<{
    patternType: PatternType;
    title: string;
    explanation: string;
    confidenceScore: number;
    totalAmount: number | null;
    transactionIds: string[];
    counterparties: string[];
    timeWindowStart: Date | null;
    timeWindowEnd: Date | null;
  }>;
  auditTrail: FundTrailAuditEntry[];
}

export interface PatternSummary {
  patterns: FundTrailPattern[];
  summary: {
    total: number;
    byType: Record<string, number>;
  };
}

export interface PatternDetail {
  pattern: FundTrailPattern;
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
    type: string;
    counterparty: string | null;
    description: string | null;
  }>;
}

export interface AnalyzePatternsOptions {
  layeringTimeWindowDays?: number;
  layeringAmountTolerance?: number;
  roundTrippingDays?: number;
  roundTrippingTolerance?: number;
  minChainLength?: number;
}

export const fundTrailApi = {
  getFundTrail: (caseId: string): Promise<FundTrailResult> =>
    request<FundTrailResult>(`/cases/${caseId}/fund-trail`),

  generateFundTrail: (caseId: string): Promise<FundTrailResult> =>
    request<FundTrailResult>(`/cases/${caseId}/fund-trail/generate`, { method: 'POST' }),

  // Pattern Analysis
  analyzePatterns: (caseId: string, options?: AnalyzePatternsOptions): Promise<PatternAnalysisResult> =>
    request<PatternAnalysisResult>(`/cases/${caseId}/fund-trail/analyze`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),

  getPatterns: (caseId: string): Promise<PatternSummary> =>
    request<PatternSummary>(`/cases/${caseId}/fund-trail/patterns`),

  getPattern: (caseId: string, patternId: string): Promise<PatternDetail> =>
    request<PatternDetail>(`/cases/${caseId}/fund-trail/patterns/${patternId}`),

  updatePatternStatus: (caseId: string, patternId: string, status: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/cases/${caseId}/fund-trail/patterns/${patternId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  deleteLink: (caseId: string, linkId: string): Promise<void> =>
    request<void>(`/cases/${caseId}/fund-trail/links/${linkId}`, { method: 'DELETE' }),
};

// AI Analysis Types
export interface AiAnalysisResult {
  analysis: string;
  model: string;
  duration: number;
  tokenCount?: number;
}

export interface AiAnalysisRecord {
  id: string;
  caseId: string;
  analysisType: 'SUMMARY' | 'TIMELINE' | 'QUESTIONS' | 'EVIDENCE_GAPS' | 'FULL_ANALYSIS';
  response: string;
  modelName: string;
  tokenCount?: number;
  duration?: number;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}
