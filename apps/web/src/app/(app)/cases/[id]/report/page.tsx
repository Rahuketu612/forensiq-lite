'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Download, FileText, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InvestigationReport {
  reportMeta: {
    generatedAt: string;
    generatedBy: string;
    caseId: string;
    reportVersion: string;
  };
  caseSummary: {
    id: string;
    title: string;
    description?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  transactionStats: {
    totalTransactions: number;
    totalCredits: number;
    totalDebits: number;
    netAmount: number;
    dateRange?: { start: string; end: string };
  };
  redFlags: {
    total: number;
    bySeverity: { critical: number; high: number; medium: number; low: number };
    byCategory: Record<string, number>;
    reviewed: { reviewed: number; unreviewed: number };
  };
  highPriorityFlags: Array<{
    id: string;
    flagType: string;
    severity: string;
    description: string;
    date: string;
  }>;
  notes: Array<{ id: string; content: string; author: string; createdAt: string }>;
  evidence: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    sha256Hash: string;
    uploadedAt: string;
  }>;
  evidenceIntegrity: { totalFiles: number; hashAlgorithm: string; integrityVerified: boolean };
  disclaimer: string;
}

export default function ReportPage() {
  const params = useParams();
  const caseId = params.id as string;
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'export'>('preview');

  useEffect(() => {
    loadReport();
  }, [caseId]);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load HTML preview
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/cases/${caseId}/report/preview`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load report');
      }

      const html = await response.text();
      setHtmlContent(html);

      // Also load JSON for structured data display
      const jsonResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/cases/${caseId}/report/export-json`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        }
      );

      if (jsonResponse.ok) {
        const jsonData = await jsonResponse.json();
        setReport(jsonData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const exportJson = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/cases/${caseId}/report/export-json`,
      {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      }
    );

    if (response.ok) {
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `investigation-report-${caseId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const exportPdf = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/cases/${caseId}/report/export-pdf`,
      {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      }
    );

    if (response.ok) {
      const contentType = response.headers.get('Content-Type');
      
      if (contentType?.includes('pdf')) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `investigation-report-${caseId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback to JSON
        exportJson();
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSeverityClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-medium mb-2">Failed to Load Report</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadReport}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/cases/${caseId}/workspace`}>
              <Button variant="ghost" size="icon">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Investigation Report</h1>
              <p className="text-sm text-muted-foreground">{report?.caseSummary?.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportJson}>
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button onClick={exportPdf}>
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Report Metadata */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Generated</p>
                <p className="font-medium">{report ? formatDate(report.reportMeta.generatedAt) : '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Generated By</p>
                <p className="font-medium">{report?.reportMeta?.generatedBy || 'Auditor'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Report Version</p>
                <p className="font-medium">{report?.reportMeta?.reportVersion || '1.0.0'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Evidence Integrity</p>
                <div className="flex items-center gap-1">
                  {report?.evidenceIntegrity?.integrityVerified ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  )}
                  <span className="font-medium">
                    {report?.evidenceIntegrity?.totalFiles || 0} files verified
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={activeTab === 'preview' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </Button>
          <Button
            variant={activeTab === 'export' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('export')}
          >
            Export Options
          </Button>
        </div>

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            {/* Case Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Case Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-3">
                    <div>
                      <p className="text-muted-foreground">Case ID</p>
                      <p className="font-mono text-xs">{report?.caseSummary?.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge variant="outline">{report?.caseSummary?.status}</Badge>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-muted-foreground">Description</p>
                      <p>{report?.caseSummary?.description || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p>{report ? formatDate(report.caseSummary.createdAt) : '-'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{report?.transactionStats?.totalTransactions?.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Transactions</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-700">{formatCurrency(report?.transactionStats?.totalCredits || 0)}</p>
                    <p className="text-sm text-muted-foreground">Total Credits</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-700">{formatCurrency(report?.transactionStats?.totalDebits || 0)}</p>
                    <p className="text-sm text-muted-foreground">Total Debits</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{formatCurrency(report?.transactionStats?.netAmount || 0)}</p>
                    <p className="text-sm text-muted-foreground">Net Amount</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Red Flags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Red Flags
                  <Badge variant="destructive">{report?.redFlags?.total || 0} flags requiring auditor review</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-xl font-bold text-red-700">{report?.redFlags?.bySeverity?.critical || 0}</p>
                    <p className="text-xs text-muted-foreground">Critical</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-xl font-bold text-orange-700">{report?.redFlags?.bySeverity?.high || 0}</p>
                    <p className="text-xs text-muted-foreground">High</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-xl font-bold text-yellow-700">{report?.redFlags?.bySeverity?.medium || 0}</p>
                    <p className="text-xs text-muted-foreground">Medium</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xl font-bold text-green-700">{report?.redFlags?.bySeverity?.low || 0}</p>
                    <p className="text-xs text-muted-foreground">Low</p>
                  </div>
                </div>

                <div className="flex gap-4 mb-4">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm">{report?.redFlags?.reviewed?.reviewed || 0} Reviewed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm">{report?.redFlags?.reviewed?.unreviewed || 0} Unreviewed</span>
                  </div>
                </div>

                {/* High Priority Flags */}
                {report?.highPriorityFlags && report.highPriorityFlags.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">High Priority Flags</h4>
                    <div className="space-y-2">
                      {report.highPriorityFlags.slice(0, 10).map((flag) => (
                        <div key={flag.id} className={`p-3 rounded-lg border-l-4 ${getSeverityClass(flag.severity).split(' ')[0]} border-0`} style={{ borderLeftColor: flag.severity === 'CRITICAL' ? '#c53030' : '#c05621' }}>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getSeverityClass(flag.severity)}>{flag.severity}</Badge>
                            <span className="text-sm font-medium">{flag.flagType}</span>
                          </div>
                          <p className="text-sm">{flag.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(flag.date)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Evidence */}
            <Card>
              <CardHeader>
                <CardTitle>Evidence Files</CardTitle>
                <CardDescription>
                  Evidence integrity verified with SHA-256 hash algorithm
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report?.evidence && report.evidence.length > 0 ? (
                  <div className="space-y-3">
                    {report.evidence.map((file) => (
                      <div key={file.id} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{file.fileName}</span>
                          </div>
                          <Badge variant="outline">{file.mimeType}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-muted-foreground">SHA-256 Hash</p>
                            <p className="font-mono text-xs break-all">{file.sha256Hash}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Uploaded</p>
                            <p>{formatDate(file.uploadedAt)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No evidence files attached</p>
                )}
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Important Disclaimer</p>
                    <p className="text-sm text-amber-700 mt-1">
                      {report?.disclaimer || 'This report is an investigation aid and does not independently conclude fraud. All findings require auditor review and professional judgment.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>HTML Report</CardTitle>
                <CardDescription>Preview and print directly from browser</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={() => window.open(`/api/v1/cases/${caseId}/report/preview`, '_blank')}>
                  Open Preview
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>JSON Export</CardTitle>
                <CardDescription>Structured data for external processing</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={exportJson}>
                  <Download className="h-4 w-4 mr-2" />
                  Download JSON
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>PDF Export</CardTitle>
                <CardDescription>Print-ready document with full styling</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={exportPdf}>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate PDF
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
