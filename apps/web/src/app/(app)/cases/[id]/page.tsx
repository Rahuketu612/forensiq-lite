'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts';
import { caseApi, Case, AssignableUser } from '@/lib/cases';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  User,
  Calendar,
  Mail,
  Phone,
  MapPin,
  FileText,
  AlertTriangle,
  Activity,
  Loader2,
  Edit,
  Trash2,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  CLOSED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const riskColors: Record<string, string> = {
  LOW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);

  const fetchCase = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await caseApi.getById(caseId);
      setCaseData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch case');
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  const fetchAssignableUsers = useCallback(async () => {
    try {
      const users = await caseApi.getAssignableUsers();
      setAssignableUsers(users);
    } catch (err) {
      console.error('Failed to fetch assignable users:', err);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      fetchCase();
      fetchAssignableUsers();
    }
  }, [authLoading, isAuthenticated, router, fetchCase, fetchAssignableUsers]);

  const handleStatusChange = async (newStatus: string) => {
    if (!caseData) return;

    setIsUpdating(true);
    try {
      const updated = await caseApi.updateStatus(caseData.id, newStatus);
      setCaseData(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssignChange = async (userId: string) => {
    if (!caseData || userId === 'none') return;

    setIsUpdating(true);
    try {
      const updated = await caseApi.assign(caseData.id, userId);
      setCaseData(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign case');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!caseData) return;

    if (!confirm('Are you sure you want to delete this case? This action cannot be undone.')) {
      return;
    }

    try {
      await caseApi.delete(caseData.id);
      router.push('/cases');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete case');
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
            <Badge className={statusColors[caseData.status]}>
              {caseData.status.replace('_', ' ')}
            </Badge>
            {caseData.riskLevel && (
              <Badge variant="secondary" className={riskColors[caseData.riskLevel]}>
                {caseData.riskLevel}
              </Badge>
            )}
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
                <div className="flex items-start justify-between">
                  <div>
                    <CardDescription className="font-mono text-lg">{caseData.caseNumber}</CardDescription>
                    <CardTitle className="text-2xl mt-1">{caseData.title}</CardTitle>
                  </div>
                  {caseData.status === 'DRAFT' && (
                    <Button variant="outline" size="sm" onClick={() => router.push(`/cases/${caseData.id}/edit`)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              {caseData.description && (
                <CardContent>
                  <p className="text-muted-foreground">{caseData.description}</p>
                </CardContent>
              )}
            </Card>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Transactions</span>
                  </div>
                  <div className="text-2xl font-bold">{caseData.transactionCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">Flags</span>
                  </div>
                  <div className="text-2xl font-bold">{caseData.flagCount}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">Risk Score</span>
                  </div>
                  <div className="text-2xl font-bold">{caseData.riskScore.toFixed(1)}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">Net Flow</span>
                  </div>
                  <div className={`text-2xl font-bold ${caseData.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{caseData.netFlow.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Client Information */}
            {(caseData.clientName || caseData.clientEmail || caseData.clientPhone || caseData.clientAddress) && (
              <Card>
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {caseData.clientName && (
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{caseData.clientName}</span>
                      </div>
                    )}
                    {caseData.clientEmail && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${caseData.clientEmail}`} className="text-primary hover:underline">
                          {caseData.clientEmail}
                        </a>
                      </div>
                    )}
                    {caseData.clientPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${caseData.clientPhone}`} className="text-primary hover:underline">
                          {caseData.clientPhone}
                        </a>
                      </div>
                    )}
                    {caseData.clientAddress && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{caseData.clientAddress}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Case Status</CardTitle>
                <CardDescription>Update the status of this case</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={caseData.status}
                  onValueChange={handleStatusChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>

                {caseData.status !== 'DRAFT' && caseData.status !== 'CLOSED' && (
                  <Button variant="destructive" className="w-full" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Case
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment</CardTitle>
                <CardDescription>Assign this case to a team member</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={caseData.assignedTo?.id || 'none'}
                  onValueChange={handleAssignChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {assignableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {caseData.assignedTo && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <p className="text-sm">
                      <span className="font-medium">{caseData.assignedTo.name}</span>
                      <br />
                      <span className="text-muted-foreground">{caseData.assignedTo.email}</span>
                    </p>
                    {caseData.assignedAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Assigned on {new Date(caseData.assignedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

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
                      {new Date(caseData.createdAt).toLocaleString()} by {caseData.createdBy.name}
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

                {caseData.completedAt && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(caseData.completedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}