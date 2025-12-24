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
  { href: '/dashboard/admin', label: 'لوحة التحكم', icon: Shield },
  { href: '/dashboard/admin/users', label: 'إدارة المستخدمين', icon: Users },
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
      {itemsToShow.map((item) => {
        // Special case for admin root, should not be active if on a sub-page like /admin/users
        const isAdminRoot = item.href === '/dashboard/admin';
        const isActive = isAdminRoot ? pathname === item.href : pathname.startsWith(item.href);
        
        // Exact match for the main dashboard page
        if (item.href === '/dashboard') {
          const isDashboardActive = pathname === item.href;
           return (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} onClick={handleLinkClick}>
                <SidebarMenuButton
                  isActive={isDashboardActive}
                  tooltip={{ children: item.label, side: 'right' }}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )
        }


        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} onClick={handleLinkClick}>
              <SidebarMenuButton
                isActive={isActive}
                tooltip={{ children: item.label, side: 'right' }}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  );
}

export function DashboardNavHeader() {
    return (
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg p-2">
          <MountainIcon className="h-8 w-8 text-primary" />
          <span className="duration-200 group-data-[collapsible=icon]:hidden">SNAD</span>
        </Link>
    )
}
