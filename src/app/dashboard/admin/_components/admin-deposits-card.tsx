'use client';

import { useMemo, useState } from 'react';
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
import { useDatabase } from "@/firebase";
import { ref, update, get, push, serverTimestamp } from 'firebase/database';
import type { UserProfile } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { Check, X, Inbox, Activity, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAdminData } from './admin-data-provider';
import type { Transaction } from "@/lib/placeholder-data";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const L1_COMMISSION_RATE = 0.015; // 1.5%
const L2_COMMISSION_RATE = 0.01;  // 1%
const REPRESENTATIVE_COMMISSION_RATE = 0.05; // 5% for Representatives
const RANK_GOAL = 10000;

export function AdminDepositsCard() {
  const database = useDatabase();
  const { toast } = useToast();
  
  const { 
    allTransactions, 
    allUsers, 
    usersMap,
    isLoading,
    error,
  } = useAdminData();
  
  const [processingId, setProcessingId] = useState<string | null>(null);

 const handleTransaction = async (transaction: Transaction, newStatus: 'Completed' | 'Failed') => {
    if (!database || !transaction.id || !transaction.userProfileId) {
        toast({ title: "بيانات ناقصة", description: "المعاملة تفتقد للمعلومات الضرورية.", variant: "destructive" });
        return;
    }

    setProcessingId(transaction.id);

    try {
        const updates: { [key: string]: any } = {};
        updates[`transactions/${transaction.id}/status`] = newStatus;

        if (newStatus === 'Completed') {
            const depositorRef = ref(database, `users/${transaction.userProfileId}`);
            const depositorSnap = await get(depositorRef);
            if (!depositorSnap.exists()) {
                 toast({ title: "خطأ فادح", description: `لم يتم العثور على المستخدم صاحب المعرف ${transaction.userProfileId}. قد يكون الحساب قد تم حذفه.`, variant: 'destructive'});
                 return;
            }
            const depositorProfile: UserProfile = { ...depositorSnap.val(), id: depositorSnap.key };


            // 1. Add deposit amount to the user's balance.
            const newBalance = (depositorProfile.balance || 0) + transaction.amount;
            updates[`users/${transaction.userProfileId}/balance`] = newBalance;

            // 2. Handle Referral Bonuses & Team Deposit Updates
            if (depositorProfile.referrerId) {
                // LEVEL 1
                const l1ReferrerRef = ref(database, `users/${depositorProfile.referrerId}`);
                const l1ReferrerSnap = await get(l1ReferrerRef);
                
                if (l1ReferrerSnap.exists()) {
                    const l1ReferrerProfile: UserProfile = { ...l1ReferrerSnap.val(), id: l1ReferrerSnap.key };
                    
                    const commissionRate = l1ReferrerProfile.rank === 'representative' ? REPRESENTATIVE_COMMISSION_RATE : L1_COMMISSION_RATE;
                    const l1Bonus = transaction.amount * commissionRate;
                    
                    // Update L1 referrer's balance
                    updates[`users/${l1ReferrerProfile.id}/balance`] = (l1ReferrerProfile.balance || 0) + l1Bonus;
                    
                    // Update L1 referrer's team deposit total
                    const l1NewTeamDeposit = (l1ReferrerProfile.teamTotalDeposit || 0) + transaction.amount;
                    updates[`users/${l1ReferrerProfile.id}/teamTotalDeposit`] = l1NewTeamDeposit;

                    // Check for L1 Rank upgrade
                    if (l1NewTeamDeposit >= RANK_GOAL && l1ReferrerProfile.rank !== 'representative') {
                        updates[`users/${l1ReferrerProfile.id}/rank`] = 'representative';
                         toast({ title: `🎉 ترقية!`, description: `تمت ترقية ${l1ReferrerProfile.username} إلى ممثل رسمي!`, className: "bg-green-600 text-white border-green-600" });
                    }
                    
                    const l1BonusTxRef = push(ref(database, `transactions`));
                    updates[`transactions/${l1BonusTxRef.key}`] = {
                        id: l1BonusTxRef.key,
                        userProfileId: l1ReferrerProfile.id,
                        type: 'Referral Bonus',
                        amount: l1Bonus,
                        status: 'Completed',
                        transactionDate: serverTimestamp(),
                        notes: `Level 1 bonus from ${depositorProfile.username}`
                    };

                    const l1ReferralRecordRef = push(ref(database, `users/${l1ReferrerProfile.id}/referrals`));
                    updates[`users/${l1ReferrerProfile.id}/referrals/${l1ReferralRecordRef.key}`] = {
                        id: l1ReferralRecordRef.key,
                        referrerId: l1ReferrerProfile.id,
                        referredId: depositorProfile.id,
                        referredUsername: depositorProfile.username,
                        referralDate: serverTimestamp(),
                        bonusAmount: l1Bonus,
                        depositAmount: transaction.amount,
                    };

                    toast({ title: `مكافأة المستوى الأول (${commissionRate*100}%)`, description: `تمت إضافة ${l1Bonus.toFixed(2)}$ إلى ${l1ReferrerProfile.username}`});

                    // LEVEL 2
                    if (l1ReferrerProfile.referrerId) {
                        const l2ReferrerRef = ref(database, `users/${l1ReferrerProfile.referrerId}`);
                        const l2ReferrerSnap = await get(l2ReferrerRef);

                         if (l2ReferrerSnap.exists()) {
                             const l2ReferrerProfile: UserProfile = { ...l2ReferrerSnap.val(), id: l2ReferrerSnap.key };
                             const l2Bonus = transaction.amount * L2_COMMISSION_RATE;
                             
                             // Update L2 referrer's balance
                             updates[`users/${l2ReferrerProfile.id}/balance`] = (l2ReferrerProfile.balance || 0) + l2Bonus;
                             
                             // Update L2 referrer's team deposit total
                            const l2NewTeamDeposit = (l2ReferrerProfile.teamTotalDeposit || 0) + transaction.amount;
                            updates[`users/${l2ReferrerProfile.id}/teamTotalDeposit`] = l2NewTeamDeposit;

                            // Check for L2 Rank upgrade
                            if (l2NewTeamDeposit >= RANK_GOAL && l2ReferrerProfile.rank !== 'representative') {
                                updates[`users/${l2ReferrerProfile.id}/rank`] = 'representative';
                                toast({ title: `🎉 ترقية!`, description: `تمت ترقية ${l2ReferrerProfile.username} إلى ممثل رسمي!`, className: "bg-green-600 text-white border-green-600" });
                            }


                             const l2BonusTxRef = push(ref(database, `transactions`));
                             updates[`transactions/${l2BonusTxRef.key}`] = {
                                id: l2BonusTxRef.key,
                                userProfileId: l2ReferrerProfile.id,
                                type: 'Referral Bonus',
                                amount: l2Bonus,
                                status: 'Completed',
                                transactionDate: serverTimestamp(),
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
    } finally {
        setProcessingId(null);
    }
  };

  const handleClearTransaction = async (transactionId: string) => {
    if (!database) return;
    try {
        await update(ref(database, `transactions/${transactionId}`), { isHidden: true });
        toast({ title: "تم مسح السجل", description: "تم إخفاء السجل من العرض الحالي." });
    } catch(error) {
        toast({ title: "خطأ", description: "فشل مسح السجل.", variant: "destructive" });
    }
  };
  
  const pageIsLoading = isLoading || !database;

  const depositHistory = useMemo(() => {
    return allTransactions
      ?.filter(tx => tx.type === 'Deposit' && !tx.isHidden)
      .sort((a, b) => (typeof b.transactionDate === 'number' ? b.transactionDate : 0) - (typeof a.transactionDate === 'number' ? a.transactionDate : 0)) 
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
                    <TableCell>
                      <p className="font-mono text-xs max-w-[150px] truncate" title={tx.transactionId}>
                        {tx.transactionId || 'N/A'}
                      </p>
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
                       <div className="flex items-center gap-2">
                         {tx.status === 'Pending' ? (
                          <>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button title="موافقة" size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600" disabled={processingId === tx.id}>
                                      <Check />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>تأكيد الموافقة على الإيداع</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            هل أنت متأكد من أنك تريد الموافقة على طلب الإيداع هذا بمبلغ ${tx.amount.toFixed(2)} للمستخدم "{usersMap.get(tx.userProfileId)}"? سيتم إضافة المبلغ إلى رصيده.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleTransaction(tx, 'Completed')}>
                                            نعم، موافقة
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button title="رفض" size="icon" className="h-8 w-8 bg-red-500 hover:bg-red-600" disabled={processingId === tx.id}>
                                        <X />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>تأكيد رفض الإيداع</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            هل أنت متأكد من أنك تريد رفض طلب الإيداع هذا؟ لن يتم إضافة أي مبلغ إلى رصيد المستخدم.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleTransaction(tx, 'Failed')}>
                                            نعم، رفض
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </>
                        ) : (
                          <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button title="مسح من العرض" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={processingId === tx.id}>
                                      <Trash2 />
                                  </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>تأكيد المسح</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          هل أنت متأكد من أنك تريد مسح هذا السجل من العرض؟ ستبقى المعاملة في قاعدة البيانات.
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleClearTransaction(tx.id)}>نعم، مسح</AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                        )}
                       </div>
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
