'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts';
import { api, RedFlag, RedFlagStats, RedFlagFilters } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, AlertCircle, AlertOctagon, ArrowLeft, RefreshCw, Filter, ChevronLeft, ChevronRight, CheckCircle, Clock, Search, X } from 'lucide-react';

const severityConfig = {
  HIGH: { color: 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200', icon: AlertOctagon },
  CRITICAL: { color: 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-200', icon: AlertCircle },
  MEDIUM: { color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200', icon: AlertTriangle },
  LOW: { color: 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200', icon: AlertTriangle },
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

export default function RedFlagsPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [flags, setFlags] = useState<RedFlag[]>([]);
  const [stats, setStats] = useState<RedFlagStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [caseTitle, setCaseTitle] = useState<string>('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<RedFlagFilters>({
    severity: '',
    reviewed: undefined,
    ruleName: '',
  });

  const fetchFlags = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.getRedFlags(caseId, {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      });
      setFlags(response.flags);
      setPagination((prev) => ({
        ...prev,
        total: response.total,
        totalPages: response.totalPages,
      }));
    } catch (err) {
      console.error('Failed to fetch red flags:', err);
    } finally {
      setIsLoading(false);
    }
  }, [caseId, pagination.page, pagination.limit, filters]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getRedFlagStats(caseId);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [caseId]);

  const fetchCase = useCallback(async () => {
    try {
      const data = await api.getCase(caseId);
      setCaseTitle(data.title);
    } catch (err) {
      console.error('Failed to fetch case:', err);
    }
  }, [caseId]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchCase();
      fetchFlags();
      fetchStats();
    }
  }, [authLoading, isAuthenticated, router, fetchCase, fetchFlags, fetchStats]);

  const handleRunRedFlags = async () => {
    try {
      setIsRunning(true);
      await api.runRedFlags(caseId);
      // Refresh flags and stats
      await Promise.all([fetchFlags(), fetchStats()]);
    } catch (err) {
      console.error('Failed to run red flags:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleMarkReviewed = async (flagId: string) => {
    try {
      await api.markRedFlagReviewed(caseId, flagId);
      // Refresh flags
      fetchFlags();
      fetchStats();
    } catch (err) {
      console.error('Failed to mark as reviewed:', err);
    }
  };

  const handleFilterChange = (key: keyof RedFlagFilters, value: string | boolean | undefined) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <Link href={`/cases/${caseId}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Case</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRunRedFlags}
              disabled={isRunning}
            >
              {isRunning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Run Red Flags
            </Button>
            <Link href={`/cases/${caseId}/transactions`}>
              <Button variant="secondary">
                View Transactions
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Red Flags</h1>
          <p className="text-muted-foreground mt-1">
            {caseTitle} • {pagination.total} flags identified • Requires auditor review
          </p>
        </div>

        {/* Summary Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-6 mb-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Total Flags</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-purple-600">{stats.critical}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">High</p>
                <p className="text-2xl font-bold text-red-600">{stats.high}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Medium</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.medium}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Low</p>
                <p className="text-2xl font-bold text-blue-600">{stats.low}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Reviewed</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.reviewed}/{stats.total}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Severity Filter */}
              <Select
                value={filters.severity || 'all'}
                onValueChange={(value) => handleFilterChange('severity', value === 'all' ? undefined : value)}
              >
                <SelectTrigger className="w-full lg:w-[150px]">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Rule Name Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by rule name..."
                  value={filters.ruleName || ''}
                  onChange={(e) => handleFilterChange('ruleName', e.target.value || undefined)}
                  className="pl-10"
                />
              </div>

              {/* Reviewed Toggle */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="unreviewed"
                  checked={filters.reviewed === false}
                  onCheckedChange={(checked) => handleFilterChange('reviewed', checked ? false : undefined)}
                />
                <label htmlFor="unreviewed" className="text-sm cursor-pointer">
                  Unreviewed only
                </label>
              </div>

              <Button variant="secondary" onClick={() => fetchFlags()}>
                <Filter className="h-4 w-4 mr-2" />
                Apply
              </Button>

              {(filters.severity || filters.reviewed !== undefined || filters.ruleName) && (
                <Button variant="ghost" onClick={() => setFilters({ severity: '', reviewed: undefined, ruleName: '' })}>
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Red Flags List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-0">
              <div className="animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-24 border-b border-border" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : flags.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">No red flags found</p>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Click "Run Red Flags" to analyze transactions and identify potential concerns.
                All flags require auditor review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {flags.map((flag) => {
              const config = severityConfig[flag.severity] || severityConfig.MEDIUM;
              const SeverityIcon = config.icon;
              
              return (
                <Card key={flag.id} className={flag.reviewed ? 'opacity-60' : ''}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-full ${flag.reviewed ? 'bg-green-100 dark:bg-green-900' : 'bg-yellow-100 dark:bg-yellow-900'}`}>
                        {flag.reviewed ? (
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        ) : (
                          <SeverityIcon className={`h-6 w-6 ${flag.severity === 'HIGH' || flag.severity === 'CRITICAL' ? 'text-red-600' : 'text-yellow-600'}`} />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={config.color}>
                            {flag.severity}
                          </Badge>
                          <Badge variant="outline">{flag.ruleName}</Badge>
                          {flag.reviewed && (
                            <Badge variant="outline" className="bg-green-50">Reviewed</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm mb-3">{flag.explanation}</p>
                        
                        {flag.transaction && (
                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <span>Date: {formatDate(flag.transaction.date)}</span>
                            <span>Amount: <span className={flag.transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(flag.transaction.amount)}
                            </span></span>
                            {flag.transaction.counterparty && (
                              <span>To/From: {flag.transaction.counterparty}</span>
                            )}
                          </div>
                        )}
                        
                        {flag.feedbackNote && (
                          <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
                            <p className="font-medium mb-1">Auditor Feedback:</p>
                            <p>{flag.feedbackNote}</p>
                          </div>
                        )}
                      </div>
                      
                      {!flag.reviewed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkReviewed(flag.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Reviewed
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} flags
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}