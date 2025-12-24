'use client';

import type { InvestmentPlan } from '@/lib/placeholder-data';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { InvestModal } from './invest-modal';
import { useState } from 'react';
import { useUser } from '@/firebase';
import Link from 'next/link';

type InvestmentPlanCardProps = {
  plan: InvestmentPlan;
  hasActiveInvestment?: boolean;
};

export function InvestmentPlanCard({ plan, hasActiveInvestment }: InvestmentPlanCardProps) {
  const { user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const handleChoosePlan = () => {
      if (!user) {
          // You might want to use the router to redirect, but Link is simpler for this case
          // router.push('/login');
          return;
      }
      setIsModalOpen(true);
  }

  return (
    <>
      <Card
        className={cn(
          'flex flex-col transition-all duration-300',
          plan.isPopular ? 'border-primary ring-2 ring-primary shadow-lg' : 'hover:shadow-md hover:-translate-y-1'
        )}
      >
        {plan.isPopular && (
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground font-bold">الأكثر شيوعًا</Badge>
        )}
        <CardHeader className="items-center text-center">
          <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
          <CardDescription>{plan.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center text-center">
          <div className="my-4">
            <span className="text-5xl font-bold">{plan.dailyReturn}%</span>
            <span className="text-muted-foreground text-lg">/ يوميًا</span>
          </div>
          <ul className="space-y-3 text-muted-foreground w-full mb-6">
            <li className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>المدة: {plan.duration} يوم</span>
            </li>
            <li className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>أدنى إيداع: ${plan.minDeposit.toLocaleString()}</span>
            </li>
            <li className="flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>أقصى إيداع: ${plan.maxDeposit.toLocaleString()}</span>
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          {user ? (
             <Button 
                className="w-full" 
                size="lg" 
                variant={plan.isPopular ? 'default' : 'secondary'} 
                onClick={handleChoosePlan}
                disabled={hasActiveInvestment}
                title={hasActiveInvestment ? 'لديك استثمار نشط بالفعل' : `اختر خطة ${plan.name}`}
            >
                {hasActiveInvestment ? 'لديك خطة نشطة' : 'اختر الخطة'} <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          ) : (
             <Button className="w-full" size="lg" variant={plan.isPopular ? 'default' : 'secondary'} asChild>
                <Link href="/login">
                   اختر الخطة <ArrowLeft className="mr-2 h-4 w-4" />
                </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
      {user && (
        <InvestModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            plan={plan}
        />
      )}
    </>
  );
}
