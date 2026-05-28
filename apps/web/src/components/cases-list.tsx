'use client';

import Link from 'next/link';
import { Case } from '@/lib/cases';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, User, AlertTriangle, Clock } from 'lucide-react';

interface CasesListProps {
  cases: Case[];
  isLoading?: boolean;
}

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
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{caseItem.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-sm">{caseItem.caseNumber}</span>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {caseItem.riskLevel && (
                    <Badge variant="secondary" className={riskColors[caseItem.riskLevel]}>
                      {caseItem.riskLevel}
                    </Badge>
                  )}
                  <Badge className={statusColors[caseItem.status]}>
                    {caseItem.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {caseItem.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {caseItem.description}
                </p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{caseItem.clientName || 'No client'}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{caseItem.transactionCount} transactions</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{caseItem.flagCount} flags</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(caseItem.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {caseItem.assignedTo && (
                <div className="mt-4 pt-4 border-t text-sm flex items-center gap-2">
                  <span className="text-muted-foreground">Assigned to:</span>
                  <span className="font-medium">{caseItem.assignedTo.name}</span>
                  <Badge variant="outline" className="ml-2">
                    {caseItem.assignedTo.role}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}