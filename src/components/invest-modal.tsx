'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser, useDatabase, useDatabaseObject, useMemoFirebase } from '@/firebase';
import { ref, update, push, get, query, equalTo, orderByChild } from 'firebase/database';
import type { InvestmentPlan, UserProfile } from '@/lib/placeholder-data';
import Link from 'next/link';
import { addDays } from 'date-fns';

interface InvestModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: InvestmentPlan;
}

export function InvestModal({ isOpen, onClose, plan }: InvestModalProps) {
  const { user } = useUser();
  const database = useDatabase();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!database || !user) return null;
    return ref(database, `users/${user.uid}`);
  }, [database, user]);

  const { data: userProfile } = useDatabaseObject<UserProfile>(userProfileRef);

  const handleInvest = async () => {
    if (!user || !database || !userProfileRef) return;
    setIsLoading(true);
    
    // Check for existing active investment
    const investmentsRef = ref(database, `users/${user.uid}/investments`);
    const q = query(investmentsRef, orderByChild('status'), equalTo('active'));
    const activeInvestmentsSnap = await get(q);

    if (activeInvestmentsSnap.exists()) {
      toast({ title: 'فشل الاستثمار', description: 'لا يمكنك الاستثمار في خطة جديدة بينما لديك استثمار نشط بالفعل.', variant: 'destructive' });
      setIsLoading(false);
      onClose();
      return;
    }


    const investmentAmount = parseFloat(amount);
    const userBalance = userProfile?.balance || 0;

    if (isNaN(investmentAmount) || investmentAmount <= 0) {
      toast({ title: 'مبلغ غير صالح', description: 'الرجاء إدخال رقم موجب صالح.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    if (investmentAmount < plan.minDeposit || investmentAmount > plan.maxDeposit) {
      toast({
        title: 'المبلغ خارج النطاق',
        description: `الرجاء إدخال مبلغ بين ${plan.minDeposit}$ و ${plan.maxDeposit}$.`,
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    if (userBalance < investmentAmount) {
      toast({ title: 'رصيد غير كافٍ', description: 'الرجاء إيداع الأموال في محفظتك.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    try {
      const updates: { [key: string]: any } = {};
      const startDate = new Date();
      const endDate = addDays(startDate, plan.duration);

      const investmentRef = push(ref(database, `users/${user.uid}/investments`));
      const investmentId = investmentRef.key;

      updates[`/users/${user.uid}/investments/${investmentId}`] = {
        id: investmentId,
        userProfileId: user.uid,
        investmentPlanId: plan.id,
        amount: investmentAmount,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: 'active',
      };

      updates[`/users/${user.uid}/balance`] = userBalance - investmentAmount;
      
      const transactionRef = push(ref(database, `transactions`));
      const transactionId = transactionRef.key;

      updates[`/transactions/${transactionId}`] = {
        id: transactionId,
        userProfileId: user.uid,
        investmentId: investmentId,
        type: 'Investment',
        amount: investmentAmount,
        transactionDate: startDate.toISOString(),
        status: 'Completed',
        paymentGateway: 'Internal Balance'
      };

      await update(ref(database), updates);

      toast({
        title: 'نجح الاستثمار!',
        description: `لقد استثمرت بنجاح ${investmentAmount}$ في خطة ${plan.name}.`,
        className: 'bg-green-600 border-green-600 text-white',
      });
      onClose();
    } catch (error) {
      console.error('Investment failed: ', error);
      toast({
        title: 'فشل الاستثمار',
        description: 'حدث خطأ ما. الرجاء المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const userBalance = userProfile?.balance || 0;
  const investmentAmount = parseFloat(amount) || 0;
  const canInvest = userBalance >= investmentAmount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>الاستثمار في {plan.name}</DialogTitle>
          <DialogDescription>
            أدخل المبلغ الذي ترغب في استثماره. رصيدك الحالي هو <span className="font-bold text-primary">${userBalance.toFixed(2)}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">مبلغ الاستثمار (بالدولار الأمريكي)</Label>
            <Input
              id="amount"
              type="number"
              placeholder={`${plan.minDeposit} - ${plan.maxDeposit}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {canInvest ? (
            <Button className="w-full" onClick={handleInvest} disabled={isLoading || !amount}>
              {isLoading ? 'قيد المعالجة...' : 'تأكيد الاستثمار'}
            </Button>
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-sm font-medium text-destructive">رصيدك غير كافٍ لهذا الاستثمار.</p>
              <Button className="w-full" asChild>
                <Link href="/dashboard/wallet">اذهب إلى المحفظة للإيداع</Link>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
