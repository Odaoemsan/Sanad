'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/firebase';
import { Home, Briefcase, Wallet, Zap } from 'lucide-react';


const navItems = [
  { href: '/dashboard', label: 'الرئيسية', icon: Home },
  { href: '/dashboard/investments', label: 'استثماري', icon: Briefcase },
  { href: '/dashboard/trade', label: 'الربح اليومي', icon: Zap },
  { href: '/dashboard/wallet', label: 'المحفظة', icon: Wallet },
];

export function BottomNavBar() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { user, isUserLoading } = useUser();

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  if (!isMobile || isAuthPage) {
    return null;
  }
  
  // Special handling for homepage to direct to #plans
  const homeNavItems = [
      { href: '/', label: 'الرئيسية', icon: Home },
      { href: '/#plans', label: 'الخطط', icon: Briefcase },
  ]
  
  if (!isUserLoading && !user) {
      if (pathname === '/') {
        return (
            <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t">
                <div className="grid h-full max-w-lg grid-cols-2 mx-auto font-medium">
                    {homeNavItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.label} href={item.href} className={cn(
                                "inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group",
                                isActive ? "text-primary" : "text-muted-foreground"
                            )}>
                                <item.icon className="w-5 h-5 mb-1" />
                                <span className="text-xs">{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>
        );
      }
      // Don't show the bar on other non-authed pages
      return null;
  }

  if (!user) return null;


  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t">
        <div className="grid h-full max-w-lg grid-cols-4 mx-auto font-medium">
            {navItems.map((item) => {
              // Exact match for dashboard, startsWith for others.
              const isActive = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
              
              return (
                 <Link key={item.label} href={item.href} className={cn(
                    "inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group",
                     isActive ? "text-primary" : "text-muted-foreground"
                 )}>
                    <item.icon className="w-5 h-5 mb-1" />
                    <span className="text-xs">{item.label}</span>
                </Link>
              )
            })}
        </div>
    </div>
  );
}
