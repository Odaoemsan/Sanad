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
import { ref, update, get } from 'firebase/database';
import type { UserProfile } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { Check, X, Activity, Inbox, Copy, Trash2 } from "lucide-react";
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

export function AdminWithdrawalsCard() {
  const database = useDatabase();
  const { toast } = useToast();
  
  const { 
      allTransactions, 
      usersMap,
      isLoading,
      error,
  } = useAdminData();

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleTransaction = async (transaction: Transaction, newStatus: 'Completed' | 'Failed') => {
    if (!database || !transaction.userProfileId || !transaction.id) return;

    setProcessingId(transaction.id);

    try {
        const updates: { [key: string]: any } = {};
        const userRef = ref(database, `users/${transaction.userProfileId}`);
        const userSnap = await get(userRef);
        
        if (!userSnap.exists()) {
             toast({title: "خطأ فادح", description: `لم يتم العثور على المستخدم ${transaction.userProfileId} لإكمال العملية.`, variant: 'destructive'});
             await update(ref(database, `transactions/${transaction.id}`), { status: 'Failed' });
             setProcessingId(null);
             return;
        }
        
        const userProfile: UserProfile = userSnap.val();

        if (newStatus === 'Failed' && transaction.type === 'Withdrawal') {
             // Refund the balance if the withdrawal fails
             const newBalance = (userProfile.balance || 0) + transaction.amount;
             updates[`users/${transaction.userProfileId}/balance`] = newBalance;
        }

        updates[`transactions/${transaction.id}/status`] = newStatus;
        
        await update(ref(database), updates);

      toast({
        title: "تم تحديث طلب السحب",
        description: `تم تحديث حالة الطلب إلى ${newStatus}.`
      });

    } catch (error: any) {
      console.error("Error handling withdrawal:", error);
      toast({ title: "خطأ", description: error.message || "فشل تحديث طلب السحب.", variant: "destructive" });
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

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({
        title: "تم النسخ بنجاح",
        description: "تم نسخ عنوان السحب إلى الحافظة."
    })
  }
  
  const pageIsLoading = isLoading || !database;

  const withdrawalHistory = useMemo(() => {
    return allTransactions
        ?.filter(tx => tx.type === 'Withdrawal' && !tx.isHidden)
        .sort((a, b) => (typeof b.transactionDate === 'number' ? b.transactionDate : 0) - (typeof a.transactionDate === 'number' ? a.transactionDate : 0)) 
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
                    <TableCell className="font-medium text-xs">{usersMap.get(tx.userProfileId) || '(مستخدم غير موجود)'}</TableCell>
                    <TableCell>${tx.amount.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-2">
                           <span className="break-words">{tx.withdrawAddress}</span>
                           <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => copyToClipboard(tx.withdrawAddress || '')}>
                                <Copy className="h-4 w-4" />
                           </Button>
                        </div>
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
                                      <Button title="موافقة" size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600" disabled={processingId === tx.id}><Check /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>تأكيد الموافقة على السحب</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              هل أنت متأكد من أنك تريد الموافقة على طلب السحب هذا بمبلغ ${tx.amount.toFixed(2)} إلى العنوان "{tx.withdrawAddress}"؟ هذا الإجراء لا يمكن التراجع عنه.
                                          </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleTransaction(tx, 'Completed')}>نعم، موافقة</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>

                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button title="رفض" size="icon" className="h-8 w-8 bg-red-500 hover:bg-red-600" disabled={processingId === tx.id}><X /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                          <AlertDialogTitle>تأكيد رفض السحب</AlertDialogTitle>
                                          <AlertDialogDescription>
                                              هل أنت متأكد من أنك تريد رفض طلب السحب هذا؟ سيتم إعادة المبلغ إلى رصيد المستخدم.
                                          </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleTransaction(tx, 'Failed')}>نعم، رفض</AlertDialogAction>
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
              <p className="text-muted-foreground">لا يوجد أي سجل سحوبات لعرضه.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
