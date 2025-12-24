'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  Users,
  Wallet,
  Settings,
  MountainIcon,
  Bot,
  Shield,
  Zap,
} from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';

const navItems = [
  { href: '/dashboard', label: 'لوحة القيادة', icon: LayoutDashboard },
  { href: '/dashboard/investments', label: 'استثماراتي', icon: Briefcase },
  { href: '/dashboard/trade', label: 'الربح اليومي', icon: Zap },
  { href: '/dashboard/transactions', label: 'المعاملات', icon: ArrowLeftRight },
  { href: '/dashboard/referrals', label: 'الإحالات', icon: Users },
  { href: '/dashboard/wallet', label: 'المحفظة', icon: Wallet },
  { href: '/dashboard/settings', label: 'الإعدادات', icon: Settings },
];

const adminNavItems = [
  { href: '/dashboard/admin', label: 'لوحة تحكم الأدمن', icon: Shield },
]

// NOTE: This is a simplified way to check for admin. In a real-world scenario,
// you would want to use custom claims or a more secure method.
const ADMIN_UID = "eQwg5buDT7b0dtU391R8LZXBtjs1";

export function DashboardNav() {
  const pathname = usePathname();
  const { user } = useUser();
  
  const itemsToShow = user?.uid === ADMIN_UID ? [...navItems, ...adminNavItems] : navItems;

  return (
    <SidebarMenu>
      {itemsToShow.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href}>
            <SidebarMenuButton
              isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard')}
              tooltip={{ children: item.label, side: 'right' }}
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function DashboardNavHeader() {
    return (
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <MountainIcon className="h-6 w-6 text-primary" />
          <span className="duration-200 group-data-[collapsible=icon]:hidden">SNAD</span>
        </Link>
    )
}
