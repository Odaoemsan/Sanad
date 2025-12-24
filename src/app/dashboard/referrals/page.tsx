'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Users, Activity, Percent, ChevronsRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useUser, useDatabase, useDatabaseList, useMemoFirebase } from "@/firebase";
import { ref } from 'firebase/database';
import type { Referral } from "@/lib/placeholder-data";
import { format } from "date-fns";

export default function ReferralsPage() {
    const { user } = useUser();
    const database = useDatabase();
    const { toast } = useToast();

    const referralsRef = useMemoFirebase(() => {
        if (!user || !database) return null;
        return ref(database, `users/${user.uid}/referrals`);
    }, [user, database]);

    const { data: referralsData, isLoading } = useDatabaseList<Referral>(referralsRef);

    const referralLink = user ? `${window.location.origin}/signup?ref=${user.uid}` : "";

    const copyToClipboard = () => {
        if (!referralLink) return;
        navigator.clipboard.writeText(referralLink);
        toast({
            title: "تم النسخ إلى الحافظة!",
            description: "تم نسخ رابط الإحالة الخاص بك.",
        });
    };

    const totalReferrals = referralsData?.length || 0;
    const totalCommission = referralsData ? referralsData.reduce((sum, ref) => sum + (ref.bonusAmount || 0), 0) : 0;
    
    const referralStats = [
        { title: "إجمالي الإحالات", value: totalReferrals, icon: Users },
        { title: "إجمالي العمولة", value: `$${totalCommission.toFixed(2)}`, icon: Users },
    ]

    return (
        <>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                {isLoading || !user || !database ? (
                     <div className="flex items-center justify-center p-10">
                        <Activity className="h-10 w-10 animate-pulse text-primary" />
                    </div>
                ) : (
                    <>
                    <div className="grid gap-4 md:grid-cols-2">
                        {referralStats.map(stat => (
                            <Card key={stat.title}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stat.value}</div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>كيف يعمل نظام الإحالة؟</CardTitle>
                            <CardDescription>اكسب عمولات ليس فقط من أصدقائك، ولكن أيضًا من أصدقاء أصدقائك!</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                                <div className="flex items-center justify-center bg-primary/10 text-primary rounded-full h-10 w-10">
                                    <Percent className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-bold">المستوى الأول: 1.5% عمولة</p>
                                    <p className="text-muted-foreground">عندما يقوم صديقك الذي دعوته بالإيداع، ستحصل على 1.5% من مبلغ إيداعه كعمولة فورية.</p>
                                </div>
                            </div>
                             <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                                 <div className="flex items-center justify-center bg-primary/10 text-primary rounded-full h-10 w-10">
                                    <ChevronsRight className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-bold">المستوى الثاني: 1% عمولة</p>
                                    <p className="text-muted-foreground">عندما يقوم الشخص الذي دعاه صديقك بالإيداع، ستحصل أنت أيضًا على 1% من مبلغ إيداعه. أرباح مستمرة!</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>رابط الإحالة الخاص بك</CardTitle>
                            <CardDescription>شارك هذا الرابط مع أصدقائك لكسب عمولات على استثماراتهم.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex w-full items-center space-x-2">
                                <Input type="text" value={referralLink} readOnly />
                                <Button type="button" size="icon" onClick={copyToClipboard} disabled={!referralLink}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>سجل الإحالات</CardTitle>
                            <CardDescription>قائمة بالمستخدمين الذين انضموا باستخدام رابط الإحالة الخاص بك.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>اسم المستخدم</TableHead>
                                        <TableHead>تاريخ الانضمام</TableHead>
                                        <TableHead className="text-left">العمولة المكتسبة</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {referralsData && referralsData.length > 0 ? referralsData.map(ref => (
                                        <TableRow key={ref.id}>
                                            <TableCell className="font-medium">{ref.referredUsername || 'N/A'}</TableCell>
                                            <TableCell>{ref.referralDate ? format(new Date(ref.referralDate), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                            <TableCell className="text-left text-green-600 font-medium">+${(ref.bonusAmount || 0).toFixed(2)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                ليس لديك أي سجل إحالات حتى الآن.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    </>
                )}
            </main>
        </>
    )
}
