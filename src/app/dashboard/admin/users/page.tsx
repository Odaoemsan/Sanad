'use client';

import { useUser } from "@/firebase";
import { Shield, AlertTriangle, Users, ArrowRight } from 'lucide-react';
import { AdminUsersPage } from "../_components/admin-users-page";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const ADMIN_UID = "eQwg5buDT7b0dtU391R8LZXBtjs1";

export default function AdminUsersMgmtPage() {
    const { user, isUserLoading } = useUser();

    if (isUserLoading) {
        return (
             <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
                <Shield className="w-16 h-16 animate-pulse text-primary mb-4" />
                <p className="text-muted-foreground">جاري التحقق من الصلاحيات...</p>
            </div>
        )
    }

    if (user?.uid !== ADMIN_UID) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold">غير مصرح لك بالدخول</h1>
                <p className="text-muted-foreground mt-2">هذه الصفحة مخصصة للأدمن فقط.</p>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full flex-col">
             <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                 <div className="flex items-center gap-4">
                     <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                        <Link href="/dashboard/admin">
                            <ArrowRight className="h-4 w-4" />
                            <span className="sr-only">العودة إلى لوحة التحكم</span>
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        <Users className="h-8 w-8 text-primary" />
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">إدارة المستخدمين</h1>
                    </div>
                </div>
                <AdminUsersPage />
            </main>
        </div>
    );
}