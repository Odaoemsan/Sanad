'use client'

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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Activity, Bitcoin } from 'lucide-react'
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts"

const marketData = [
  {
    name: 'Bitcoin',
    symbol: 'BTC',
    price: 61345.78,
    change: -1.25,
    marketCap: 1.21, // In Trillions
    logo: 'btc',
    chartData: [
      { value: 62000 },
      { value: 61800 },
      { value: 62100 },
      { value: 61500 },
      { value: 61345 },
    ]
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    price: 2988.45,
    change: 2.33,
    marketCap: 358.9, // In Billions
    logo: 'eth',
     chartData: [
      { value: 2900 },
      { value: 2950 },
      { value: 2930 },
      { value: 3000 },
      { value: 2988 },
    ]
  },
  {
    name: 'Tether',
    symbol: 'USDT',
    price: 1.0,
    change: 0.01,
    marketCap: 112.5, // In Billions
    logo: 'usdt',
     chartData: [
      { value: 1.00 },
      { value: 1.001 },
      { value: 0.999 },
      { value: 1.00 },
      { value: 1.00 },
    ]
  },
  {
    name: 'BNB',
    symbol: 'BNB',
    price: 571.12,
    change: 0.55,
    marketCap: 84.2, // In Billions
    logo: 'bnb',
     chartData: [
      { value: 560 },
      { value: 565 },
      { value: 575 },
      { value: 570 },
      { value: 571 },
    ]
  },
  {
    name: 'Solana',
    symbol: 'SOL',
    price: 144.59,
    change: -3.1,
    marketCap: 66.7, // In Billions
    logo: 'sol',
     chartData: [
      { value: 150 },
      { value: 148 },
      { value: 145 },
      { value: 146 },
      { value: 144 },
    ]
  },
]

const MiniChart = ({ data, color }: { data: any[]; color: string }) => (
    <div className="h-10 w-24">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
);


const CryptoIcon = ({ symbol }: { symbol: string }) => {
    return (
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-lg">
            {symbol.charAt(0)}
        </div>
    )
}

export default function MarketsPage() {
  const featuredCoin = marketData[0];
  const otherCoins = marketData.slice(1);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="flex items-center gap-4">
            <Activity className="h-8 w-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">الأسواق</h1>
        </div>

      <Card className="card-glass overflow-hidden bg-gradient-to-br from-primary/80 to-blue-700 text-primary-foreground">
        <CardHeader>
          <div className="flex items-center gap-4">
            <CryptoIcon symbol={featuredCoin.symbol} />
            <div>
              <CardTitle className="text-2xl">{featuredCoin.name}</CardTitle>
              <CardDescription className="text-white/80">{featuredCoin.symbol}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-end">
            <div className="text-4xl font-bold">
              ${featuredCoin.price.toLocaleString('en-US')}
            </div>
            <div
              className={cn(
                'flex items-center gap-1 text-lg font-semibold',
                featuredCoin.change > 0 ? 'text-green-300' : 'text-red-300'
              )}
            >
              {featuredCoin.change > 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              <span>{featuredCoin.change.toFixed(2)}%</span>
            </div>
          </div>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العملة</TableHead>
                <TableHead className="text-center">آخر سعر</TableHead>
                <TableHead className="text-center">التغير (24 ساعة)</TableHead>
                <TableHead className="text-left">مخطط (24 ساعة)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {otherCoins.map((coin) => (
                <TableRow key={coin.symbol}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <CryptoIcon symbol={coin.symbol} />
                      <div>
                        <div className="font-bold">{coin.name}</div>
                        <div className="text-xs text-muted-foreground">{coin.symbol}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    ${coin.price.toLocaleString('en-US')}
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-center font-semibold',
                      coin.change >= 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {coin.change.toFixed(2)}%
                  </TableCell>
                   <TableCell className="text-left">
                     <MiniChart data={coin.chartData} color={coin.change >= 0 ? '#16a34a' : '#dc2626'} />
                   </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  )
}
