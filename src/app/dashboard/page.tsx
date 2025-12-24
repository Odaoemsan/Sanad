'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  Users,
  Wallet,
  ArrowLeft,
  Briefcase,
  Activity,
  Copy,
} from 'lucide-react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { cn } from '@/lib/utils';
import { useUser, useDatabase, useDatabaseObject, useDatabaseList, useMemoFirebase } from '@/firebase';
import { ref, query, orderByChild, equalTo } from 'firebase/database';
import type { Transaction, UserProfile, Investment, Referral } from '@/lib/placeholder-data';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

function ReferralCard() {
    const { user } = useUser();
    const { toast } = useToast();
    const database = useDatabase();

    const referralsRef = useMemoFirebase(() => {
        if (!user || !database) return null;
        return ref(database, `users/${user.uid}/referrals`);
    }, [user, database]);
    const { data: referralsData } = useDatabaseList<Referral>(referralsRef);
    
    const referralLink = user ? `${window.location.origin}/signup?ref=${user.uid}` : "";
    
    const totalReferrals = referralsData?.length || 0;
    const totalCommission = referralsData ? referralsData.reduce((sum, ref) => sum + (ref.bonusAmount || 0), 0) : 0;

    const copyToClipboard = () => {
        if (!referralLink) return;
        navigator.clipboard.writeText(referralLink);
        toast({
            title: "تم النسخ إلى الحافظة!",
            description: "تم نسخ رابط الإحالة الخاص بك.",
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>برنامج الإحالة</CardTitle>
                <CardDescription>شارك رابطك واكسب عمولات من استثمارات أصدقائك.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex w-full items-center space-x-2 space-x-reverse">
                    <Input type="text" value={referralLink} readOnly dir="ltr" />
                    <Button type="button" size="icon" onClick={copyToClipboard} disabled={!referralLink}>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
                 <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className="text-sm text-muted-foreground">إجمالي الإحالات</p>
                        <p className="text-xl font-bold">{totalReferrals}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">إجمالي العمولة</p>
                        <p className="text-xl font-bold text-green-500">${totalCommission.toFixed(2)}</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                 <Button asChild size="sm" className="w-full">
                    <Link href="/dashboard/referrals">
                        عرض كل التفاصيل
                        <ArrowLeft className="h-4 w-4 mr-1" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}

export default function DashboardPage() {
  const { user } = useUser();
  const database = useDatabase();

  const userProfileRef = useMemoFirebase(() => {
    if (!database || !user) return null;
    return ref(database, `users/${user.uid}`);
  }, [database, user]);

  const transactionsRef = useMemoFirebase(() => {
    if (!user || !database) return null;
    return query(ref(database, 'transactions'), orderByChild('userProfileId'), equalTo(user.uid));
  }, [user, database]);
  
  const investmentsRef = useMemoFirebase(() => {
    if (!user || !database) return null;
    return ref(database, `users/${user.uid}/investments`);
  }, [user, database]);

  const { data: userProfile, isLoading: isProfileLoading } = useDatabaseObject<UserProfile>(userProfileRef);
  const { data: transactionsData, isLoading: areTransactionsLoading } = useDatabaseList<Transaction>(transactionsRef);
  const { data: investmentsData, isLoading: areInvestmentsLoading } = useDatabaseList<Investment>(investmentsRef);

  const isLoading = !user || !database || isProfileLoading || areTransactionsLoading || areInvestmentsLoading;
  
  const totalInvested = investmentsData?.reduce((sum, investment) => sum + (investment.amount || 0), 0) || 0;
  const totalProfit = transactionsData?.filter(t => t.type === 'Profit' && t.status === 'Completed').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
  const referralEarnings = transactionsData?.filter(t => t.type === 'Referral Bonus' && t.status === 'Completed').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  const kpiData = [
    {
      title: 'إجمالي الرصيد',
      value: `$${userProfile?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
      icon: Wallet,
    },
    {
      title: 'إجمالي الربح',
      value: `$${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
    },
    {
      title: 'إجمالي المستثمر',
      value: `$${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Briefcase,
    },
    {
      title: 'أرباح الإحالة',
      value: `$${referralEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Users,
    },
  ];

  const recentTransactions = transactionsData?.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()).slice(0, 5) || [];
  
   if (isLoading) {
    return (
      <>
        <DashboardHeader pageTitle="لوحة القيادة" />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            <Activity className="h-16 w-16 text-primary animate-pulse" />
            <p className="text-muted-foreground">جاري تحميل بيانات لوحة القيادة...</p>
        </main>
      </>
    )
  }

  return (
    <>
      <DashboardHeader pageTitle="لوحة القيادة" />
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {kpiData.map((kpi) => (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {kpi.title}
                </CardTitle>
                <kpi.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="lg:col-span-5">
                 <Card>
                    <CardHeader className="flex flex-row items-center">
                        <div className="grid gap-2">
                        <CardTitle>أحدث المعاملات</CardTitle>
                        <CardDescription>
                            نظرة سريعة على أحدث أنشطتك المالية.
                        </CardDescription>
                        </div>
                        <Button asChild size="sm" className="mr-auto gap-1">
                        <Link href="/dashboard/transactions">
                            عرض الكل
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>النوع</TableHead>
                            <TableHead>الحالة</TableHead>
                            <TableHead className="text-left">المبلغ</TableHead>
                            <TableHead>التاريخ</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentTransactions.length > 0 ? recentTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell>
                                <div className="font-medium">{transaction.type}</div>
                                </TableCell>
                                <TableCell>
                                <Badge
                                    className={cn("capitalize",
                                    transaction.status === 'Completed' && 'bg-green-500/20 text-green-700 border-green-500/20',
                                    transaction.status === 'Pending' && 'bg-amber-500/20 text-amber-700 border-amber-500/20',
                                    transaction.status === 'Failed' && 'bg-red-500/20 text-red-700 border-red-500/20'
                                    )}
                                >
                                    {transaction.status}
                                </Badge>
                                </TableCell>
                                <TableCell
                                className={cn(
                                    'text-left font-medium',
                                    transaction.type === 'Deposit' || transaction.type === 'Profit' || transaction.type === 'Referral Bonus'
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                )}
                                >
                                {transaction.type === 'Deposit' || transaction.type === 'Profit' || transaction.type === 'Referral Bonus' ? '+' : '-'}${(transaction.amount || 0).toFixed(2)}
                                </TableCell>
                                <TableCell>{transaction.transactionDate ? format(new Date(transaction.transactionDate), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                            </TableRow>
                            )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">لا توجد معاملات بعد.</TableCell>
                            </TableRow>
                            )}
                        </TableBody>
                        </Table>
                    </CardContent>
                    </Card>
            </div>
            <div className="lg:col-span-2">
                <ReferralCard />
            </div>
        </div>
      </main>
    </>
  );
}
