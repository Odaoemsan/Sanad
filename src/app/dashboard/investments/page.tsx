'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Calendar, Clock, DollarSign, TrendingUp, Briefcase, Ban, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser, useDatabase, useDatabaseList, useMemoFirebase } from "@/firebase";
import { ref, update, get, serverTimestamp } from "firebase/database";
import { differenceInDays, format, isAfter, parseISO, addHours, differenceInHours, isPast } from "date-fns";
import type { InvestmentPlan, UserProfile } from "@/lib/placeholder-data";
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type Investment = {
    id: string;
    investmentPlanId: string;
    amount: number;
    startDate: string; // ISO string
    endDate: string; // ISO string
    status: 'active' | 'completed' | 'cancelled';
}

function InvestmentCalculator({ investment, plans }: { investment: Investment, plans: InvestmentPlan[] | null }) {
    const plan = plans?.find(p => p.id === investment.investmentPlanId);
    if (!plan) return null;

    const startDate = parseISO(investment.startDate);
    const endDate = parseISO(investment.endDate);
    const today = new Date();

    const totalDuration = differenceInDays(endDate, startDate);
    const daysPassed = differenceInDays(today, startDate);
    const progress = totalDuration > 0 ? Math.max(0, Math.min(100, (daysPassed / totalDuration) * 100)) : 0;

    const dailyProfit = (investment.amount * plan.dailyReturn) / 100;
    const totalProfit = dailyProfit * Math.min(daysPassed, totalDuration); // Only calculate profit for the duration of the plan
    
    const canCancel = isAfter(new Date(), addHours(startDate, 24));
    const isCompleted = isPast(endDate);

    return {
        ...investment,
        planName: plan.name,
        startDateFormatted: format(startDate, 'yyyy-MM-dd'),
        endDateFormatted: format(endDate, 'yyyy-MM-dd'),
        progress,
        dailyProfit,
        totalProfit,
        canCancel,
        isCompleted
    };
}


