'use client';

import { useUser } from "@/firebase";
import { Shield, AlertTriangle } from 'lucide-react';
import { AdminDepositsCard } from "./_components/admin-deposits-card";
import { AdminWithdrawalsCard } from "./_components/admin-withdrawals-card";
import { AdminPlansCard } from "./_components/admin-plans-card";
import { AdminAnnouncementsCard } from "./_components/admin-announcements-card";
import { AdminSettingsCard } from "./_components/admin-settings-card";
import { AdminUsersStatsCard } from "./_components/admin-users-stats-card";
import { AdminAnalyticsCard } from "./_components/admin-analytics-card";
import { AdminBountyCard } from "./_components/admin-bounty-card";
import { AdminSubmissionsCard } from "./_components/admin-submissions-card";
import { AdminDataProvider } from "./_components/admin-data-provider";

const ADMIN_UID = "eQwg5buDT7b0dtU391R8LZXBtjs1";


function AdminDashboard() {
    return (
        <div className="flex min-h-screen w-full flex-col">
            <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <div className="flex items-center gap-4">
                    <Shield className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">لوحة تحكم الأدمن</h1>
                </div>
                
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main column for actions */}
                    <div className="lg:col-span-2 grid auto-rows-max gap-6">
                        <AdminAnalyticsCard />
                        <AdminDepositsCard />
                        <AdminWithdrawalsCard />
                        <AdminSubmissionsCard />
                    </div>
                    
                    {/* Sidebar for other settings */}
                    <div className="lg:col-span-1 grid auto-rows-max gap-6">
                        <AdminUsersStatsCard />
                        <AdminPlansCard />
                        <AdminAnnouncementsCard />
                        <AdminSettingsCard />
                        <AdminBountyCard />
                    </div>
                </div>

            </main>
        </div>
    )
}

export default function AdminPage() {
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
        <AdminDataProvider>
            <AdminDashboard />
        </AdminDataProvider>
    );
}
