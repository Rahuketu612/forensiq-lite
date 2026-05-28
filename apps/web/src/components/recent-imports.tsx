'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Clock, AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ImportStatus } from '@/types/import';

interface RecentImport {
  id: string;
  fileName: string;
  originalName: string;
  status: ImportStatus;
  importedAt: string;
  totalRows?: number;
  successRows?: number;
  failedRows?: number;
  isScanned?: boolean;
  hasText?: boolean;
}

interface RecentImportsProps {
  caseId: string;
  limit?: number;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'; icon: typeof Clock }> = {
  PENDING: { label: 'Pending', variant: 'outline', icon: Clock },
  PROCESSING: { label: 'Processing', variant: 'secondary', icon: Loader2 },
  COMPLETED: { label: 'Completed', variant: 'success', icon: CheckCircle },
  FAILED: { label: 'Failed', variant: 'destructive', icon: AlertTriangle },
  NEEDS_MANUAL_MAPPING: { label: 'Needs Mapping', variant: 'warning', icon: AlertTriangle },
  MAPPING_CONFIRMED: { label: 'Mapping Confirmed', variant: 'info', icon: CheckCircle },
  EXTRACTED_TEXT: { label: 'Text Extracted', variant: 'info', icon: FileText },
  OCR_PENDING: { label: 'OCR Pending', variant: 'warning', icon: Clock },
  OCR_PROCESSING: { label: 'OCR Processing', variant: 'secondary', icon: Loader2 },
  OCR_COMPLETED: { label: 'OCR Completed', variant: 'success', icon: CheckCircle },
  OCR_FAILED: { label: 'OCR Failed', variant: 'destructive', icon: AlertTriangle },
};

function formatDate(date: string): string {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RecentImports({ caseId, limit = 5 }: RecentImportsProps) {
  const [imports, setImports] = useState<RecentImport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchImports = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/cases/${caseId}/imports`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch imports');
      }

      const data = await response.json();
      setImports((data.imports || data || []).slice(0, limit));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load imports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImports();
  }, [caseId, limit]);

  const needsMapping = (status: ImportStatus): boolean => {
    return status === 'NEEDS_MANUAL_MAPPING' || 
           status === 'EXTRACTED_TEXT' || 
           status === 'MAPPING_CONFIRMED';
  };

  const isCompleted = (status: ImportStatus): boolean => {
    return status === 'COMPLETED';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recent Imports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchImports}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (imports.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recent Imports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No imports yet</p>
            <p className="text-xs mt-1">Upload a bank statement to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Imports</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchImports}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>Latest transaction imports for this case</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {imports.map((importItem) => {
            const config = statusConfig[importItem.status] || statusConfig.PENDING;
            const StatusIcon = config.icon;

            return (
              <div 
                key={importItem.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 bg-muted rounded-lg">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {importItem.originalName || importItem.fileName}
                    </p>
                    <Badge variant={config.variant} className="text-xs">
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(importItem.importedAt)}
                    {importItem.totalRows !== undefined && (
                      <>
                        <span>•</span>
                        <span>{importItem.totalRows} rows</span>
                      </>
                    )}
                    {importItem.isScanned && (
                      <>
                        <span>•</span>
                        <span className="text-amber-600">Scanned PDF</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {needsMapping(importItem.status) && (
                    <Link href={`/cases/${caseId}/imports/${importItem.id}`}>
                      <Button size="sm" variant="default">
                        Continue Mapping
                      </Button>
                    </Link>
                  )}
                  {isCompleted(importItem.status) && (
                    <Link href={`/cases/${caseId}/transactions`}>
                      <Button size="sm" variant="outline">
                        View Transactions
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {imports.length >= limit && (
          <div className="mt-4 text-center">
            <Link href={`/cases/${caseId}/transactions`}>
              <Button variant="link" size="sm">
                View all imports
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecentImports;
