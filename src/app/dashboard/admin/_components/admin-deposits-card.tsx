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
import { ref, update, get, push } from 'firebase/database';
import type { Transaction, UserProfile } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Check, X, Inbox, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const L1_COMMISSION_RATE = 0.015; // 1.5%
const L2_COMMISSION_RATE = 0.01;  // 1%

export function AdminDepositsCard() {
  const database = useDatabase();
  const { toast } = useToast();
  
  const allTransactionsRef = useMemoFirebase(() => database ? ref(database, 'transactions') : null, [database]);
  const allUsersRef = useMemoFirebase(() => database ? ref(database, 'users') : null, [database]);

  const { data: allTransactions, isLoading: isLoadingTxs, error } = useDatabaseList<Transaction>(allTransactionsRef);
  const { data: allUsers, isLoading: isLoadingUsers } = useDatabaseList<UserProfile>(allUsersRef);
  
  const usersMap = useMemo(() => {
      if (!allUsers) return new Map<string, string>();
      return new Map(allUsers.map(user => [user.id, user.username]));
  }, [allUsers]);

 const handleTransaction = async (transaction: Transaction, newStatus: 'Completed' | 'Failed') => {
    if (!database || !transaction.id || !transaction.userProfileId) {
        toast({ title: "بيانات ناقصة", description: "المعاملة تفتقد للمعلومات الضرورية.", variant: "destructive" });
        return;
    }

    try {
        const updates: { [key: string]: any } = {};
        updates[`transactions/${transaction.id}/status`] = newStatus;

        if (newStatus === 'Completed') {
            const depositorRef = ref(database, `users/${transaction.userProfileId}`);
            const depositorSnap = await get(depositorRef);
            if (!depositorSnap.exists()) {
                 toast({ title: "خطأ فادح", description: `لم يتم العثور على المستخدم صاحب المعرف ${transaction.userProfileId}. قد يكون الحساب قد تم حذفه.`, variant: 'destructive'});
                 // Optionally, fail the transaction automatically
                 updates[`transactions/${transaction.id}/status`] = 'Failed';
                 await update(ref(database), updates);
                 return;
            }
            const depositorProfile: UserProfile = { ...depositorSnap.val(), id: depositorSnap.key };


            // 1. Add deposit amount to the user's balance.
            const newBalance = (depositorProfile.balance || 0) + transaction.amount;
            updates[`users/${transaction.userProfileId}/balance`] = newBalance;

            // 2. Handle Referral Bonuses
            if (depositorProfile.referrerId) {
                // LEVEL 1
                const l1ReferrerRef = ref(database, `users/${depositorProfile.referrerId}`);
                const l1ReferrerSnap = await get(l1ReferrerRef);
                
                if (l1ReferrerSnap.exists()) {
                    const l1ReferrerProfile: UserProfile = { ...l1ReferrerSnap.val(), id: l1ReferrerSnap.key };
                    const l1Bonus = transaction.amount * L1_COMMISSION_RATE;
                    updates[`users/${l1ReferrerProfile.id}/balance`] = (l1ReferrerProfile.balance || 0) + l1Bonus;
                    
                    const l1BonusTxRef = push(ref(database, `transactions`));
                    updates[`transactions/${l1BonusTxRef.key}`] = {
                        id: l1BonusTxRef.key,
                        userProfileId: l1ReferrerProfile.id,
                        type: 'Referral Bonus',
                        amount: l1Bonus,
                        status: 'Completed',
                        transactionDate: new Date().toISOString(),
                        notes: `Level 1 bonus from ${depositorProfile.username}`
                    };

                    const l1ReferralRecordRef = push(ref(database, `users/${l1ReferrerProfile.id}/referrals`));
                    updates[`users/${l1ReferrerProfile.id}/referrals/${l1ReferralRecordRef.key}`] = {
                        id: l1ReferralRecordRef.key,
                        referrerId: l1ReferrerProfile.id,
                        referredId: depositorProfile.id,
                        referredUsername: depositorProfile.username,
                        referralDate: new Date().toISOString(),
                        bonusAmount: l1Bonus,
                    };

                    toast({ title: "مكافأة المستوى الأول", description: `تمت إضافة ${l1Bonus.toFixed(2)}$ إلى ${l1ReferrerProfile.username}`});

                    // LEVEL 2
                    if (l1ReferrerProfile.referrerId) {
                        const l2ReferrerRef = ref(database, `users/${l1ReferrerProfile.referrerId}`);
                        const l2ReferrerSnap = await get(l2ReferrerRef);

                         if (l2ReferrerSnap.exists()) {
                             const l2ReferrerProfile: UserProfile = { ...l2ReferrerSnap.val(), id: l2ReferrerSnap.key };
                             const l2Bonus = transaction.amount * L2_COMMISSION_RATE;
                             updates[`users/${l2ReferrerProfile.id}/balance`] = (l2ReferrerProfile.balance || 0) + l2Bonus;

                             const l2BonusTxRef = push(ref(database, `transactions`));
                             updates[`transactions/${l2BonusTxRef.key}`] = {
                                id: l2BonusTxRef.key,
                                userProfileId: l2ReferrerProfile.id,
                                type: 'Referral Bonus',
                                amount: l2Bonus,
                                status: 'Completed',
                                transactionDate: new Date().toISOString(),
                                notes: `Level 2 bonus from ${depositorProfile.username}`
                             };
                             toast({ title: "مكافأة المستوى الثاني", description: `تمت إضافة ${l2Bonus.toFixed(2)}$ إلى ${l2ReferrerProfile.username}`});
                         }
                    }
                }
            }
        }
        
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
  
  const pageIsLoading = isLoadingTxs || isLoadingUsers || !database;

  const depositHistory = useMemo(() => {
    return allTransactions
      ?.filter(tx => tx.type === 'Deposit')
      .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()) 
      || [];
  }, [allTransactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>سجل الإيداعات ({depositHistory.length})</CardTitle>
        <CardDescription>عرض جميع طلبات الإيداع (المعلقة، المكتملة، والمرفوضة).</CardDescription>
      </CardHeader>
      <CardContent>
        {pageIsLoading ? (
           <div className="flex items-center justify-center p-10">
              <Activity className="h-10 w-10 animate-pulse text-primary" />
          </div>
        ) : error ? (
          <p className="text-destructive text-center">حدث خطأ أثناء تحميل الإيداعات.</p>
        ) : depositHistory.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم المستخدم</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>معرف المعاملة (TxID)</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depositHistory.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium text-xs">{usersMap.get(tx.userProfileId) || '(مستخدم غير موجود)'}</TableCell>
                    <TableCell className="font-bold">${tx.amount.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[150px] truncate" title={tx.transactionId}>
                      {tx.transactionId || 'N/A'}
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
              <p className="text-muted-foreground">لا يوجد أي سجل إيداعات لعرضه.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
