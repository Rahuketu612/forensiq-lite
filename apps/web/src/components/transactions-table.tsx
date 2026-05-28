'use client';

import { Transaction } from '@/lib/import';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, Credit, ArrowDownCircle, ArrowRightCircle } from 'lucide-react';

interface TransactionsTableProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

const typeColors: Record<string, string> = {
  CREDIT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  DEBIT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  TRANSFER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  REFUND: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  FEE: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

const modeLabels: Record<string, string> = {
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  NEFT: 'NEFT',
  RTGS: 'RTGS',
  UPI: 'UPI',
  IMPS: 'IMPS',
  ONLINE: 'Online',
  CARD: 'Card',
  BANK: 'Bank',
  OTHER: 'Other',
};

export function TransactionsTable({ transactions, isLoading }: TransactionsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 border-b border-border" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-2">No transactions found</p>
          <p className="text-sm text-muted-foreground">
            Import a bank statement to see transactions here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">
                  <button className="flex items-center gap-1 hover:text-foreground">
                    Date
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead className="w-[100px]">Mode</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="w-[150px] text-right">
                  <button className="flex items-center gap-1 hover:text-foreground ml-auto">
                    Amount
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead className="w-[120px] text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-sm">
                    {new Date(tx.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate" title={tx.description || ''}>
                    {tx.description || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tx.counterparty || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{modeLabels[tx.mode] || tx.mode}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={typeColors[tx.type]}>
                      <span className="flex items-center gap-1">
                        {tx.type === 'CREDIT' && <ArrowDownCircle className="h-3 w-3" />}
                        {tx.type === 'DEBIT' && <ArrowUpDown className="h-3 w-3" />}
                        {tx.type === 'TRANSFER' && <ArrowRightCircle className="h-3 w-3" />}
                        {tx.type}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-mono font-medium ${
                    tx.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'CREDIT' ? '+' : '-'}{' '}
                    ₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {tx.balance !== undefined && tx.balance !== null
                      ? `₹${tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}