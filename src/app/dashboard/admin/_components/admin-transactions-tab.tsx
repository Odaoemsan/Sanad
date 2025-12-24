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
import { Check, X, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AdminTransactionsTab() {
  const database = useDatabase();
  const { toast } = useToast();
  
  const pendingWithdrawalsRef = useMemoFirebase(() => {
    if (!database) return null;
    return query(ref(database, 'transactions'), orderByChild('status'), equalTo('Pending'));
  }, [database]);

  const usersRef = useMemoFirebase(() => database ? ref(database, 'users') : null, [database]);

  const { data: pendingTransactions, isLoading: withdrawalsLoading, error } = useDatabaseList<Transaction>(pendingWithdrawalsRef);
  const { data: users, isLoading: usersLoading } = useDatabaseList<UserProfile>(usersRef);

  const usersMap = useMemo(() => {
    if (!users) return new Map();
    return users.reduce((acc, user) => {
      acc.set(user.id, user);
      return acc;
    }, new Map<string, UserProfile>());
  }, [users]);


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
  
  const pageIsLoading = withdrawalsLoading || usersLoading || !database;

  const withdrawalsToReview = pendingTransactions?.filter(tx => tx.type === 'Withdrawal') || [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>طلبات السحب المعلقة</CardTitle>
          <CardDescription>قم بمراجعة والموافقة على أو رفض طلبات السحب المعلقة.</CardDescription>
        </CardHeader>
        <CardContent>
          {pageIsLoading ? (
            <div className="flex items-center justify-center p-10">
                <Activity className="h-10 w-10 animate-pulse text-primary" />
            </div>
           ) : error ? (
            <p className="text-destructive text-center">حدث خطأ أثناء تحميل السحوبات.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>تاريخ الطلب</TableHead>
                  <TableHead>عنوان المحفظة (USDT BEP20)</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawalsToReview.length > 0 ? withdrawalsToReview.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{usersMap.get(tx.userProfileId)?.email || tx.userProfileId}</TableCell>
                    <TableCell>${tx.amount.toFixed(2)}</TableCell>
                    <TableCell>{format(new Date(tx.transactionDate), 'yyyy-MM-dd pp')}</TableCell>
                    <TableCell className="font-mono text-xs">
                        {tx.withdrawAddress}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button title="موافقة" size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600" onClick={() => handleTransaction(tx, 'Completed')}><Check /></Button>
                        <Button title="رفض" size="icon" className="h-8 w-8 bg-red-500 hover:bg-red-600" onClick={() => handleTransaction(tx, 'Failed')}><X /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">لا توجد طلبات سحب معلقة حاليًا.</TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
