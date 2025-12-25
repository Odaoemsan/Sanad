'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react'
import Image from 'next/image'

type CryptoData = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
}

const COIN_IDS = 'bitcoin,ethereum,tether,solana,binancecoin';
const API_URL = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COIN_IDS}`;

export default function MarketsPage() {
  const [data, setData] = useState<CryptoData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);


  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const response = await fetch(API_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('فشل جلب البيانات من API. الرجاء المحاولة مرة أخرى.');
      }
      const result: CryptoData[] = await response.json();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع.');
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(); // Fetch on initial load
    const interval = setInterval(() => fetchData(true), 60000); // Refresh every 60 seconds
    return () => clearInterval(interval); // Cleanup on unmount
  }, [fetchData]);
  
  const { featuredCoin, otherCoins } = useMemo(() => {
    const btc = data.find(c => c.id === 'bitcoin');
    const others = data.filter(c => c.id !== 'bitcoin');
    return { featuredCoin: btc, otherCoins: others };
  }, [data]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <Activity className="h-8 w-8 text-primary" />
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الأسواق</h1>
            </div>
        </div>

      <Card className="card-glass overflow-hidden bg-gradient-to-br from-primary/80 to-blue-700 text-primary-foreground">
        <CardHeader>
           {isLoading || !featuredCoin ? (
                <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-4">
                    <Image src={featuredCoin.image} alt={featuredCoin.name} width={48} height={48} className="rounded-full bg-white/20 p-1" />
                    <div>
                        <CardTitle className="text-2xl">{featuredCoin.name}</CardTitle>
                        <CardDescription className="text-white/80">{featuredCoin.symbol.toUpperCase()}</CardDescription>
                    </div>
                </div>
            )}
        </CardHeader>
        <CardContent>
            {isLoading || !featuredCoin ? (
                <div className="flex justify-between items-end">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-6 w-20" />
                </div>
             ) : (
                <div className="flex justify-between items-end">
                    <div className="text-4xl font-bold">
                    ${featuredCoin.current_price.toLocaleString('en-US')}
                    </div>
                    <div
                    className={cn(
                        'flex items-center gap-1 text-lg font-semibold',
                        featuredCoin.price_change_percentage_24h > 0 ? 'text-green-300' : 'text-red-300'
                    )}
                    >
                    {featuredCoin.price_change_percentage_24h > 0 ? (
                        <TrendingUp className="h-5 w-5" />
                    ) : (
                        <TrendingDown className="h-5 w-5" />
                    )}
                    <span>{featuredCoin.price_change_percentage_24h.toFixed(2)}%</span>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>أسعار العملات</CardTitle>
          <CardDescription>
            نظرة عامة على أسعار أشهر العملات الرقمية في السوق.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العملة</TableHead>
                  <TableHead className="text-left">السعر</TableHead>
                  <TableHead className="text-center">التغير (24س)</TableHead>
                  <TableHead className="text-left hidden sm:table-cell">القيمة السوقية</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    Array.from({length: 4}).map((_, i) => (
                         <TableRow key={i}>
                            <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-20" /><Skeleton className="h-3 w-10" /></div></div></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell className="text-center"><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                            <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-28" /></TableCell>
                        </TableRow>
                    ))
                ) : error ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-destructive">{error}</TableCell></TableRow>
                ) : (
                    otherCoins.map((coin) => (
                    <TableRow key={coin.id}>
                        <TableCell>
                        <div className="flex items-center gap-3">
                            <Image src={coin.image} alt={coin.name} width={40} height={40} className="rounded-full bg-white/20 p-1" />
                            <div>
                            <div className="font-bold">{coin.name}</div>
                            <div className="text-xs text-muted-foreground">{coin.symbol.toUpperCase()}</div>
                            </div>
                        </div>
                        </TableCell>
                        <TableCell className="text-left font-medium">
                        ${coin.current_price.toLocaleString('en-US')}
                        </TableCell>
                        <TableCell
                        className={cn(
                            'text-center font-semibold',
                            coin.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'
                        )}
                        >
                        {coin.price_change_percentage_24h.toFixed(2)}%
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-mono">
                            ${(coin.market_cap / 1_000_000_000).toFixed(2)}B
                        </TableCell>
                    </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
