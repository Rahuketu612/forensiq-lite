'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts';
import FundTrailPanel from '@/components/fund-trail-panel';
import PatternsPanel from '@/components/patterns-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, FileText, GitBranch } from 'lucide-react';

export default function FundTrailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [caseName, setCaseName] = useState<string>('');
  const [activeView, setActiveView] = useState<'links' | 'patterns'>('links');

  const fetchCaseName = useCallback(async () => {
    try {
      const token = localStorage.getItem('forensiq_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/cases/${caseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setCaseName(data.title || 'Unknown Case');
      }
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
      fetchCaseName();
    }
  }, [authLoading, isAuthenticated, router, fetchCaseName]);

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
          <Link 
            href={`/cases/${caseId}`} 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Case</span>
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{caseName || 'Loading...'}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeView === 'links' ? 'default' : 'outline'}
            onClick={() => setActiveView('links')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Transaction Links
          </Button>
          <Button
            variant={activeView === 'patterns' ? 'default' : 'outline'}
            onClick={() => setActiveView('patterns')}
          >
            <GitBranch className="h-4 w-4 mr-2" />
            Pattern Analysis
          </Button>
        </div>

        {activeView === 'links' ? (
          <FundTrailPanel caseId={caseId} />
        ) : (
          <PatternsPanel caseId={caseId} />
        )}
      </main>
    </div>
  );
}
