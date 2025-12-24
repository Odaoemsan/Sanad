'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MountainIcon } from 'lucide-react';
import { useUser } from '@/firebase';

export function Header() {
  const { user, isUserLoading } = useUser();

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
            <div className="animate-pulse bg-muted h-9 w-20 rounded-md"></div>
          ) : user ? (
            <Button asChild>
              <Link href="/dashboard">لوحة التحكم</Link>
            </Button>
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
