'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
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
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Send,
  UserPlus,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts"
import { UserDataProvider, useUserData } from './_components/user-data-provider';
import type { Transaction } from '@/lib/placeholder-data';
import { AdminDataProvider } from './admin/_components/admin-data-provider';
import { SocialProofTicker } from '@/components/social-proof-ticker';


const ADMIN_UID = "eQwg5buDT7b0dtU391R8LZXBtjs1";


const MiniChart = ({ data }: { data: any[] }) => (
    <div className="absolute bottom-0 left-0 right-0 h-1/2 opacity-20">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    fill="url(#chartGradient)"
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
);


function DashboardContent() {
  const { user } = useUser();
  const { 
      userProfile, 
      transactionsData, 
      investmentsData, 
      isLoading 
  } = useUserData();

  const totalInvested = investmentsData?.reduce((sum, investment) => sum + (investment.amount || 0), 0) || 0;
  const totalProfit = transactionsData?.filter(t => t.type === 'Profit' && t.status === 'Completed').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
  const referralEarnings = transactionsData?.filter(t => t.type === 'Referral Bonus' && t.status === 'Completed').reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  const mockChartData = [
      { name: 'Jan', value: 120 },
      { name: 'Feb', value: 150 },
      { name: 'Mar', value: 130 },
      { name: 'Apr', value: 180 },
      { name: 'May', value: 210 },
  ];

  const TransactionIcon = ({ type }: { type: Transaction['type'] }) => {
    switch (type) {
      case 'Deposit':
      case 'Profit':
      case 'Referral Bonus':
      case 'Bounty Reward':
        return <ArrowDownRight className="h-5 w-5 text-green-500" />;
      case 'Withdrawal':
      case 'Investment':
        return <ArrowUpRight className="h-5 w-5 text-red-500" />;
      default:
        return <DollarSign className="h-5 w-5 text-gray-500" />;
    }
  };

  const recentTransactions = transactionsData?.sort((a, b) => (typeof b.transactionDate === 'number' ? b.transactionDate : 0) - (typeof a.transactionDate === 'number' ? a.transactionDate : 0)).slice(0, 5) || [];
  

   if (isLoading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 sm:px-6">
          <Activity className="h-16 w-16 text-primary animate-pulse" />
          <p className="text-muted-foreground">جاري تحميل بيانات لوحة القيادة...</p>
      </main>
    )
  }

  // If user is Admin, redirect them to the admin page
  if (user?.uid === ADMIN_UID) {
    return (
        <AdminDataProvider>
             <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <div className="flex items-center gap-4">
                    <Shield className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">لوحة تحكم الأدمن</h1>
                </div>
                <p className="text-muted-foreground">
                    أهلاً بك في لوحة تحكم الأدمن. يمكنك إدارة المستخدمين والخطط والمعاملات من هنا.
                </p>
                <Button asChild>
                    <Link href="/dashboard/admin">
                        الانتقال إلى لوحة التحكم الكاملة
                        <ArrowLeft className="mr-2 h-4 w-4" />
                    </Link>
                </Button>
            </main>
        </AdminDataProvider>
    );
  }

  // Otherwise, show regular user dashboard
  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:px-6">
      
      {/* Quick Actions Grid */}
      <div className="w-full">
          <h2 className="text-lg font-semibold mb-3">إجراءات سريعة</h2>
            <div className="grid grid-cols-4 gap-3">
              <Button asChild variant="outline" className="flex-col h-20 gap-1 text-sm bg-background/80"><Link href="/dashboard/wallet?tab=deposit"><Plus className="h-5 w-5"/> <span>إيداع</span></Link></Button>
              <Button asChild variant="outline" className="flex-col h-20 gap-1 text-sm bg-background/80"><Link href="/dashboard/wallet?tab=withdraw"><Send className="h-5 w-5"/> <span>سحب</span></Link></Button>
              <Button asChild variant="outline" className="flex-col h-20 gap-1 text-sm bg-background/80"><Link href="/dashboard/referrals"><UserPlus className="h-5 w-5"/> <span>دعوة</span></Link></Button>
              <Button asChild variant="outline" className="flex-col h-20 gap-1 text-sm bg-background/80"><Link href="/#plans"><Briefcase className="h-5 w-5"/> <span>استثمار</span></Link></Button>
          </div>
      </div>

      {/* Total Balance Card */}
      <Card className="card-glass overflow-hidden bg-gradient-to-br from-primary/80 to-blue-700 text-primary-foreground">
          <CardHeader>
              <CardTitle className="text-sm font-medium text-white/80">إجمالي الرصيد</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="text-4xl font-bold">
                  ${userProfile?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
          </CardContent>
          <CardFooter>
                <Button variant="secondary" className="w-full bg-white/20 hover:bg-white/30 text-white" asChild>
                  <Link href="/dashboard/wallet?tab=deposit">
                      إيداع
                  </Link>
              </Button>
          </CardFooter>
      </Card>

      {/* Analytics Grid */}
      <div className="grid grid-cols-2 gap-4">
          <Card className="card-glass relative overflow-hidden">
              <CardHeader className="pb-2">
                  <CardDescription>إجمالي الربح</CardDescription>
                  <CardTitle className="text-2xl">${totalProfit.toFixed(2)}</CardTitle>
              </CardHeader>
              <CardContent className="h-20">
                    <MiniChart data={mockChartData} />
              </CardContent>
          </Card>
            <Card className="card-glass relative overflow-hidden">
              <CardHeader className="pb-2">
                  <CardDescription>إجمالي المستثمر</CardDescription>
                  <CardTitle className="text-2xl">${totalInvested.toFixed(2)}</CardTitle>
              </CardHeader>
              <CardContent className="h-20">
                  <MiniChart data={mockChartData} />
              </CardContent>
          </Card>
      </div>

      {/* Referral Card */}
      <Card className="card-glass">
          <CardHeader>
              <CardTitle>مكافآت الإحالة</CardTitle>
              <CardDescription>
                  اربح ${referralEarnings.toFixed(2)} من دعوة الأصدقاء.
              </CardDescription>
          </CardHeader>
          <CardContent>
                <Button className="w-full" asChild>
                  <Link href="/dashboard/referrals">دعوة</Link>
                </Button>
          </CardContent>
      </Card>

      {/* Recent Transactions */}
      <div className="space-y-4">
          <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">أحدث المعاملات</h2>
              <Link href="/dashboard/transactions" className="text-sm font-medium text-primary">
                  عرض الكل
              </Link>
          </div>
          <div className="space-y-3">
              {recentTransactions.length > 0 ? recentTransactions.map((transaction) => (
                  <Card key={transaction.id} className="card-glass">
                      <CardContent className="p-3 flex items-center gap-4">
                          <div className="p-2 bg-muted/50 rounded-full">
                              <TransactionIcon type={transaction.type} />
                          </div>
                          <div className="flex-1">
                              <p className="font-semibold">{transaction.type}</p>
                              <p className="text-xs text-muted-foreground">{typeof transaction.transactionDate === 'number' ? format(new Date(transaction.transactionDate), 'MMM dd, yyyy') : 'N/A'}</p>
                          </div>
                          <div className={cn(
                              'font-bold text-right',
                              transaction.type === 'Deposit' || transaction.type === 'Profit' || transaction.type === 'Referral Bonus' || transaction.type === 'Bounty Reward' ? 'text-green-500' : 'text-foreground'
                          )}>
                              {transaction.type === 'Deposit' || transaction.type === 'Profit' || transaction.type === 'Referral Bonus' || transaction.type === 'Bounty Reward' ? '+' : '-'}${transaction.amount.toFixed(2)}
                          </div>
                      </CardContent>
                  </Card>
              )) : (
                    <Card className="card-glass">
                        <CardContent className="p-6 text-center text-muted-foreground">
                          لا توجد معاملات بعد.
                      </CardContent>
                    </Card>
              )}
          </div>
      </div>
      
      {/* Social Proof Ticker */}
      <SocialProofTicker />

    </main>
  );
}

export default function DashboardPage() {
    return (
        <UserDataProvider>
            <DashboardContent />
        </UserDataProvider>
    )
}
