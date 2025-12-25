'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/firebase';
import { Home, Briefcase, Wallet, Zap, LogIn, UserPlus, ArrowLeftRight, User, TrendingUp } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';

const loggedInNavItems = [
  { href: '/dashboard', label: 'الرئيسية', icon: Home },
  { href: '/dashboard/investments', label: 'استثماري', icon: Briefcase },
  { href: '/dashboard/markets', label: 'الأسواق', icon: TrendingUp },
  { href: '/dashboard/trade', label: 'الربح اليومي', icon: Zap },
  { href: '/dashboard/settings', label: 'حسابي', icon: User },
];

const loggedOutNavItems = [
      { href: '/', label: 'الرئيسية', icon: Home },
      { href: '/#plans', label: 'الخطط', icon: Briefcase },
      { href: '/login', label: 'دخول', icon: LogIn },
      { href: '/signup', label: 'حساب جديد', icon: UserPlus },
]

export function BottomNavBar() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { user, isUserLoading } = useUser();
  const { setOpenMobile } = useSidebar();
  
  if (!isMobile) {
    return null;
  }

  // Do not show the nav bar on login/signup pages
  if (pathname === '/login' || pathname === '/signup') {
      return null;
  }


  const handleLinkClick = () => {
    setOpenMobile(false);
  }
  
  const items = !isUserLoading && user ? loggedInNavItems : loggedOutNavItems;
  const gridCols = !isUserLoading && user ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-20 bg-background/80 backdrop-blur-lg border-t border-border/10" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className={cn("grid h-full max-w-lg mx-auto font-medium", gridCols)}>
            {items.map((item) => {
              const isActive = (item.href === '/' || item.href === '/dashboard') 
                ? pathname === item.href 
                : pathname.startsWith(item.href) && item.href !== '/';
              
              return (
                 <Link key={item.label} href={item.href} className={cn(
                    "inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800 group",
                     isActive ? "text-primary" : "text-muted-foreground"
                 )} onClick={handleLinkClick}>
                    <item.icon className="w-6 h-6 mb-1 stroke-[2.5]" />
                    <span className="text-xs font-bold">{item.label}</span>
                </Link>
              )
            })}
        </div>
    </div>
  );
}
