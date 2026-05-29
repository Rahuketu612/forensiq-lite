'use client';

import Link from 'next/link';
import { Case } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

interface CasesListProps {
  cases: Case[];
  isLoading?: boolean;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  ACTIVE: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  CLOSED: 'bg-green-100 text-green-800',
};

export function CasesList({ cases, isLoading }: CasesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-32" />
          </Card>
        ))}
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No cases found</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create your first case to start analyzing transactions.
          </p>
          <Link href="/cases/new">
            <Button>Create New Case</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {cases.map((caseItem) => (
        <Link key={caseItem.id} href={`/cases/${caseItem.id}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{caseItem.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm">{caseItem.caseNumber}</span>
                  </CardDescription>
                </div>
                <Badge className={statusColors[caseItem.status] || 'bg-gray-100'}>
                  {caseItem.status.replace('_', ' ')}
                </Badge>
              </div>
              {caseItem.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {caseItem.description}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
