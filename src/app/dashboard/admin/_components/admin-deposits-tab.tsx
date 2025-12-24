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
import { Check, X, Eye, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AdminDepositsTab() {
  const database = useDatabase();
  const { toast } = useToast();
  
  // Get ALL pending transactions first, then filter client-side
  const pendingTransactionsRef = useMemoFirebase(() => {
    if (!database) return null;
    return query(ref(database, 'transactions'), orderByChild('status'), equalTo('Pending'));
  }, [database]);

  const usersRef = useMemoFirebase(() => database ? ref(database, 'users') : null, [database]);

  const { data: pendingTransactions, isLoading: transactionsLoading, error } = useDatabaseList<Transaction>(pendingTransactionsRef);
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

        // If a deposit is approved, we need to add to the user's balance.
        if (newStatus === 'Completed') {
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
        title: "تم تحديث طلب الإيداع",
        description: `تم تحديث حالة الطلب إلى ${newStatus}.`
      });

    } catch (error: any) {
      console.error("Error handling deposit:", error);
      toast({ title: "خطأ", description: error.message || "فشل تحديث طلب الإيداع.", variant: "destructive" });
    }
  };
  
  const pageIsLoading = transactionsLoading || usersLoading || !database;

  // Filter for deposits on the client side
  const depositsToReview = pendingTransactions?.filter(tx => tx.type === 'Deposit') || [];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>طلبات الإيداع المعلقة</CardTitle>
          <CardDescription>قم بمراجعة والموافقة على أو رفض طلبات الإيداع اليدوية المعلقة.</CardDescription>
        </CardHeader>
        <CardContent>
          {pageIsLoading ? (
             <div className="flex items-center justify-center p-10">
                <Activity className="h-10 w-10 animate-pulse text-primary" />
            </div>
          ) : error ? (
            <p className="text-destructive text-center">حدث خطأ أثناء تحميل الإيداعات.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>البوابة</TableHead>
                  <TableHead>تاريخ الطلب</TableHead>
                  <TableHead>إثبات الدفع</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depositsToReview.length > 0 ? depositsToReview.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{usersMap.get(tx.userProfileId)?.email || tx.userProfileId}</TableCell>
                    <TableCell>${tx.amount.toFixed(2)}</TableCell>
                    <TableCell>{tx.paymentGateway}</TableCell>
                    <TableCell>{format(new Date(tx.transactionDate), 'yyyy-MM-dd pp')}</TableCell>
                    <TableCell>
                      {tx.depositProof ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(tx.depositProof, '_blank')}
                        >
                          <Eye className="ml-2 h-4 w-4" />
                          عرض الإثبات
                        </Button>
                      ) : (
                        'لا يوجد'
                      )}
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
                        <TableCell colSpan={6} className="h-24 text-center">لا توجد طلبات إيداع معلقة حاليًا.</TableCell>
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
