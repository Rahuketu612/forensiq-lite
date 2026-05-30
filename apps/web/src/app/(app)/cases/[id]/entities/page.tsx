'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Users,
  RefreshCw,
  Search,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  ExternalLink,
} from 'lucide-react';
import { api, Entity, EntityAlias } from '@/lib/api';

const matchTypeLabels: Record<string, string> = {
  EXACT_NAME: 'Exact Match',
  NORMALIZED_NAME: 'Normalized',
  GSTIN: 'GSTIN',
  PAN: 'PAN',
  BANK_ACCOUNT: 'Bank Account',
  IFSC: 'IFSC Code',
  UPI_ID: 'UPI ID',
  PHONE: 'Phone',
};

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getConfidenceColor(score: number): string {
  if (score >= 0.95) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (score >= 0.8) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  if (score >= 0.5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
}

function getRiskBadge(riskScore: number) {
  if (riskScore >= 50) return { variant: 'destructive' as const, text: 'High Risk' };
  if (riskScore >= 25) return { variant: 'secondary' as const, text: 'Medium Risk' };
  return { variant: 'outline' as const, text: 'Low Risk' };
}

export default function EntitiesPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({ total: 0, reviewed: 0, highRisk: 0 });

  const fetchEntities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getEntities(caseId);
      setEntities(data.entities || []);
      setStats({
        total: data.entities?.length || 0,
        reviewed: data.entities?.filter((e) => e.reviewed).length || 0,
        highRisk: data.entities?.filter((e) => e.riskScore >= 50).length || 0,
      });
    } catch (error) {
      console.error('Failed to fetch entities:', error);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const analyzeEntities = async () => {
    try {
      setAnalyzing(true);
      await api.analyzeEntities(caseId);
      await fetchEntities();
    } catch (error) {
      console.error('Failed to analyze entities:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const reviewEntity = async (entityId: string) => {
    try {
      await api.reviewEntity(caseId, entityId);
      await fetchEntities();
      if (selectedEntity?.id === entityId) {
        const updated = await api.getEntity(caseId, entityId);
        setSelectedEntity(updated);
      }
    } catch (error) {
      console.error('Failed to review entity:', error);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  const filteredEntities = entities.filter((entity) => {
    const matchesSearch =
      !searchTerm ||
      entity.canonicalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.aliases.some((a) =>
        a.aliasName.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'reviewed' && entity.reviewed) ||
      (statusFilter === 'unreviewed' && !entity.reviewed);

    return matchesSearch && matchesStatus;
  });

  const paginatedEntities = filteredEntities.slice((page - 1) * 10, page * 10);
  const totalPages = Math.ceil(filteredEntities.length / 10);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              Entity Analysis
            </h1>
            <p className="text-sm text-muted-foreground">
              Entity resolution and clustering
            </p>
          </div>
        </div>
        <Button onClick={analyzeEntities} disabled={analyzing}>
          {analyzing ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {analyzing ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Entities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.reviewed}</div>
            <p className="text-sm text-muted-foreground">Reviewed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.total - stats.reviewed}
            </div>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.highRisk}</div>
            <p className="text-sm text-muted-foreground">High Risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Entity List / Detail View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity List */}
        <div className={selectedEntity ? 'lg:col-span-1' : 'lg:col-span-3'}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Entities</CardTitle>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search entities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-[200px]"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="unreviewed">Unreviewed</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading entities...
                </div>
              ) : filteredEntities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No entities found. Run analysis to identify entities.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Aliases</TableHead>
                        <TableHead>Transactions</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEntities.map((entity) => (
                        <TableRow
                          key={entity.id}
                          className={`cursor-pointer hover:bg-muted/50 ${
                            selectedEntity?.id === entity.id ? 'bg-muted' : ''
                          }`}
                          onClick={() => setSelectedEntity(entity)}
                        >
                          <TableCell>
                            <div className="font-medium">{entity.canonicalName}</div>
                            <div className="text-xs text-muted-foreground">
                              {matchTypeLabels[entity.aliases[0]?.matchType] || 'Unknown'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                              {entity.aliases.slice(0, 2).map((alias, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {alias.aliasName.substring(0, 15)}
                                </Badge>
                              ))}
                              {entity.aliases.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{entity.aliases.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{entity.transactionCount}</TableCell>
                          <TableCell>
                            <Badge {...getRiskBadge(entity.riskScore)}>
                              {entity.riskScore}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {entity.reviewed ? (
                              <Badge variant="default" className="bg-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Reviewed
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Entity Detail */}
        {selectedEntity && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedEntity.canonicalName}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedEntity.explanation || 'Entity identified through resolution algorithm'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedEntity(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold">{selectedEntity.transactionCount}</div>
                  <p className="text-xs text-muted-foreground">Transactions</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold">
                    {formatCurrency(selectedEntity.totalAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Amount</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold">{selectedEntity.riskScore}</div>
                  <p className="text-xs text-muted-foreground">Risk Score</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-lg font-bold flex items-center gap-2">
                    <Badge className={getConfidenceColor(selectedEntity.aliases[0]?.confidenceScore || 0)}>
                      {((selectedEntity.aliases[0]?.confidenceScore || 0) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Confidence</p>
                </div>
              </div>

              {/* Aliases */}
              <div>
                <h3 className="font-semibold mb-2">Aliases & Identifiers</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedEntity.aliases.map((alias) => (
                    <div
                      key={alias.id}
                      className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-sm"
                    >
                      <span>{alias.aliasName}</span>
                      <Badge variant="outline" className="text-xs">
                        {matchTypeLabels[alias.matchType] || alias.matchType}
                      </Badge>
                      {alias.confidenceScore && (
                        <span className="text-xs text-muted-foreground">
                          ({(alias.confidenceScore * 100).toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Linked Transactions */}
              {selectedEntity.transactions && selectedEntity.transactions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Linked Transactions</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEntity.transactions.slice(0, 5).map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{formatDate(tx.date)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {tx.description || '-'}
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{tx.type}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Audit Trail */}
              {selectedEntity.auditLogs && selectedEntity.auditLogs.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Audit Trail</h3>
                  <div className="space-y-2">
                    {selectedEntity.auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-2 text-sm p-2 bg-muted/50 rounded"
                      >
                        <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p>{log.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(log.createdAt)}
                            {log.confidenceScore && ` • ${(log.confidenceScore * 100).toFixed(0)}% confidence`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedEntity.transactions && selectedEntity.transactions.length > 0 && (
                  <Link href={`/cases/${caseId}/transactions?entityId=${selectedEntity.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View All Transactions
                    </Button>
                  </Link>
                )}
                {!selectedEntity.reviewed && (
                  <Button size="sm" onClick={() => reviewEntity(selectedEntity.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Reviewed
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
