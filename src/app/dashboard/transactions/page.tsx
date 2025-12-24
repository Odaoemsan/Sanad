'use client';

import { DashboardHeader } from "@/components/layout/dashboard-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, Activity, Eye } from "lucide-react";
import { useUser, useDatabase, useDatabaseList, useMemoFirebase } from "@/firebase";
import { ref, query, orderByChild, equalTo } from 'firebase/database';
import type { Transaction } from "@/lib/placeholder-data";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TransactionsPage() {
  const { user } = useUser();
  const database = useDatabase();

  const transactionsRef = useMemoFirebase(() => {
    if (!user || !database) return null;
    // Query to get transactions for the current user
    return query(ref(database, 'transactions'), orderByChild('userProfileId'), equalTo(user.uid));
  }, [user, database]);
  
  const { data: transactionsData, isLoading } = useDatabaseList<Transaction>(transactionsRef);

  const sortedTransactions = transactionsData?.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()) || [];

  const exportToCSV = () => {
    const headers = ['النوع', 'الحالة', 'المبلغ', 'التاريخ', 'معرف المعاملة'];
    const csvContent = [
      headers.join(','),
      ...sortedTransactions.map(t => [
        t.type,
        t.status,
        (t.type === 'Deposit' || t.type === 'Profit' || t.type === 'Referral Bonus' ? '+' : '-') + t.amount.toFixed(2),
        format(new Date(t.transactionDate), 'yyyy-MM-dd pp'),
        t.id
      ].join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    link.href = URL.createObjectURL(blob);
    link.download = `snad-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
  const pageIsLoading = isLoading || !user || !database;

  return (
    <>
      <DashboardHeader pageTitle="المعاملات" />
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>سجل المعاملات</CardTitle>
              <CardDescription>
                سجل كامل لأنشطتك المالية.
              </CardDescription>
            </div>
             <Button size="sm" variant="outline" className="mr-auto gap-1" onClick={exportToCSV} disabled={!sortedTransactions || sortedTransactions.length === 0}>
                <Download className="h-4 w-4" />
                تصدير CSV
            </Button>
          </CardHeader>
          <CardContent>
            {pageIsLoading ? (
                <div className="flex items-center justify-center p-10">
                    <Activity className="h-10 w-10 animate-pulse text-primary" />
                </div>
            ) : (
            <ScrollArea className="h-[calc(100vh-20rem)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">المبلغ</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>التفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTransactions.length > 0 ? sortedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="font-medium">{transaction.type}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "capitalize",
                            transaction.status === 'Completed' && 'bg-green-500/20 text-green-700 border-green-500/20',
                            transaction.status === 'Pending' && 'bg-amber-500/20 text-amber-700 border-amber-500/20',
                            transaction.status === 'Failed' && 'bg-red-500/20 text-red-700 border-red-500/20'
                          )}
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-left font-medium",
                          transaction.type === "Deposit" ||
                            transaction.type === "Profit" ||
                            transaction.type === "Referral Bonus"
                            ? "text-green-600"
                            : "text-red-600"
                        )}
                      >
                        {transaction.type === "Deposit" ||
                        transaction.type === "Profit" ||
                        transaction.type === "Referral Bonus"
                          ? "+"
                          : "-"}
                        ${transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{format(new Date(transaction.transactionDate), 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {transaction.type === 'Deposit' && transaction.depositProof ? (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(transaction.depositProof, '_blank')}>
                              <Eye className="h-4 w-4 text-blue-400" />
                          </Button>
                        ) : (
                          transaction.id.substring(0,10) + '...'
                        )}
                      </TableCell>
                    </TableRow>
                  )) : (
                      <TableRow>
                          <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                              ليس لديك أي معاملات حتى الآن.
                          </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
