'use client';

import { useMemo } from 'react';
import { useAdminData } from './admin-data-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingDown, BarChart2 } from "lucide-react";
import { cn } from '@/lib/utils';

export function AdminAnalyticsCard() {
    const { 
        allTransactions: transactions,
        allUsers: users,
        allPlans: plans,
        isLoading
    } = useAdminData();
    
    const analytics = useMemo(() => {
        if (!transactions || !users || !plans) {
            return { netProfit: 0, dailyOutflow: 0 };
        }

        // 1. Calculate Net Profit
        const totalDeposits = transactions
            .filter(tx => tx.type === 'Deposit' && tx.status === 'Completed')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const totalWithdrawals = transactions
            .filter(tx => tx.type === 'Withdrawal' && tx.status === 'Completed')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        const netProfit = totalDeposits - totalWithdrawals;

        // 2. Calculate Daily Financial Outflow
        const plansMap = new Map(plans.map(p => [p.id, p]));
        
        let dailyOutflow = 0;
        users.forEach(user => {
            if (user.investments) {
                Object.values(user.investments).forEach(investment => {
                    if (investment.status === 'active') {
                        const plan = plansMap.get(investment.investmentPlanId);
                        if (plan) {
                            dailyOutflow += (investment.amount * plan.dailyReturn) / 100;
                        }
                    }
                });
            }
        });


        return { netProfit, dailyOutflow };

    }, [transactions, users, plans]);


    return (
        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <BarChart2 className="h-6 w-6" />
                    الإحصائيات المالية
                </CardTitle>
                <CardDescription>نظرة سريعة على صحة المشروع المالية.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {isLoading ? (
                    <>
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                         <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-8 w-28" />
                        </div>
                    </>
                 ) : (
                    <>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                            <div className="flex items-center gap-3">
                                <div className={cn("flex items-center justify-center h-10 w-10 rounded-full", analytics.netProfit >= 0 ? "bg-green-500/20" : "bg-red-500/20")}>
                                     <DollarSign className={cn("h-5 w-5", analytics.netProfit >= 0 ? "text-green-600" : "text-red-600")} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">صافي الربح</p>
                                    <p className="text-xs">(الإيداعات - السحوبات)</p>
                                </div>
                            </div>
                            <p className={cn("text-2xl font-bold", analytics.netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                                ${analytics.netProfit.toFixed(2)}
                            </p>
                        </div>
                         <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                             <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-500/20">
                                     <TrendingDown className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">التدفق المالي اليومي</p>
                                    <p className="text-xs">(الأرباح المتوقعة للدفع)</p>
                                </div>
                             </div>
                            <p className="text-2xl font-bold text-amber-600">
                                ${analytics.dailyOutflow.toFixed(2)}
                            </p>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
