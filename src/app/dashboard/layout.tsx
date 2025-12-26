'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { DashboardNav, DashboardNavHeader } from '@/components/layout/dashboard-nav';
import { LogOut, MountainIcon } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@/firebase';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { BottomNavBar } from '@/components/layout/bottom-nav-bar';
import { DashboardHeader } from '@/components/layout/dashboard-header';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <MountainIcon className="h-16 w-16 text-primary animate-pulse" />
        <h2 className="mt-4 text-2xl font-bold">أهلاً بك في SNAD</h2>
        <p className="mt-2 text-muted-foreground">لحظات ونكون معك...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar>
        <SidebarHeader>
            <DashboardNavHeader />
        </SidebarHeader>
        <SidebarContent>
          <DashboardNav />
        </SidebarContent>
        <SidebarFooter>
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut size={16} />
            <span className="duration-200 group-data-[collapsible=icon]:hidden">
              تسجيل الخروج
            </span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <div className="flex-grow overflow-y-auto pb-24 md:pb-4">
          {!pathname.startsWith('/dashboard/admin') && <AnnouncementBanner />}
          {children}
        </div>
         <BottomNavBar />
      </div>
    </div>
  );
}
