'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminData } from "./admin-data-provider";


export function AdminUsersStatsCard() {
    const { allUsers: users, isLoading } = useAdminData();

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-8 w-1/4" />
                ) : (
                    <div className="text-2xl font-bold">{users?.length || 0}</div>
                )}
                 <Button asChild className="w-full mt-4">
                    <Link href="/dashboard/admin/users">
                        إدارة المستخدمين
                        <ArrowLeft className="h-4 w-4 mr-2" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}
