'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts';
import { api, AiAnalysisResult, AiAnalysisRecord } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, Sparkles, Clock, AlertCircle, Brain, FileText, HelpCircle, Search } from 'lucide-react';

type AnalysisType = 'summary' | 'timeline' | 'questions' | 'evidence-gaps' | 'full-analysis';

const ANALYSIS_CONFIGS = {
  summary: {
    label: 'Summary',
    description: 'AI-generated case overview and key findings',
    icon: Sparkles,
    apiMethod: 'generateAiSummary',
  },
  timeline: {
    label: 'Timeline',
    description: 'Chronological analysis of transaction events',
    icon: Clock,
    apiMethod: 'generateAiTimeline',
  },
  questions: {
    label: 'Questions',
    description: 'Investigation questions to guide your review',
    icon: HelpCircle,
    apiMethod: 'generateAiQuestions',
  },
  'evidence-gaps': {
    label: 'Evidence Gaps',
    description: 'Missing information that needs to be addressed',
    icon: Search,
    apiMethod: 'generateAiEvidenceGaps',
  },
  'full-analysis': {
    label: 'Full Analysis',
    description: 'Comprehensive analysis with all findings',
    icon: Brain,
    apiMethod: 'generateAiFullAnalysis',
  },
} as const;

export default function AiAnalysisPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<AnalysisType>('summary');
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; models: string[] } | null>(null);
  const [selectedModel, setSelectedModel] = useState('phi4');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<AnalysisType, AiAnalysisResult | null>>({
    summary: null,
    timeline: null,
    questions: null,
    'evidence-gaps': null,
    'full-analysis': null,
  });
  const [history, setHistory] = useState<AiAnalysisRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Check Ollama status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await api.checkAiStatus();
        setOllamaStatus(status);
      } catch (err) {
        console.error('Failed to check AI status:', err);
        setOllamaStatus({ available: false, models: [] });
      }
    };
    if (isAuthenticated) {
      checkStatus();
    }
  }, [isAuthenticated]);

  // Load history
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const records = await api.getAiHistory(caseId);
        setHistory(records);
        
        // Populate results from history
        const results: Record<AnalysisType, AiAnalysisResult | null> = {
          summary: null,
          timeline: null,
          questions: null,
          'evidence-gaps': null,
          'full-analysis': null,
        };
        
        records.forEach((record) => {
          const typeMap: Record<string, AnalysisType> = {
            SUMMARY: 'summary',
            TIMELINE: 'timeline',
            QUESTIONS: 'questions',
            EVIDENCE_GAPS: 'evidence-gaps',
            FULL_ANALYSIS: 'full-analysis',
          };
          const type = typeMap[record.analysisType];
          if (type && !results[type]) {
            results[type] = {
              analysis: record.response,
              model: record.modelName,
              duration: record.duration || 0,
              tokenCount: record.tokenCount,
            };
          }
        });
        
        setAnalysisResults(results);
      } catch (err) {
        console.error('Failed to load AI history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    if (isAuthenticated && caseId) {
      loadHistory();
    }
  }, [isAuthenticated, caseId]);

  const generateAnalysis = useCallback(async (type: AnalysisType) => {
    if (!ollamaStatus?.available) {
      setError('Ollama is not available. Please ensure Ollama is running.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const config = ANALYSIS_CONFIGS[type];
      const apiMethod = config.apiMethod as keyof typeof api;
      const result = await (api[apiMethod] as (caseId: string, model?: string) => Promise<AiAnalysisResult>)(caseId, selectedModel);
      
      setAnalysisResults((prev) => ({
        ...prev,
        [type]: result,
      }));

      // Refresh history
      const records = await api.getAiHistory(caseId);
      setHistory(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate analysis');
    } finally {
      setIsGenerating(false);
    }
  }, [caseId, selectedModel, ollamaStatus]);

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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
          <div className="flex items-center gap-4">
            {ollamaStatus && (
              <div className={`flex items-center gap-2 text-sm ${ollamaStatus.available ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`h-2 w-2 rounded-full ${ollamaStatus.available ? 'bg-green-600' : 'bg-red-600'}`} />
                {ollamaStatus.available ? 'AI Ready' : 'AI Unavailable'}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Investigation Assistant
          </h1>
          <p className="text-muted-foreground mt-1">
            Use AI to analyze your case, generate insights, and identify investigation leads
          </p>
        </div>

        {/* Ollama Status Alert */}
        {ollamaStatus && !ollamaStatus.available && (
          <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-200">Ollama Not Available</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    AI analysis requires Ollama to be running. Please start Ollama and ensure models are downloaded.
                  </p>
                  <div className="mt-2 text-sm text-orange-700 dark:text-orange-300">
                    <code className="bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">ollama run phi4</code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Model Selection */}
        {ollamaStatus?.available && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Model:</span>
                <div className="flex gap-2">
                  {ollamaStatus.models.map((model) => (
                    <Button
                      key={model}
                      variant={selectedModel === model ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedModel(model)}
                    >
                      {model}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Alert */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">Error</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AnalysisType)}>
          <TabsList className="grid w-full grid-cols-5">
            {(Object.keys(ANALYSIS_CONFIGS) as AnalysisType[]).map((key) => {
              const config = ANALYSIS_CONFIGS[key];
              const Icon = config.icon;
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(ANALYSIS_CONFIGS) as AnalysisType[]).map((key) => {
            const config = ANALYSIS_CONFIGS[key];
            const Icon = config.icon;
            const result = analysisResults[key];

            return (
              <TabsContent key={key} value={key} className="mt-6">
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Analysis Panel */}
                  <div className="lg:col-span-2 space-y-4">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-primary" />
                            <CardTitle>{config.label}</CardTitle>
                          </div>
                          {result && (
                            <div className="text-sm text-muted-foreground">
                              {result.model} • {formatDuration(result.duration)} • {result.tokenCount || '?'} tokens
                            </div>
                          )}
                        </div>
                        <CardDescription>{config.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {result ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {result.analysis}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Icon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground mb-4">
                              No analysis generated yet
                            </p>
                            <Button
                              onClick={() => generateAnalysis(key)}
                              disabled={isGenerating || !ollamaStatus?.available}
                            >
                              {isGenerating ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Icon className="mr-2 h-4 w-4" />
                                  Generate {config.label}
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {result && (
                      <Button
                        variant="outline"
                        onClick={() => generateAnalysis(key)}
                        disabled={isGenerating}
                        className="w-full"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <Icon className="mr-2 h-4 w-4" />
                            Regenerate with {selectedModel}
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* History Sidebar */}
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Analysis History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isLoadingHistory ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : history.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No previous analyses
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {history.slice(0, 10).map((record) => (
                              <div
                                key={record.id}
                                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                                onClick={() => {
                                  const typeMap: Record<string, AnalysisType> = {
                                    SUMMARY: 'summary',
                                    TIMELINE: 'timeline',
                                    QUESTIONS: 'questions',
                                    EVIDENCE_GAPS: 'evidence-gaps',
                                    FULL_ANALYSIS: 'full-analysis',
                                  };
                                  const type = typeMap[record.analysisType];
                                  if (type) {
                                    setActiveTab(type);
                                    setAnalysisResults((prev) => ({
                                      ...prev,
                                      [type]: {
                                        analysis: record.response,
                                        model: record.modelName,
                                        duration: record.duration || 0,
                                        tokenCount: record.tokenCount,
                                      },
                                    }));
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium">
                                    {record.analysisType.replace('_', ' ')}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {record.modelName}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(record.createdAt).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                  by {record.createdBy.name}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Safety Notice */}
                    <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-blue-800 dark:text-blue-200">AI Assistant Notice</p>
                            <p className="text-blue-700 dark:text-blue-300 mt-1">
                              This AI assists investigation by providing analysis and suggestions. 
                              It never concludes fraud or criminal conduct. All findings require 
                              investigator verification.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </main>
    </div>
  );
}
