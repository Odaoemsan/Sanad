'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MountainIcon, User, LogOut } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';


export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();


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
    <header className="bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 md:px-6 flex items-center h-16">
        <Link href="/" className="flex items-center gap-2 mr-6">
          <MountainIcon className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg text-foreground">SNAD</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link
            href="/#plans"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            خطط الاستثمار
          </Link>
          <Link
            href="/#about"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            من نحن
          </Link>
          <Link
            href="/#faq"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            الأسئلة الشائعة
          </Link>
        </nav>
        <div className="flex items-center gap-4 ml-auto">
          {isUserLoading ? (
            <div className="flex gap-2">
                <div className="animate-pulse bg-muted h-9 w-20 rounded-md"></div>
                <div className="animate-pulse bg-muted h-9 w-20 rounded-md"></div>
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="overflow-hidden rounded-full">
                  <Avatar>
                    <AvatarImage src={user?.photoURL || ''} alt="User avatar" />
                    <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.displayName || user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <User className="ml-2 h-4 w-4" />
                    <span>لوحة التحكم</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="ml-2 h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">تسجيل الدخول</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">ابدأ الآن</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
