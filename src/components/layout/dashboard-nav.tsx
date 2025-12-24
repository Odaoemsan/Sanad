'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  Users,
  Wallet,
  Settings,
  MountainIcon,
  Shield,
  Zap,
} from 'lucide-react';
import { useUser } from '@/firebase';

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
];

const ADMIN_UID = "eQwg5buDT7b0dtU391R8LZXBtjs1";

export function DashboardNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    setOpenMobile(false);
  };
  
  const itemsToShow = user?.uid === ADMIN_UID ? [...navItems, ...adminNavItems] : navItems;

  return (
    <SidebarMenu>
      {itemsToShow.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} onClick={handleLinkClick}>
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
