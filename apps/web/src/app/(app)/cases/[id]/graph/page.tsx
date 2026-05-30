'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Network, 
  RefreshCw, 
  ChevronRight, 
  AlertCircle,
  Activity,
  Database,
  GitBranch
} from 'lucide-react';

interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodeTypes: Record<string, number>;
  edgeTypes: Record<string, number>;
}

interface GraphNode {
  id: string;
  type: string;
  label: string;
  metadata: Record<string, unknown>;
}

interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationship: string;
  confidence: number;
}

export default function GraphPage() {
  const params = useParams();
  const caseId = params.id as string;

  const [stats, setStats] = useState<GraphStats | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGraphData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const statsRes = await fetch(`/api/v1/cases/${caseId}/graph/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dev-bypass-token') || 'dev-bypass-token'}`
        }
      });

      if (!statsRes.ok) {
        throw new Error('Failed to fetch graph stats');
      }

      const statsData = await statsRes.json();
      setStats(statsData);

      const graphRes = await fetch(`/api/v1/cases/${caseId}/graph`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dev-bypass-token') || 'dev-bypass-token'}`
        }
      });

      if (graphRes.ok) {
        const graphData = await graphRes.json();
        setNodes(graphData.nodes || []);
        setEdges(graphData.edges || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load graph data');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  const generateGraph = async () => {
    try {
      setGenerating(true);
      setError(null);

      const res = await fetch(`/api/v1/cases/${caseId}/graph/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('dev-bypass-token') || 'dev-bypass-token'}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to generate graph');
      }

      await fetchGraphData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate graph');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (caseId) {
      fetchGraphData();
    }
  }, [caseId, fetchGraphData]);

  const getNodeTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      ACCOUNT: 'bg-blue-500',
      TRANSACTION: 'bg-green-500',
      ENTITY: 'bg-purple-500',
      FLAG: 'bg-red-500',
      ADDRESS: 'bg-yellow-500',
      PHONE: 'bg-orange-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Network className="h-8 w-8" />
            Relationship Graph
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualizing connections between entities, accounts, and transactions
          </p>
        </div>
        <Button 
          onClick={generateGraph} 
          disabled={generating}
          className="gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Generate Graph
            </>
          )}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 py-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-destructive">{error}</span>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="h-4 w-20 bg-muted animate-pulse rounded mb-2" />
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="h-[500px] bg-muted animate-pulse rounded-lg" />
        </div>
      )}

      {!loading && stats && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Nodes</span>
                </div>
                <p className="text-3xl font-bold mt-2">{stats.totalNodes}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Edges</span>
                </div>
                <p className="text-3xl font-bold mt-2">{stats.totalEdges}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Node Types</span>
                </div>
                <p className="text-3xl font-bold mt-2">{Object.keys(stats.nodeTypes).length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Relationships</span>
                </div>
                <p className="text-3xl font-bold mt-2">{Object.keys(stats.edgeTypes).length}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="min-h-[500px]">
            <CardHeader>
              <CardTitle>Graph Visualization</CardTitle>
              <CardDescription>
                Interactive network showing relationships between investigation entities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {nodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <Network className="h-16 w-16 mb-4" />
                  <p className="text-lg">No graph data available</p>
                  <p className="text-sm">Click "Generate Graph" to create the investigation graph</p>
                </div>
              ) : (
                <Tabs defaultValue="visualization">
                  <TabsList>
                    <TabsTrigger value="visualization">Visualization</TabsTrigger>
                    <TabsTrigger value="nodes">Nodes ({nodes.length})</TabsTrigger>
                    <TabsTrigger value="edges">Edges ({edges.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="visualization" className="h-[400px]">
                    <div className="flex items-center justify-center h-full border-2 border-dashed rounded-lg">
                      <div className="text-center">
                        <Network className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg font-medium">Interactive Graph View</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {nodes.length} nodes and {edges.length} edges
                        </p>
                        <p className="text-xs text-muted-foreground mt-4">
                          Graph visualization component to be integrated
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="nodes">
                    <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                      {nodes.map((node) => (
                        <div 
                          key={node.id} 
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getNodeTypeColor(node.type)}`} />
                            <div>
                              <p className="font-medium">{node.label}</p>
                              <p className="text-sm text-muted-foreground">{node.id}</p>
                            </div>
                          </div>
                          <Badge variant="secondary">{node.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="edges">
                    <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                      {edges.map((edge) => (
                        <div 
                          key={edge.id} 
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{edge.sourceId.slice(0, 8)}...</Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline">{edge.targetId.slice(0, 8)}...</Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">{edge.relationship}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {(edge.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          {nodes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Node Types Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(stats.nodeTypes).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getNodeTypeColor(type)}`} />
                      <span className="text-sm">{type}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}