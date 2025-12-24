'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { InvestmentPlan, Investment } from '@/lib/placeholder-data';
import { InvestmentPlanCard } from '@/components/investment-plan-card';
import { ArrowRight } from 'lucide-react';
import { useDatabase, useDatabaseList, useMemoFirebase, useUser } from '@/firebase';
import { ref } from 'firebase/database';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';


export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-image');
  const database = useDatabase();
  const { user } = useUser();

  const plansRef = useMemoFirebase(() => database ? ref(database, 'investment_plans') : null, [database]);
  const { data: investmentPlans, isLoading: isLoadingPlans } = useDatabaseList<InvestmentPlan>(plansRef);
  
  const investmentsRef = useMemoFirebase(() => {
    if (!user || !database) return null;
    return ref(database, `users/${user.uid}/investments`);
  }, [user, database]);
  const { data: investmentsData, isLoading: isLoadingInvestments } = useDatabaseList<Investment>(investmentsRef);
  
  const hasActiveInvestment = investmentsData?.some(inv => inv.status === 'active');
  const isLoading = isLoadingPlans || (user && isLoadingInvestments);

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <section className="relative w-full py-20 md:py-32 lg:py-40 flex items-center justify-center text-center">
        {heroImage && (
          <Image
            src={heroImage.imageUrl}
            alt={heroImage.description}
            fill
            className="object-cover -z-10"
            data-ai-hint={heroImage.imageHint}
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/50 -z-10" />
        <div className="container px-4 md:px-6 text-white">
          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl font-headline">
              أطلق العنان لإمكانياتك المالية
            </h1>
            <p className="text-lg md:text-xl text-gray-200">
              انضم إلى SNAD وابدأ رحلتك نحو عوائد عالية. خطط استثمار آمنة وشفافة ومربحة مصممة خصيصًا لك.
            </p>
            <div>
              <Button size="lg" asChild className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link href="/dashboard">
                  ابدأ الاستثمار الآن <ArrowRight className="mr-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="plans" className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                خططنا الاستثمارية
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                اختر الخطة التي تناسب أهدافك المالية. تم تصميم كل خطة لتوفير عوائد مثالية مع مخاطر محسوبة.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
             {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader><Skeleton className="h-8 w-3/4 mx-auto" /></CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <Skeleton className="h-12 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                  <CardFooter><Skeleton className="h-12 w-full" /></CardFooter>
                </Card>
              ))
            ) : (
              investmentPlans?.map((plan) => (
                <InvestmentPlanCard key={plan.id} plan={plan} hasActiveInvestment={hasActiveInvestment} />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
