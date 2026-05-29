'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts';
import { api, Case } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, AlertTriangle, Activity, Loader2, Sparkles } from 'lucide-react';

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCase = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getCase(caseId);
      setCaseData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch case');
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
      fetchCase();
    }
  }, [authLoading, isAuthenticated, router, fetchCase]);

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

  if (error || !caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive mb-4">{error || 'Case not found'}</p>
            <Link href="/cases">
              <Button variant="outline">Back to Cases</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-blue-100 text-blue-800',
    UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
    CLOSED: 'bg-green-100 text-green-800',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/cases" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Cases</span>
          </Link>
          <div className="flex items-center gap-2">
            <Badge className={statusColors[caseData.status] || 'bg-gray-100'}>
              {caseData.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Header */}
            <Card>
              <CardHeader>
                <CardDescription className="font-mono text-lg">{caseData.caseNumber}</CardDescription>
                <CardTitle className="text-2xl mt-1">{caseData.title}</CardTitle>
              </CardHeader>
              {caseData.description && (
                <CardContent>
                  <p className="text-muted-foreground">{caseData.description}</p>
                </CardContent>
              )}
            </Card>

            {/* Navigation Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <Link href={`/cases/${caseId}/transactions`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <h3 className="font-semibold">Transactions</h3>
                        <p className="text-sm text-muted-foreground">View and analyze transactions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href={`/cases/${caseId}/red-flags`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-8 w-8 text-orange-500" />
                      <div>
                        <h3 className="font-semibold">Red Flags</h3>
                        <p className="text-sm text-muted-foreground">Identify suspicious patterns</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href={`/cases/${caseId}/fund-trail`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Activity className="h-8 w-8 text-blue-500" />
                      <div>
                        <h3 className="font-semibold">Fund Trail</h3>
                        <p className="text-sm text-muted-foreground">Track fund flow patterns</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href={`/cases/${caseId}/report`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Activity className="h-8 w-8 text-green-500" />
                      <div>
                        <h3 className="font-semibold">Report</h3>
                        <p className="text-sm text-muted-foreground">Generate audit reports</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href={`/cases/${caseId}/entities`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Activity className="h-8 w-8 text-purple-500" />
                      <div>
                        <h3 className="font-semibold">Entity Analysis</h3>
                        <p className="text-sm text-muted-foreground">Entity resolution and clustering</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href={`/cases/${caseId}/ai`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-8 w-8 text-cyan-500" />
                      <div>
                        <h3 className="font-semibold">AI Analysis</h3>
                        <p className="text-sm text-muted-foreground">AI-powered investigation insights</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(caseData.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground mt-2" />
                  <div>
                    <p className="text-sm font-medium">Last Updated</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(caseData.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/cases/${caseId}/imports`}>
                  <Button variant="outline" className="w-full justify-start">
                    Import Transactions
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}