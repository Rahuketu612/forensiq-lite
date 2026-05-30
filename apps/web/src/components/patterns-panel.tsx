'use client';

import { useEffect, useState, useCallback } from 'react';
import { fundTrailApi, FundTrailPattern, PatternType, PatternSummary } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, AlertCircle, CheckCircle, Clock, XCircle, Eye, Info } from 'lucide-react';

interface PatternsPanelProps {
  caseId: string;
}

// Product-safe pattern type labels
const patternTypeLabels: Record<PatternType, string> = {
  CIRCULAR_FLOW: 'Circular Flow',
  LAYERING: 'Layering',
  ROUND_TRIPPING: 'Round-Tripping',
  REPEATED_CHAIN: 'Repeated Chain',
};

// Product-safe pattern descriptions
const patternDescriptions: Record<PatternType, string> = {
  CIRCULAR_FLOW: 'Funds appear to move in a circular path through multiple counterparties.',
  LAYERING: 'A single inflow is followed by multiple outflows of similar total value.',
  ROUND_TRIPPING: 'Funds sent out appear to return through related or same counterparties.',
  REPEATED_CHAIN: 'Similar transaction chains between the same counterparties appear multiple times.',
};

// Status icons
const statusIcons: Record<string, React.ReactNode> = {
  OPEN: <Clock className="h-4 w-4" />,
  UNDER_REVIEW: <Eye className="h-4 w-4" />,
  RESOLVED: <CheckCircle className="h-4 w-4" />,
  FALSE_POSITIVE: <XCircle className="h-4 w-4" />,
};

// Pattern type colors
const patternTypeColors: Record<PatternType, string> = {
  CIRCULAR_FLOW: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-purple-300',
  LAYERING: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300',
  ROUND_TRIPPING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300',
  REPEATED_CHAIN: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 border-teal-300',
};

function confidenceColor(score: number): string {
  if (score >= 0.8) return 'text-green-600';
  if (score >= 0.6) return 'text-yellow-600';
  return 'text-orange-600';
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '-';
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusLabel(status: string): string {
  return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function PatternsPanel({ caseId }: PatternsPanelProps) {
  const [patterns, setPatterns] = useState<PatternSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<PatternType | 'all'>('all');

  const fetchPatterns = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fundTrailApi.getPatterns(caseId);
      setPatterns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch patterns');
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      await fundTrailApi.analyzePatterns(caseId);
      await fetchPatterns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStatusUpdate = async (patternId: string, status: string) => {
    try {
      await fundTrailApi.updatePatternStatus(caseId, patternId, status);
      await fetchPatterns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const filteredPatterns = patterns?.patterns.filter((p) => {
    if (activeFilter === 'all') return true;
    return p.patternType === activeFilter;
  }) || [];

  const patternCountByType = patterns?.summary.byType || {};

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Fund Trail Pattern Analysis
            </CardTitle>
            <CardDescription>
              Deterministic pattern detection requiring auditor review
            </CardDescription>
          </div>
          <Button 
            onClick={handleAnalyze} 
            disabled={isAnalyzing} 
            variant="outline"
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Run Pattern Analysis
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Total Patterns</p>
            <p className="text-2xl font-bold">{patterns?.summary.total || 0}</p>
          </div>
          {(Object.keys(patternTypeLabels) as PatternType[]).map((type) => (
            <div key={type} className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">{patternTypeLabels[type]}</p>
              <p className="text-2xl font-bold">{patternCountByType[type] || 0}</p>
            </div>
          ))}
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            size="sm" 
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveFilter('all')}
          >
            All Patterns
          </Button>
          {(Object.keys(patternTypeLabels) as PatternType[]).map((type) => (
            <Button
              key={type}
              size="sm"
              variant={activeFilter === type ? 'default' : 'outline'}
              onClick={() => setActiveFilter(type)}
            >
              {patternTypeLabels[type]}
              {patternCountByType[type] && (
                <Badge variant="secondary" className="ml-2">
                  {patternCountByType[type]}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Pattern Type Legend */}
        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Pattern Types (Requires Auditor Review)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(patternDescriptions).map(([type, description]) => (
              <div key={type} className="flex items-start gap-3">
                <Badge 
                  variant="outline" 
                  className={`${patternTypeColors[type as PatternType]} flex-shrink-0`}
                >
                  {patternTypeLabels[type as PatternType]}
                </Badge>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pattern Cards */}
        {filteredPatterns.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No patterns detected yet.</p>
            <p className="text-sm">Run pattern analysis to detect fund-flow patterns.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPatterns.map((pattern) => (
              <PatternCard 
                key={pattern.id}
                pattern={pattern}
                onStatusUpdate={handleStatusUpdate}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PatternCard({ 
  pattern, 
  onStatusUpdate 
}: { 
  pattern: FundTrailPattern;
  onStatusUpdate: (patternId: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={expanded ? 'ring-2 ring-primary/50' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge 
                variant="outline" 
                className={patternTypeColors[pattern.patternType]}
              >
                {patternTypeLabels[pattern.patternType]}
              </Badge>
              <Badge 
                variant={pattern.reviewed ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                {statusIcons[pattern.status]}
                {statusLabel(pattern.status)}
              </Badge>
            </div>
            <CardTitle className="text-base">{pattern.title}</CardTitle>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${confidenceColor(pattern.confidenceScore)}`}>
              {(pattern.confidenceScore * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Confidence</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{pattern.explanation}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Amount</p>
            <p className="font-mono font-medium">{formatCurrency(pattern.totalAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Transactions</p>
            <p className="font-medium">{pattern.transactionIds.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Counterparties</p>
            <p className="font-medium">{pattern.counterparties.join(' → ')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Time Window</p>
            <p className="font-medium">
              {formatDate(pattern.timeWindowStart)} → {formatDate(pattern.timeWindowEnd)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Hide Details' : 'Show Details'}
          </Button>
          
          <div className="flex items-center gap-2">
            {!pattern.reviewed && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => onStatusUpdate(pattern.id, 'UNDER_REVIEW')}
              >
                Mark Under Review
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onStatusUpdate(pattern.id, 'RESOLVED')}
            >
              Mark Resolved
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onStatusUpdate(pattern.id, 'FALSE_POSITIVE')}
            >
              Mark False Positive
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h5 className="font-medium mb-2">Transactions Involved</h5>
            <div className="space-y-1 text-sm">
              {pattern.transactionIds.map((txId) => (
                <p key={txId} className="font-mono text-xs text-muted-foreground">
                  {txId.slice(0, 8)}...
                </p>
              ))}
            </div>
            
            <h5 className="font-medium mb-2 mt-4">Counterparties</h5>
            <div className="flex flex-wrap gap-2">
              {pattern.counterparties.map((cp) => (
                <Badge key={cp} variant="outline">{cp}</Badge>
              ))}
            </div>
            
            {pattern.createdAt && (
              <p className="text-xs text-muted-foreground mt-4">
                Detected on {formatDate(pattern.createdAt)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
