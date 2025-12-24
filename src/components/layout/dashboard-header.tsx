'use client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Settings, LifeBuoy, Bell } from 'lucide-react';
import Link from 'next/link';
import { useAuth, useUser, useDatabase, useDatabaseObject, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { ref } from 'firebase/database';

export function DashboardHeader({ pageTitle }: { pageTitle?: string }) {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const database = useDatabase();

  const telegramLinkRef = useMemoFirebase(() => database ? ref(database, 'settings/telegramLink') : null, [database]);
  const { data: telegramLinkData } = useDatabaseObject<string>(telegramLinkRef as any);

  const telegramLink = typeof telegramLinkData === 'string' ? telegramLinkData : "https://t.me/sy_aron";

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/');
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 sm:px-6 backdrop-blur-lg">
      {/* Profile/Settings Icon */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="overflow-hidden rounded-full h-10 w-10">
            <Avatar>
              <AvatarImage src={user?.photoURL || ''} alt="User avatar" />
              <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>حسابي</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <User className="ml-2 h-4 w-4" />
              <span>الملف الشخصي</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
              <Settings className="ml-2 h-4 w-4" />
              <span>الإعدادات</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={telegramLink} target="_blank" rel="noopener noreferrer">
              <LifeBuoy className="ml-2 h-4 w-4" />
              <span>الدعم</span>
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
            <LogOut className="ml-2 h-4 w-4" />
            <span>تسجيل الخروج</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* App Name or Page Title */}
      <div className="text-xl font-bold text-foreground">
        {pageTitle || "SNAD"}
      </div>

      {/* Notifications Icon */}
      <Button variant="ghost" size="icon">
        <Bell className="h-6 w-6" />
        <span className="sr-only">Notifications</span>
      </Button>
    </header>
  );
}
