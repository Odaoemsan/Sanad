'use client';

import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDatabase, useDatabaseList, useMemoFirebase } from "@/firebase";
import { ref, update, get, query, orderByChild, equalTo } from 'firebase/database';
import type { Transaction, UserProfile } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Check, X, Activity, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function AdminWithdrawalsCard() {
  const database = useDatabase();
  const { toast } = useToast();
  
  const allTransactionsRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'transactions');
  }, [database]);

  const { data: allTransactions, isLoading, error } = useDatabaseList<Transaction>(allTransactionsRef);

  const handleTransaction = async (transaction: Transaction, newStatus: 'Completed' | 'Failed') => {
    if (!database || !transaction.userProfileId || !transaction.id) return;

    try {
        const updates: { [key: string]: any } = {};

        // If a withdrawal is failed, we need to refund the user's balance.
        if (newStatus === 'Failed' && transaction.type === 'Withdrawal') {
            const userRef = ref(database, `users/${transaction.userProfileId}`);
            const userSnap = await get(userRef);
            if (!userSnap.exists()) throw new Error("User not found");
            const userProfile: UserProfile = userSnap.val();
            const newBalance = (userProfile.balance || 0) + transaction.amount;
            updates[`users/${transaction.userProfileId}/balance`] = newBalance;
        }

        // Always update the transaction status.
        updates[`transactions/${transaction.id}/status`] = newStatus;
        
        await update(ref(database), updates);

      toast({
        title: "تم تحديث طلب السحب",
        description: `تم تحديث حالة الطلب إلى ${newStatus}.`
      });

    } catch (error: any) {
      console.error("Error handling withdrawal:", error);
      toast({ title: "خطأ", description: error.message || "فشل تحديث طلب السحب.", variant: "destructive" });
    }
  };
  
  const pageIsLoading = isLoading || !database;

  const withdrawalHistory = useMemo(() => {
    return allTransactions
        ?.filter(tx => tx.type === 'Withdrawal')
        .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()) 
        || [];
  }, [allTransactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل السحوبات ({withdrawalHistory.length})</CardTitle>
        <CardDescription>عرض جميع طلبات السحب (المعلقة، المكتملة، والمرفوضة).</CardDescription>
      </CardHeader>
      <CardContent>
        {pageIsLoading ? (
          <div className="flex items-center justify-center p-10">
              <Activity className="h-10 w-10 animate-pulse text-primary" />
          </div>
         ) : error ? (
          <p className="text-destructive text-center">حدث خطأ أثناء تحميل السحوبات.</p>
        ) : withdrawalHistory.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم المستخدم</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>العنوان</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawalHistory.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium text-xs">{tx.username || 'غير متوفر'}</TableCell>
                    <TableCell>${tx.amount.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[100px] truncate" title={tx.withdrawAddress}>
                        {tx.withdrawAddress}
                    </TableCell>
                     <TableCell>
                        <Badge
                          className={cn(
                            "capitalize",
                            tx.status === 'Completed' && 'bg-green-500/20 text-green-700 border-green-500/20',
                            tx.status === 'Pending' && 'bg-amber-500/20 text-amber-700 border-amber-500/20',
                            tx.status === 'Failed' && 'bg-red-500/20 text-red-700 border-red-500/20'
                          )}
                        >
                          {tx.status}
                        </Badge>
                      </TableCell>
                    <TableCell>
                      {tx.status === 'Pending' ? (
                          <div className="flex items-center gap-2">
                            <Button title="موافقة" size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600" onClick={() => handleTransaction(tx, 'Completed')}><Check /></Button>
                            <Button title="رفض" size="icon" className="h-8 w-8 bg-red-500 hover:bg-red-600" onClick={() => handleTransaction(tx, 'Failed')}><X /></Button>
                          </div>
                      ) : (
                          <span className="text-xs text-muted-foreground">تمت المعالجة</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-10 space-y-3">
              <Inbox className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">لا يوجد أي سجل سحوبات لعرضه.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
