'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts';
import { fundTrailApi, FundTrailResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  RefreshCw, 
  Trash2, 
  Link2, 
  ArrowRight, 
  Clock, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  FileText,
} from 'lucide-react';

interface FundTrailPanelProps {
  caseId: string;
}

const confidenceColors: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

const linkReasonLabels: Record<string, string> = {
  SAME_AMOUNT: 'Same Amount',
  NEARBY_TIMESTAMP: 'Nearby Timestamp',
  SAME_COUNTERPARTY: 'Same Counterparty',
  NARRATION_SIMILARITY: 'Narration Similarity',
  SAME_MODE: 'Same Mode',
  SAME_TYPE: 'Same Type',
  ROUND_AMOUNT: 'Round Amount',
  SUSPICIOUS_PATTERN: 'Suspicious Pattern',
};

function getConfidenceLevel(score: number): string {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

function formatTimeDiff(ms: number | null): string {
  if (!ms) return '-';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export default function FundTrailPanel({ caseId }: FundTrailPanelProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [fundTrail, setFundTrail] = useState<FundTrailResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedLinks, setExpandedLinks] = useState<Set<string>>(new Set());
  const [filterSearch, setFilterSearch] = useState('');

  const fetchFundTrail = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fundTrailApi.getFundTrail(caseId);
      setFundTrail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fund trail');
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchFundTrail();
  }, [fetchFundTrail]);

  const handleGenerate = async () => {
    if (!confirm('This will regenerate the fund trail and clear any existing links. Continue?')) {
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const data = await fundTrailApi.generateFundTrail(caseId);
      setFundTrail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate fund trail');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Delete this link? This action can be audited.')) {
      return;
    }
    try {
      await fundTrailApi.deleteLink(caseId, linkId);
      await fetchFundTrail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete link');
    }
  };

  const toggleExpand = (linkId: string) => {
    const newExpanded = new Set(expandedLinks);
    if (newExpanded.has(linkId)) {
      newExpanded.delete(linkId);
    } else {
      newExpanded.add(linkId);
    }
    setExpandedLinks(newExpanded);
  };

  const filteredLinks = fundTrail?.links.filter(link => {
    if (!filterSearch) return true;
    const search = filterSearch.toLowerCase();
    return (
      link.linkReason.toLowerCase().includes(search) ||
      link.explanation.toLowerCase().includes(search) ||
      link.sourceTransaction.counterparty?.toLowerCase().includes(search) ||
link.targetTransaction.counterparty?.toLowerCase().includes(search)
    );
  }) || [];

  if (authLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Fund Trail Analysis
              </CardTitle>
              <CardDescription>
                Transaction linkage based on deterministic rules (no AI)
              </CardDescription>
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating} variant="outline">
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {fundTrail?.linksCreated ? 'Regenerate' : 'Generate Trail'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Transactions Analyzed</p>
                <p className="text-2xl font-bold">{fundTrail?.transactionCount || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Link2 className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Links Found</p>
                <p className="text-2xl font-bold">{fundTrail?.linksCreated || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Info className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Highest Confidence</p>
                <p className="text-2xl font-bold">
                  {fundTrail?.links.length ? Math.round(Math.max(...fundTrail.links.map(l => l.confidenceScore)) * 100) + '%' : '-'}
                </p>
              </div>
            </div>
          </div>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Linking rules used:</strong> Same amount, Nearby timestamp (within 5 minutes), 
              Same counterparty, Narration similarity (75%+), Same mode/type, Round amounts.
            </AlertDescription>
          </Alert>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {fundTrail && fundTrail.links.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transaction Links</CardTitle>
              <Input
                placeholder="Filter links..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Confidence</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Source {"\u2192"} Target</TableHead>
                  <TableHead className="w-[150px]">Amount</TableHead>
                  <TableHead className="w-[100px]">Time</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLinks.map((link) => (
                  <OpenCloseRow 
                    key={link.id}
                    link={link}
                    expanded={expandedLinks.has(link.id)}
                    onToggle={() => toggleExpand(link.id)}
                    onDelete={() => handleDeleteLink(link.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {fundTrail?.transactionCount ? 'No links found.' : 'No transactions in this case.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OpenCloseRow({ link, expanded, onToggle, onDelete }: {
  link: FundTrailResult['links'][number];
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          <Badge className={confidenceColors[getConfidenceLevel(link.confidenceScore)]}>
            {Math.round(link.confidenceScore * 100)}%
          </Badge>
        </TableCell>
        <TableCell>
          <Badge variant="outline">
            {linkReasonLabels[link.linkReason] || link.linkReason}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono truncate max-w-[150px]">
              {link.sourceTransaction?.counterparty || link.sourceTransaction?.type || '-'}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-mono truncate max-w-[150px]">
              {link.targetTransaction?.counterparty || link.targetTransaction?.type || '-'}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm">
            <p className="font-mono">
              <span className="text-muted-foreground">{"\u20B9"}</span>
              {link.sourceTransaction?.amount?.toLocaleString()} {"\u2192"} <span className="text-muted-foreground">{"\u20B9"}</span>
              {link.targetTransaction?.amount?.toLocaleString()}
            </p>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatTimeDiff(link.timeDifferenceMs)}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={6}>
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" /> Link Explanation
              </h4>
              <p className="text-sm text-muted-foreground mb-4">{link.explanation}</p>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
