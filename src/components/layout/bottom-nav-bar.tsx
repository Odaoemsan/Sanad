'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/firebase';
import { Home, Briefcase, Wallet, Zap } from 'lucide-react';


const navItems = [
  { href: '/dashboard', label: 'الرئيسية', icon: Home },
  { href: '/#plans', label: 'الخطط', icon: Briefcase },
  { href: '/dashboard/trade', label: 'الربح اليومي', icon: Zap },
  { href: '/dashboard/investments', label: 'استثماري', icon: Briefcase },
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
  
  const specialHomeActive = pathname === '/' || pathname === '/dashboard';
  const finalNavItems = user ? navItems : navItems.filter(item => item.href === '/#plans');

  // If user is not logged in and not on plans page, don't show the bar
  if (!isUserLoading && !user && pathname === '/') {
      return (
        <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t">
          <div className="grid h-full max-w-lg grid-cols-1 mx-auto font-medium">
             <Link href="/#plans" className={cn(
                    "inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group",
                     pathname === '/#plans' ? "text-primary" : "text-muted-foreground"
                 )}>
                    <Briefcase className="w-5 h-5 mb-1" />
                    <span className="text-xs">الخطط</span>
                </Link>
          </div>
        </div>
      );
  }

  if (!user) return null;


  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t">
        <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
            {navItems.map((item) => {
              let isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              
              if (item.href === '/dashboard') {
                isActive = specialHomeActive;
              }


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
