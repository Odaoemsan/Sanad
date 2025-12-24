'use client';

import { useUser } from "@/firebase";
import { Shield, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminUsersTab } from './_components/admin-users-tab';
import { AdminTransactionsTab } from "./_components/admin-transactions-tab";
import { AdminPlansTab } from "./_components/admin-plans-tab";
import { AdminDepositsTab } from "./_components/admin-deposits-tab";
import { AdminSettingsTab } from "./_components/admin-settings-tab";
import { AdminAnnouncementsTab } from "./_components/admin-announcements-tab";

const ADMIN_UID = "eQwg5buDT7b0dtU391R8LZXBtjs1";

export default function AdminPage() {
    const { user, isUserLoading } = useUser();

    if (isUserLoading) {
        return <div className="flex items-center justify-center p-10">جاري التحقق من الصلاحيات...</div>
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
            <header className="sticky top-0 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
                <Shield className="h-6 w-6" />
                <h1 className="text-xl font-semibold">لوحة تحكم الأدمن</h1>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <Tabs defaultValue="users">
                    <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-6">
                        <TabsTrigger value="users">إدارة المستخدمين</TabsTrigger>
                        <TabsTrigger value="deposits">إدارة الإيداعات</TabsTrigger>
                        <TabsTrigger value="withdrawals">إدارة السحوبات</TabsTrigger>
                        <TabsTrigger value="plans">إدارة الخطط</TabsTrigger>
                        <TabsTrigger value="announcements">إدارة الإعلانات</TabsTrigger>
                        <TabsTrigger value="settings">الإعدادات</TabsTrigger>
                    </TabsList>
                    <TabsContent value="users">
                        <AdminUsersTab />
                    </TabsContent>
                     <TabsContent value="deposits">
                        <AdminDepositsTab />
                    </TabsContent>
                    <TabsContent value="withdrawals">
                        <AdminTransactionsTab />
                    </TabsContent>
                    <TabsContent value="plans">
                        <AdminPlansTab />
                    </TabsContent>
                    <TabsContent value="announcements">
                        <AdminAnnouncementsTab />
                    </TabsContent>
                    <TabsContent value="settings">
                        <AdminSettingsTab />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
