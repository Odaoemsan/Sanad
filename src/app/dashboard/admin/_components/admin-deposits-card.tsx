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
import { ref, update, get, query, orderByChild, equalTo, push, set } from 'firebase/database';
import type { Transaction, UserProfile, Referral } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Check, X, Eye, Activity, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';


const L1_COMMISSION_RATE = 0.015; // 1.5%
const L2_COMMISSION_RATE = 0.01;  // 1%


export function AdminDepositsCard() {
  const database = useDatabase();
  const { toast } = useToast();
  
  // Get ALL transactions first, then filter client-side for deposits
  const allTransactionsRef = useMemoFirebase(() => {
    if (!database) return null;
    return ref(database, 'transactions');
  }, [database]);

  const usersRef = useMemoFirebase(() => database ? ref(database, 'users') : null, [database]);

  const { data: allTransactions, isLoading: transactionsLoading, error } = useDatabaseList<Transaction>(allTransactionsRef);
  const { data: users, isLoading: usersLoading } = useDatabaseList<UserProfile>(usersRef);

  const usersMap = useMemo(() => {
    if (!users) return new Map();
    return users.reduce((acc, user) => {
      acc.set(user.id, user);
      return acc;
    }, new Map<string, UserProfile>());
  }, [users]);
  
 const handleTransaction = async (transaction: Transaction, newStatus: 'Completed' | 'Failed') => {
    if (!database || !transaction.userProfileId || !transaction.id || !users) return;

    try {
        const updates: { [key: string]: any } = {};

        // Always update the transaction status first.
        updates[`transactions/${transaction.id}/status`] = newStatus;

        // If a deposit is approved, we perform several actions.
        if (newStatus === 'Completed') {
            const depositorProfile = users.find(u => u.id === transaction.userProfileId);
            if (!depositorProfile) throw new Error("Depositing user not found");
            
            // 1. Add deposit amount to the user's balance.
            const newBalance = (depositorProfile.balance || 0) + transaction.amount;
            updates[`users/${transaction.userProfileId}/balance`] = newBalance;

            // 2. Handle Referral Bonuses
            if (depositorProfile.referrerId) {
                // LEVEL 1
                const l1ReferrerProfile = users.find(u => u.id === depositorProfile.referrerId);
                
                if (l1ReferrerProfile) {
                    const l1Bonus = transaction.amount * L1_COMMISSION_RATE;
                    updates[`users/${l1ReferrerProfile.id}/balance`] = (l1ReferrerProfile.balance || 0) + l1Bonus;
                    
                    // Create transaction for L1 bonus
                    const l1BonusTxRef = push(ref(database, `transactions`));
                    updates[`transactions/${l1BonusTxRef.key}`] = {
                        id: l1BonusTxRef.key,
                        userProfileId: l1ReferrerProfile.id,
                        type: 'Referral Bonus',
                        amount: l1Bonus,
                        status: 'Completed',
                        transactionDate: new Date().toISOString(),
                        notes: `Level 1 bonus from ${depositorProfile.email}`
                    };

                     // Create referral record for L1
                    const l1ReferralRecordRef = push(ref(database, `users/${l1ReferrerProfile.id}/referrals`));
                    updates[`users/${l1ReferrerProfile.id}/referrals/${l1ReferralRecordRef.key}`] = {
                        id: l1ReferralRecordRef.key,
                        referrerId: l1ReferrerProfile.id,
                        referredId: depositorProfile.id,
                        referredUsername: depositorProfile.username,
                        referralDate: new Date().toISOString(),
                        bonusAmount: l1Bonus,
                    };

                    toast({ title: "مكافأة المستوى الأول", description: `تمت إضافة ${l1Bonus.toFixed(2)}$ إلى ${l1ReferrerProfile.email}`});

                    // LEVEL 2
                    if (l1ReferrerProfile.referrerId) {
                         const l2ReferrerProfile = users.find(u => u.id === l1ReferrerProfile.referrerId);

                         if (l2ReferrerProfile) {
                             const l2Bonus = transaction.amount * L2_COMMISSION_RATE;
                             updates[`users/${l2ReferrerProfile.id}/balance`] = (l2ReferrerProfile.balance || 0) + l2Bonus;

                             // Create transaction for L2 bonus
                             const l2BonusTxRef = push(ref(database, `transactions`));
                             updates[`transactions/${l2BonusTxRef.key}`] = {
                                id: l2BonusTxRef.key,
                                userProfileId: l2ReferrerProfile.id,
                                type: 'Referral Bonus',
                                amount: l2Bonus,
                                status: 'Completed',
                                transactionDate: new Date().toISOString(),
                                notes: `Level 2 bonus from ${depositorProfile.email}`
                             };
                             toast({ title: "مكافأة المستوى الثاني", description: `تمت إضافة ${l2Bonus.toFixed(2)}$ إلى ${l2ReferrerProfile.email}`});
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
  
  const pageIsLoading = transactionsLoading || usersLoading || !database;

  // Filter for deposits on the client side
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
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>معرف المعاملة (TxID)</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depositHistory.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium text-xs">{usersMap.get(tx.userProfileId)?.email || tx.userProfileId}</TableCell>
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
