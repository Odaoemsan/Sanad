'use client';

import { useState, useEffect } from 'react';
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useDatabase, useUser, useDatabaseObject, useDatabaseList, useMemoFirebase } from '@/firebase';
import { ref, update, push, serverTimestamp, runTransaction } from 'firebase/database';
import { CheckCircle, Loader, Clock, Zap, TrendingUp } from 'lucide-react';
import type { InvestmentPlan, UserProfile, Investment } from '@/lib/placeholder-data';
import { addHours, formatDistanceToNowStrict, isBefore } from 'date-fns';
import { ar } from 'date-fns/locale';

const tradingMessages = [
    { text: "بدء جلسة التداول...", delay: 0 },
    { text: "تحليل مؤشرات السوق...", delay: 2000 },
    { text: "تحديد الفرص المربحة...", delay: 5000 },
    { text: "تنفيذ صفقة شراء...", delay: 8000 },
    { text: "مراقبة تقلبات الأسعار...", delay: 12000 },
    { text: "تنفيذ صفقة بيع...", delay: 15000 },
    { text: "احتساب الأرباح وتأمينها...", delay: 18000 },
];

export default function DailyProfitPage() {
    const { user } = useUser();
    const database = useDatabase();
    const { toast } = useToast();

    type ClaimStatus = 'loading' | 'ready' | 'processing' | 'success' | 'claimed';

    const [claimStatus, setClaimStatus] = useState<ClaimStatus>('loading');
    const [countdown, setCountdown] = useState('');
    const [processingMessage, setProcessingMessage] = useState('');
    const [claimedAmount, setClaimedAmount] = useState(0);

    const userProfileRef = useMemoFirebase(() => {
        if (!database || !user) return null;
        return ref(database, `users/${user.uid}`);
    }, [database, user]);

     const investmentsRef = useMemoFirebase(() => {
        if (!user || !database) return null;
        return ref(database, `users/${user.uid}/investments`);
    }, [user, database]);
    
    const investmentPlansRef = useMemoFirebase(() => database ? ref(database, 'investment_plans') : null, [database]);

    const { data: userProfile, isLoading: isProfileLoading } = useDatabaseObject<UserProfile>(userProfileRef);
    const { data: investments, isLoading: areInvestmentsLoading } = useDatabaseList<Investment>(investmentsRef);
    const { data: investmentPlans, isLoading: arePlansLoading } = useDatabaseList<InvestmentPlan>(investmentPlansRef);

    useEffect(() => {
        let timer: NodeJS.Timeout | undefined;

        if (isProfileLoading || !userProfile) {
            setClaimStatus('loading');
            return;
        }

        if (claimStatus !== 'processing' && claimStatus !== 'success') {
            const now = new Date();
            const lastClaimTimestamp = userProfile?.lastProfitClaim;

            if (typeof lastClaimTimestamp === 'number') {
                const nextPossibleClaimTime = addHours(new Date(lastClaimTimestamp), 24);

                if (isBefore(now, nextPossibleClaimTime)) {
                    setClaimStatus('claimed');
                    // Update countdown immediately and then set interval
                    const updateCountdown = () => {
                         const remaining = formatDistanceToNowStrict(nextPossibleClaimTime, { locale: ar, addSuffix: true });
                         setCountdown(remaining);
                    };
                    updateCountdown();
                    timer = setInterval(updateCountdown, 1000);
                } else {
                    setClaimStatus('ready');
                    if (timer) clearInterval(timer);
                }
            } else {
                 setClaimStatus('ready'); // Can claim if it's null or not a number
                 if (timer) clearInterval(timer);
            }
        }
        
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [userProfile, isProfileLoading, claimStatus]);
    
    const hasActiveInvestments = investments?.some(inv => inv.status === 'active');
    
    const handleClaimProfit = async () => {
        if (!database || !user || !userProfile || !userProfileRef || claimStatus !== 'ready' || !hasActiveInvestments) {
            if (!hasActiveInvestments) {
                 toast({
                    title: "لا توجد استثمارات نشطة",
                    description: "يجب أن يكون لديك استثمار نشط على الأقل لجمع الأرباح.",
                    variant: 'destructive',
                });
            }
            return;
        }

        setClaimStatus('processing');

        const totalDailyProfit = investments?.reduce((acc, investment) => {
            const plan = investmentPlans?.find(p => p.id === investment.investmentPlanId);
            if (plan && investment.status === 'active') {
                return acc + (investment.amount * plan.dailyReturn) / 100;
            }
            return acc;
        }, 0) || 0;
        
        setClaimedAmount(totalDailyProfit);

        if (totalDailyProfit <= 0) {
            toast({
                title: "لا يوجد ربح لجمعه",
                description: "أرباحك اليومية هي 0.00$.",
                variant: 'destructive',
            });
            setClaimStatus('ready');
            return;
        }
        
        tradingMessages.forEach(msg => {
            setTimeout(() => setProcessingMessage(msg.text), msg.delay);
        });

        setTimeout(async () => {
            try {
                const transactionResult = await runTransaction(userProfileRef, (currentData: UserProfile | null) => {
                    if (currentData) {
                        const now = new Date();
                        const lastClaim = currentData.lastProfitClaim;
                        if (typeof lastClaim === 'number') {
                            const nextClaimTime = addHours(new Date(lastClaim), 24);
                            if (isBefore(now, nextClaimTime)) {
                                // Abort transaction by returning undefined. This will cause the promise to reject.
                                return;
                            }
                        }
                        
                        currentData.balance = (currentData.balance || 0) + totalDailyProfit;
                        currentData.lastProfitClaim = serverTimestamp() as any;
                        return currentData;
                    }
                    return currentData; // abort if no data
                });

                if (transactionResult.committed) {
                    const transactionRef = push(ref(database, `transactions`));
                    await set(transactionRef, {
                        id: transactionRef.key,
                        type: 'Profit',
                        amount: totalDailyProfit,
                        transactionDate: new Date().toISOString(),
                        status: 'Completed',
                        userProfileId: user.uid,
                        paymentGateway: 'Daily Profit Claim'
                    });
                    
                    setClaimStatus('success');

                    setTimeout(() => {
                        setClaimStatus('claimed');
                    }, 3000);
                } else {
                     // This case handles when the transaction is aborted because the user has already claimed.
                    toast({ title: 'فشل جمع الربح', description: 'لقد قمت بالفعل بجمع الربح خلال الـ 24 ساعة الماضية.', variant: 'destructive' });
                    setClaimStatus('ready');
                }

            } catch (error: any) {
                console.error("Profit claim failed:", error);
                 // The promise from `runTransaction` rejects if the transaction is aborted by returning undefined.
                 // We can check the error message to see if it was an intentional abort.
                 if (error && error.message && error.message.toLowerCase().includes('transaction was aborted')) {
                     toast({ title: 'فشل جمع الربح', description: 'لقد قمت بالفعل بجمع الربح خلال الـ 24 ساعة الماضية.', variant: 'destructive' });
                 } else {
                    toast({ title: 'خطأ', description: 'فشل جمع الربح اليومي.', variant: 'destructive' });
                 }
                setClaimStatus('ready');
            }
        }, 20000);
    };

    
    const isLoading = !user || !database || areInvestmentsLoading || arePlansLoading || isProfileLoading;

    const renderContent = () => {
        switch (claimStatus) {
            case 'loading':
                return (
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <Loader className="h-16 w-16 animate-spin text-primary" />
                        <p className="text-muted-foreground">جاري تحميل حالة الربح...</p>
                    </div>
                );
            case 'ready':
                return (
                    <div className="flex flex-col items-center justify-center space-y-6 text-center">
                         <Zap className="h-20 w-20 text-primary" />
                         <h3 className="text-2xl font-bold">أرباحك اليومية جاهزة للجمع!</h3>
                         <p className="text-muted-foreground max-w-sm">
                             اضغط على الزر أدناه لبدء عملية التداول اليومي وإضافة أرباحك إلى رصيدك.
                         </p>
                        <Button
                            onClick={handleClaimProfit}
                            disabled={!hasActiveInvestments || isLoading}
                            size="lg"
                            className="w-full max-w-xs"
                        >
                           اجمع أرباح اليوم
                        </Button>
                         {!hasActiveInvestments && !isLoading && (
                             <p className="text-sm text-destructive">ليس لديك استثمارات نشطة لجمع الأرباح.</p>
                         )}
                         {isLoading && <p className="text-sm text-muted-foreground">جاري تحميل بيانات الاستثمار...</p>}
                    </div>
                );
            case 'processing':
                 return (
                    <div className="flex flex-col items-center justify-center space-y-4 text-center">
                        <Loader className="h-16 w-16 animate-spin text-primary" />
                        <h3 className="text-2xl font-bold">عملية التداول جارية...</h3>
                        <p className="text-green-500 font-medium max-w-sm h-5 flex items-center gap-2">
                           <TrendingUp className="h-4 w-4" /> {processingMessage}
                        </p>
                    </div>
                );
            case 'success':
                return (
                    <div className="flex flex-col items-center justify-center space-y-4 text-center animate-in fade-in zoom-in-95">
                        <CheckCircle className="h-20 w-20 text-green-500" />
                        <h3 className="text-2xl font-bold">تمت إضافة الأرباح بنجاح!</h3>
                        <p className="text-2xl font-bold text-green-500">
                           +${claimedAmount.toFixed(2)}
                        </p>
                    </div>
                );
            case 'claimed':
                 return (
                     <div className="flex flex-col items-center justify-center space-y-6 text-center">
                        <CheckCircle className="h-20 w-20 text-green-500" />
                        <h3 className="text-2xl font-bold">لقد جمعت أرباحك لهذا اليوم بنجاح.</h3>
                        <p className="text-muted-foreground max-w-sm">
                            يمكنك جمع أرباحك التالية بعد انتهاء العداد.
                        </p>
                        <div className="flex items-center justify-center gap-2 text-lg text-primary font-bold p-4 bg-muted/50 rounded-lg w-full max-w-xs">
                            <Clock className="h-6 w-6" />
                            <span>
                                {countdown || "جار الحساب..."}
                            </span>
                        </div>
                    </div>
                );
        }
    };


    return (
        <>
            <DashboardHeader pageTitle="الربح اليومي" />
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                <Card className="overflow-hidden">
                    <CardHeader className="bg-muted/30">
                        <CardTitle className="text-2xl">جمع الربح اليومي</CardTitle>
                        <CardDescription>
                            اجمع أرباحك اليومية بناءً على استثماراتك النشطة. هذه العملية متاحة مرة كل 24 ساعة.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center space-y-8 p-6 md:p-10 min-h-[300px]">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center space-y-4">
                                <Loader className="h-16 w-16 animate-spin text-primary" />
                                <p className="text-muted-foreground">جاري تحميل حالة الربح...</p>
                            </div>
                        ) : renderContent()}
                    </CardContent>
                </Card>
            </main>
        </>
    );
}
