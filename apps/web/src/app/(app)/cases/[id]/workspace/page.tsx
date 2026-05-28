'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts';
import { api, CaseDashboard, ActivityEntry } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FileUploadComponent } from '@/components/file-upload';
import { RecentImports } from '@/components/recent-imports';
import {
  ArrowLeft, FileText, AlertTriangle, Upload, Play, StickyNote, Paperclip,
  Eye, Clock, CheckCircle, MessageSquare, Loader2, Download
} from 'lucide-react';

const eventTypeLabels: Record<string, string> = {
  FLAG_CREATED: 'Flag Created',
  FLAG_REVIEWED: 'Flag Reviewed',
  FLAG_STATUS_CHANGED: 'Status Changed',
  FLAG_FEEDBACK_ADDED: 'Feedback Added',
  NOTE_ADDED: 'Note Added',
  EVIDENCE_UPLOADED: 'Evidence Uploaded',
  EVIDENCE_LINKED: 'Evidence Linked',
  EVIDENCE_DELETED: 'Evidence Deleted',
  TRANSACTION_IMPORTED: 'Transactions Imported',
  TRANSACTION_EXAMINED: 'Transaction Examined',
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CaseWorkspacePage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [dashboard, setDashboard] = useState<CaseDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningFlags, setIsRunningFlags] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getDashboard(caseId);
      setDashboard(data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchDashboard();
    }
  }, [authLoading, isAuthenticated, router, fetchDashboard]);

  const handleRunRedFlags = async () => {
    try {
      setIsRunningFlags(true);
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/cases/${caseId}/run-red-flags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`,
        },
      });
      fetchDashboard();
    } catch (err) {
      console.error('Failed to run red flags:', err);
    } finally {
      setIsRunningFlags(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Case not found</p>
            <Link href="/cases" className="mt-4 inline-block">
              <Button variant="outline">Back to Cases</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/cases" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Cases</span>
          </Link>
          <Badge variant="outline">{dashboard.caseData?.status || 'ACTIVE'}</Badge>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{dashboard.caseData?.title}</h1>
            <p className="text-sm text-muted-foreground">
              Investigation Workspace
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/cases/${caseId}/transactions`}>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                Transactions
              </Button>
            </Link>
            <Link href={`/cases/${caseId}/report`}>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Report
              </Button>
            </Link>
            <Link href={`/cases/${caseId}/red-flags`}>
              <Button variant="outline" size="sm">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Flags ({dashboard.statistics?.totalRedFlags || 0})
              </Button>
            </Link>
            <Button onClick={handleRunRedFlags} disabled={isRunningFlags} size="sm">
              {isRunningFlags ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Run Red Flags
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                  <p className="text-2xl font-bold">{dashboard.statistics?.totalTransactions || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Red Flags</p>
                  <p className="text-2xl font-bold">{dashboard.statistics?.totalRedFlags || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Paperclip className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Evidence Files</p>
                  <p className="text-2xl font-bold">{dashboard.statistics?.evidenceFilesCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-2xl font-bold">{dashboard.statistics?.investigationNotesCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Investigation Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Red Flags Reviewed</span>
                <span className="text-sm font-medium">
                  {dashboard.statistics?.reviewedFlags || 0} / {dashboard.statistics?.totalRedFlags || 0}
                </span>
              </div>
              <Progress value={dashboard.progress?.redFlagsReviewedPercent || 0} className="h-2" />
            </div>
            <div className="grid gap-4 md:grid-cols-3 text-center">
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{dashboard.statistics?.highSeverityFlags || 0}</p>
                <p className="text-sm text-muted-foreground">High/Critical</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{dashboard.statistics?.unreviewedFlags || 0}</p>
                <p className="text-sm text-muted-foreground">Unreviewed</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{dashboard.statistics?.reviewedFlags || 0}</p>
                <p className="text-sm text-muted-foreground">Reviewed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Latest investigation actions</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard.recentActivity && dashboard.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.recentActivity.map((entry: ActivityEntry) => (
                      <div key={entry.id} className="flex gap-3">
                        <div className="mt-1">
                          <div className="h-2 w-2 rounded-full bg-primary"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {eventTypeLabels[entry.eventType] || entry.eventType}
                            </span>
                            {entry.entityType === 'redFlag' && <Badge variant="outline" className="text-xs">Flag</Badge>}
                            {entry.entityType === 'evidence' && <Badge variant="outline" className="text-xs">Evidence</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {entry.description || entry.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {entry.user?.name || 'System'} • {formatDate(entry.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/cases/${caseId}/red-flags`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    View Red Flags
                    {dashboard.statistics?.unreviewedFlags && dashboard.statistics.unreviewedFlags > 0 && (
                      <Badge variant="destructive" className="ml-auto">{dashboard.statistics.unreviewedFlags}</Badge>
                    )}
                  </Button>
                </Link>
                <Link href={`/cases/${caseId}/transactions`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    View Transactions
                  </Button>
                </Link>
                <Link href={`/cases/${caseId}/report`} className="block">
                  <Button variant="outline" className="w-full justify-start text-green-700 border-green-200 hover:bg-green-50">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                    <Badge variant="outline" className="ml-auto text-green-600 border-green-300">PDF</Badge>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Upload Files</CardTitle>
              </CardHeader>
              <CardContent>
                <FileUploadComponent 
                  caseId={caseId} 
                  onUploadComplete={() => setRefreshKey(k => k + 1)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Imports</span>
                  <span className="font-medium">{dashboard.statistics?.totalImports || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Evidence Files</span>
                  <span className="font-medium">{dashboard.statistics?.evidenceFilesCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="font-medium">{dashboard.statistics?.investigationNotesCount || 0}</span>
                </div>
              </CardContent>
            </Card>

            <RecentImports key={refreshKey} caseId={caseId} limit={3} />
          </div>
        </div>
      </main>
    </div>
  );
}