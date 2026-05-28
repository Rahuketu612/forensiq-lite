'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts';
import { api, RedFlag, RedFlagStats } from '@/lib/api';
import { InvestigationPanel } from '@/components/investigation-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, AlertTriangle, AlertCircle, AlertOctagon, CheckCircle } from 'lucide-react';

const severityConfig = {
  HIGH: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: AlertOctagon },
  CRITICAL: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', icon: AlertCircle },
  MEDIUM: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: AlertTriangle },
  LOW: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: AlertTriangle },
};

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function RedFlagDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;
  const flagId = params.flagId as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [flag, setFlag] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFlag = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.getRedFlagDetails(caseId, flagId);
      setFlag(data);
    } catch (err) {
      console.error('Failed to fetch flag:', err);
    } finally {
      setIsLoading(false);
    }
  }, [caseId, flagId]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchFlag();
    }
  }, [authLoading, isAuthenticated, router, fetchFlag]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.updateRedFlagStatus(caseId, flagId, newStatus);
      fetchFlag();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!flag) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Flag Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested red flag could not be found.
            </p>
            <Link href={`/cases/${caseId}/red-flags`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Red Flags
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const severity = severityConfig[flag.severity] || severityConfig.MEDIUM;
  const SeverityIcon = severity.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link href={`/cases/${caseId}/red-flags`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Red Flags</span>
          </Link>
          <div className="flex items-center gap-2">
            <Badge className={severity.color}>
              <SeverityIcon className="h-3 w-3 mr-1" />
              {flag.severity}
            </Badge>
            {flag.reviewed && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Reviewed
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Flag Details */}
          <div className="lg:col-span-1 space-y-6">
            {/* Flag Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{flag.title || flag.ruleName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Rule</p>
                  <p className="font-medium">{flag.ruleName}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <div className="flex gap-2 flex-wrap">
                    {['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'FALSE_POSITIVE'].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          flag.status === status
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:bg-muted'
                        }`}
                      >
                        {status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Explanation</p>
                  <p className="text-sm">{flag.explanation}</p>
                </div>

                {flag.feedbackNote && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Auditor Feedback</p>
                    <p className="text-sm bg-muted p-3 rounded-lg">{flag.feedbackNote}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transaction Card */}
            {flag.transaction && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Related Transaction</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Date</span>
                    <span className="text-sm font-medium">{formatDate(flag.transaction.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className={`text-sm font-medium ${
                      flag.transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {flag.transaction.type === 'CREDIT' ? '+' : '-'} {formatCurrency(flag.transaction.amount)}
                    </span>
                  </div>
                  {flag.transaction.counterparty && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Counterparty</span>
                      <span className="text-sm font-medium">{flag.transaction.counterparty}</span>
                    </div>
                  )}
                  {flag.transaction.mode && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Mode</span>
                      <span className="text-sm font-medium">{flag.transaction.mode}</span>
                    </div>
                  )}
                  {flag.transaction.description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{flag.transaction.description}</p>
                    </div>
                  )}
                  <Link href={`/cases/${caseId}/transactions`}>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      View in Transactions
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Investigation Panel */}
          <div className="lg:col-span-2">
            <InvestigationPanel caseId={caseId} flagId={flagId} />
          </div>
        </div>
      </main>
    </div>
  );
}