export default function InvestmentsPage() {
    const { user } = useUser();
    const database = useDatabase();
    const { toast } = useToast();
    const [isCancelling, setIsCancelling] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);

    const investmentsRef = useMemoFirebase(() => {
        if (!user || !database) return null;
        return ref(database, `users/${user.uid}/investments`);
    }, [user, database]);

    const plansRef = useMemoFirebase(() => database ? ref(database, 'investment_plans') : null, [database]);

    const { data: investmentsData, isLoading: isLoadingInvestments } = useDatabaseList<Investment>(investmentsRef);
    const { data: plansData, isLoading: isLoadingPlans } = useDatabaseList<InvestmentPlan>(plansRef);

    const activeInvestment = investmentsData
        ?.filter(inv => inv.status === 'active')
        .map(inv => InvestmentCalculator({ investment: inv, plans: plansData }))
        .find(Boolean);

    // Effect to auto-complete investment when its end date is reached
    useEffect(() => {
        const handleAutoCompletion = async () => {
             if (activeInvestment && activeInvestment.isCompleted && !isCompleting) {
                setIsCompleting(true);
                 if (!user || !database) return;
                 try {
                     const userRef = ref(database, `users/${user.uid}`);
                    const userSnap = await get(userRef);
                    if (!userSnap.exists()) throw new Error("User not found.");

                    const updates: { [key: string]: any } = {};
                    const currentUser = userSnap.val();
                    const refundedBalance = (currentUser.balance || 0) + activeInvestment.amount;

                    updates[`/users/${user.uid}/balance`] = refundedBalance;
                    updates[`/users/${user.uid}/investments/${activeInvestment.id}/status`] = 'completed';
                    
                    await update(ref(database), updates);

                     toast({
                        title: "اكتمل استثمارك!",
                        description: `تمت إعادة مبلغ الاستثمار ${activeInvestment.amount}$ إلى رصيدك.`,
                        className: "bg-green-600 border-green-600 text-white"
                    });
                 } catch (error) {
                     console.error("Auto-completion failed:", error);
                     toast({ title: 'فشل إكمال الاستثمار', description: 'حدث خطأ ما أثناء إكمال الاستثمار.', variant: 'destructive' });
                 } finally {
                     setIsCompleting(false);
                 }
            }
        }
        handleAutoCompletion();

    }, [activeInvestment, user, database, toast, isCompleting]);

    const isLoading = !user || !database || isLoadingInvestments || isLoadingPlans;
    
    const handleCancelInvestment = async () => {
        if (!user || !database || !activeInvestment || !activeInvestment.canCancel) return;
        setIsCancelling(true);

        try {
            const userRef = ref(database, `users/${user.uid}`);
            const userSnap = await get(userRef);
            if (!userSnap.exists()) throw new Error("User not found.");

            const updates: { [key: string]: any } = {};
            const currentUser = userSnap.val();
            const refundedBalance = (currentUser.balance || 0) + activeInvestment.amount;

            updates[`/users/${user.uid}/balance`] = refundedBalance;
            updates[`/users/${user.uid}/investments/${activeInvestment.id}/status`] = 'cancelled';
            
            await update(ref(database), updates);
            
            toast({
                title: "تم إلغاء الاستثمار",
                description: `تمت إعادة مبلغ ${activeInvestment.amount}$ إلى رصيدك.`,
                className: "bg-green-600 border-green-600 text-white"
            });

        } catch (error) {
            console.error("Cancellation failed:", error);
            toast({ title: 'فشل الإلغاء', description: 'حدث خطأ ما أثناء إلغاء الاستثمار.', variant: 'destructive' });
        } finally {
            setIsCancelling(false);
        }
    }

    if (isLoading) {
        return (
             <>
                <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                    <Briefcase className="h-16 w-16 text-primary animate-pulse" />
                    <p className="text-muted-foreground">جاري تحميل استثماراتك...</p>
                </main>
            </>
        )
    }

    return (
        <>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                {activeInvestment ? (
                    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 max-w-4xl mx-auto">
                        <Card key={activeInvestment.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>{activeInvestment.planName}</span>
                                    <span className="text-2xl font-bold text-primary">${activeInvestment.amount.toLocaleString()}</span>
                                </CardTitle>
                                <CardDescription>تفاصيل استثمارك النشط</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-1 text-sm text-muted-foreground">
                                        <span>التقدم</span>
                                        <span>{Math.round(activeInvestment.progress)}%</span>
                                    </div>
                                    <Progress value={activeInvestment.progress} />
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-start gap-2">
                                        <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                        <div>
                                            <p className="text-muted-foreground">تاريخ البدء</p>
                                            <p className="font-medium">{activeInvestment.startDateFormatted}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                        <div>
                                            <p className="text-muted-foreground">تاريخ الانتهاء</p>
                                            <p className="font-medium">{activeInvestment.endDateFormatted}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                        <div>
                                            <p className="text-muted-foreground">الربح اليومي المتوقع</p>
                                            <p className="font-medium text-green-600">+${activeInvestment.dailyProfit.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <TrendingUp className="h-4 w-4 mt-0.5 text-muted-foreground" />
                                        <div>
                                            <p className="text-muted-foreground">إجمالي الربح حتى الآن</p>
                                            <p className="font-medium text-green-600">+${activeInvestment.totalProfit.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col sm:flex-row gap-2">
                                <Button variant="outline" className="w-full" asChild>
                                    <Link href="/dashboard/transactions">
                                        عرض سجل المعاملات <ArrowLeft className="mr-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            {/* The button is wrapped in a span to allow the tooltip to show even when disabled */}
                                            <span tabIndex={0}> 
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" className="w-full" disabled={!activeInvestment.canCancel || isCancelling || activeInvestment.isCompleted}>
                                                            <Ban className="ml-2 h-4 w-4" />
                                                            إلغاء الاستثمار
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            سيؤدي هذا الإجراء إلى إلغاء استثمارك النشط وإعادة مبلغ الاستثمار الأصلي ({`$${activeInvestment.amount}`}) إلى رصيدك. لن تتمكن من التراجع عن هذا الإجراء.
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel>تراجع</AlertDialogCancel>
                                                        <AlertDialogAction onClick={handleCancelInvestment} disabled={isCancelling}>
                                                            {isCancelling ? 'جار الإلغاء...' : 'نعم، قم بالإلغاء'}
                                                        </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </span>
                                        </TooltipTrigger>
                                         {!activeInvestment.canCancel && !activeInvestment.isCompleted && (
                                            <TooltipContent>
                                                <p>يمكنك إلغاء الاستثمار بعد مرور 24 ساعة من بدايته.</p>
                                            </TooltipContent>
                                        )}
                                        {activeInvestment.isCompleted && (
                                            <TooltipContent>
                                                <p>لا يمكن إلغاء استثمار مكتمل.</p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                            </CardFooter>
                        </Card>
                    </div>
                ) : (
                    <Card className="text-center py-10">
                        <CardHeader>
                            <CardTitle>لا توجد استثمارات نشطة</CardTitle>
                            <CardDescription>لم تستثمر في أي خطة بعد، أو أن استثمارك السابق قد انتهى.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild>
                                <Link href="/#plans">
                                    استكشف خطط الاستثمار
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </main>
        </>
    )
}
