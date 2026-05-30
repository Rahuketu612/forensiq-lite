'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Brain, 
  FileText, 
  AlertTriangle, 
  MessageSquare, 
  Search, 
  FileCheck, 
  Loader2,
  Copy,
  CheckCheck,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

type IntelligenceFeature = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
};

const features: IntelligenceFeature[] = [
  {
    id: 'case-brief',
    title: 'Case Brief Generator',
    description: 'Generate comprehensive case summaries with key findings and risk assessments',
    icon: <FileText className="h-5 w-5" />,
    endpoint: 'case-brief',
  },
  {
    id: 'red-flag-explainer',
    title: 'Red Flag Explainer',
    description: 'Get detailed explanations of why specific red flags were flagged',
    icon: <AlertTriangle className="h-5 w-5" />,
    endpoint: 'red-flag-explainer',
  },
  {
    id: 'interview-questions',
    title: 'Interview Question Generator',
    description: 'Generate targeted interview questions based on case data',
    icon: <MessageSquare className="h-5 w-5" />,
    endpoint: 'interview-questions',
  },
  {
    id: 'evidence-request',
    title: 'Evidence Request Builder',
    description: 'Draft formal evidence requests and document requirements',
    icon: <FileCheck className="h-5 w-5" />,
    endpoint: 'evidence-request',
  },
  {
    id: 'similar-patterns',
    title: 'Similar Pattern Search',
    description: 'Identify similar patterns across transactions and entities',
    icon: <Search className="h-5 w-5" />,
    endpoint: 'similar-patterns',
  },
];

interface IntelligenceResponse {
  analysisId: string;
  content: string;
  model: string;
  tokenCount: number;
  duration: number;
  createdAt: string;
}

interface HistoryItem {
  id: string;
  analysisType: string;
  response: string;
  modelName: string;
  createdAt: string;
}

export default function IntelligencePage() {
  const params = useParams();
  const caseId = params.id as string;
  
  const [activeTab, setActiveTab] = useState('case-brief');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<IntelligenceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedModel, setSelectedModel] = useState('phi4');
  const [redFlagId, setRedFlagId] = useState('');

  useEffect(() => {
    loadHistory();
  }, [caseId]);

  const loadHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/cases/${caseId}/intelligence/history`,
        { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
      );
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const generateAnalysis = async (featureId: string) => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const token = localStorage.getItem('token');
      let endpoint = `/api/v1/cases/${caseId}/intelligence/${featureId}`;
      
      // Special handling for red-flag-explainer
      const body: Record<string, unknown> = { model: selectedModel };
      if (featureId === 'red-flag-explainer' && redFlagId) {
        (body as { redFlagId: string }).redFlagId = redFlagId;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Analysis failed');
      }

      const data = await res.json();
      setResponse(data);
      loadHistory(); // Refresh history
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate analysis');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (response?.content) {
      navigator.clipboard.writeText(response.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentFeature = features.find(f => f.id === activeTab);

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
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Investigation Intelligence</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="border rounded-md px-3 py-1.5 text-sm"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="phi4">phi4</option>
              <option value="llama3:8b">llama3:8b</option>
              <option value="qwen3:14b">qwen3:14b</option>
            </select>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Feature Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Features</CardTitle>
                <CardDescription>
                  Generate insights using local LLM
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {features.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => setActiveTab(feature.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      activeTab === feature.id
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-primary">{feature.icon}</div>
                      <div>
                        <p className="font-medium text-sm">{feature.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* History */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Recent Analyses</CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No analyses yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {history.slice(0, 10).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setResponse({
                            analysisId: item.id,
                            content: item.response,
                            model: item.modelName,
                            tokenCount: 0,
                            duration: 0,
                            createdAt: item.createdAt,
                          });
                        }}
                        className="w-full text-left p-2 rounded hover:bg-muted text-sm"
                      >
                        <div className="flex justify-between items-start">
                          <Badge variant="outline" className="text-xs">
                            {item.analysisType.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="line-clamp-2 mt-1 text-xs">
                          {item.response.substring(0, 100)}...
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentFeature?.icon}
                    <div>
                      <CardTitle>{currentFeature?.title}</CardTitle>
                      <CardDescription>{currentFeature?.description}</CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => generateAnalysis(activeTab)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>

                {/* Red Flag ID input for red-flag-explainer */}
                {activeTab === 'red-flag-explainer' && (
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-1 block">
                      Red Flag ID (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Red Flag ID"
                      value={redFlagId}
                      onChange={(e) => setRedFlagId(e.target.value)}
                      className="w-full border rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-4">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    {error}
                  </div>
                )}

                {response ? (
                  <div className="space-y-4">
                    {/* Response Metadata */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-b pb-4">
                      <div>
                        <span className="font-medium">Model:</span> {response.model}
                      </div>
                      <div>
                        <span className="font-medium">Tokens:</span> {response.tokenCount}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span> {response.duration}ms
                      </div>
                      <div>
                        <span className="font-medium">Time:</span>{' '}
                        {new Date(response.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {/* Response Content */}
                    <Textarea
                      value={response.content}
                      readOnly
                      className="min-h-[400px] font-mono text-sm"
                    />

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={copyToClipboard}
                        disabled={copied}
                      >
                        {copied ? (
                          <>
                            <CheckCheck className="h-4 w-4 mr-2" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => generateAnalysis(activeTab)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Regenerate
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Click "Generate" to run AI analysis</p>
                    <p className="text-sm mt-2">
                      Results will appear here and be saved for audit
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Safety Disclaimer */}
            <Card className="mt-6 border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Safety Guidelines</p>
                    <ul className="text-sm text-amber-700 mt-2 space-y-1">
                      <li>• AI outputs are investigative aids, not conclusions</li>
                      <li>• All findings require auditor review and professional judgment</li>
                      <li>• Never conclude fraud, money laundering, or criminal conduct</li>
                      <li>• Use neutral, explainable forensic language</li>
                      <li>• All AI interactions are logged for audit purposes</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}