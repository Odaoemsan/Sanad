'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Users, Activity, Percent, ChevronsRight, Crown, CheckCircle, Rocket } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useUser, useDatabase, useDatabaseList, useDatabaseObject, useMemoFirebase } from "@/firebase";
import { ref, get, query, orderByChild, equalTo, update } from 'firebase/database';
import type { Referral, UserProfile, Transaction } from "@/lib/placeholder-data";
import { format } from "date-fns";
import { useState, useCallback, useMemo } from "react";
import { Progress } from "@/components/ui/progress";

const RANK_GOAL = 10000; // $10,000

export default function ReferralsPage() {
    const { user } = useUser();
    const database = useDatabase();
    const { toast } = useToast();
    const [isCheckingRank, setIsCheckingRank] = useState(false);

    const userProfileRef = useMemoFirebase(() => {
        if (!user || !database) return null;
        return ref(database, `users/${user.uid}`);
    }, [user, database]);

    const referralsRef = useMemoFirebase(() => {
        if (!user || !database) return null;
        return ref(database, `users/${user.uid}/referrals`);
    }, [user, database]);
    
    const transactionsRef = useMemoFirebase(() => {
        if (!database) return null;
        return ref(database, `transactions`);
    }, [database]);

    const { data: userProfile, isLoading: isLoadingProfile } = useDatabaseObject<UserProfile>(userProfileRef);
    const { data: referralsData, isLoading: isLoadingReferrals } = useDatabaseList<Referral>(referralsRef);
    const { data: allTransactions, isLoading: isLoadingTransactions } = useDatabaseList<Transaction>(transactionsRef);
    
    const isLoading = isLoadingProfile || isLoadingReferrals || isLoadingTransactions;

    // Memoize the calculation of team deposit total
    const teamTotalDeposit = useMemo(() => {
        if (!user || !referralsData || !allTransactions) return 0;
        
        // 1. User's own deposits
        const userOwnDeposits = allTransactions
            .filter(tx => tx.userProfileId === user.uid && tx.type === 'Deposit' && tx.status === 'Completed')
            .reduce((sum, tx) => sum + tx.amount, 0);

        // 2. L1 referrals' deposits
        const l1ReferralIds = new Set(referralsData.map(r => r.referredId));
        const l1Deposits = allTransactions
            .filter(tx => l1ReferralIds.has(tx.userProfileId) && tx.type === 'Deposit' && tx.status === 'Completed')
            .reduce((sum, tx) => sum + tx.amount, 0);

        // This is a simplified calculation. A full L2 calculation would require another DB query.
        // For now, we are basing the rank goal on user's own deposits + L1 deposits.
        // A more robust implementation would involve Cloud Functions to keep this value updated.
        return userOwnDeposits + l1Deposits;
    }, [user, referralsData, allTransactions]);


    const handleCheckRank = async () => {
        if (!user || !database || !userProfileRef) return;
        setIsCheckingRank(true);
        
        // Update the calculated value in the database
        await update(userProfileRef, { teamTotalDeposit: teamTotalDeposit });
        
        if (userProfile?.rank === 'representative') {
             toast({ title: "أنت بالفعل ممثل رسمي!", description: "لقد وصلت إلى هذه الرتبة. استمر في العمل الرائع!", className: "bg-blue-500 text-white" });
        } else if (teamTotalDeposit >= RANK_GOAL) {
            await update(userProfileRef, { rank: 'representative' });
            toast({ title: "🎉 تهانينا! تمت ترقيتك!", description: "لقد أصبحت الآن ممثل رسمي وتحصل على عمولة 5% على الإحالات الجديدة.", className: "bg-green-600 border-green-600 text-white" });
        } else {
            const remaining = RANK_GOAL - teamTotalDeposit;
            toast({ title: "لم تصل إلى الهدف بعد", description: `واصل العمل! يتبقى لك ${remaining.toFixed(2)}$ للوصول إلى رتبة ممثل رسمي.`, variant: "destructive" });
        }
        setIsCheckingRank(false);
    };

    const referralCode = userProfile?.referralCode || "جاري التحميل...";

    const copyToClipboard = () => {
        if (!referralCode || referralCode === "جاري التحميل...") return;
        navigator.clipboard.writeText(referralCode);
        toast({
            title: "تم النسخ إلى الحافظة!",
            description: "تم نسخ كود الدعوة الخاص بك.",
        });
    };

    const totalReferrals = referralsData?.length || 0;
    const totalCommission = referralsData ? referralsData.reduce((sum, ref) => sum + (ref.bonusAmount || 0), 0) : 0;
    
    const referralStats = [
        { title: "إجمالي الإحالات", value: totalReferrals, icon: Users },
        { title: "إجمالي العمولة", value: `$${totalCommission.toFixed(2)}`, icon: Users },
    ];
    
    return (
        <>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                {isLoading || !user || !database ? (
                     <div className="flex items-center justify-center p-10">
                        <Activity className="h-10 w-10 animate-pulse text-primary" />
                    </div>
                ) : (
                    <>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Crown className="text-amber-500"/>
                                برنامج الشركاء - رتب وحوافز
                            </CardTitle>
                            <CardDescription>قم بترقية حسابك لزيادة أرباحك من الإحالات. اعمل مع فريقك لتحقيق الأهداف.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 border rounded-lg bg-muted/30">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Rocket className="h-5 w-5 text-primary"/>
                                    رتبة: ممثل رسمي
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">عندما يصل إجمالي إيداعاتك أنت وفريقك (المستوى الأول) إلى <span className="font-bold text-primary">${RANK_GOAL.toLocaleString()}</span>، تتم ترقيتك.</p>
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-start gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0"/>
                                        <div>
                                            <span className="font-semibold">عمولة 5%</span> على جميع إيداعات المستوى الأول التي تتم <span className="underline">بعد</span> حصولك على الرتبة.
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2 text-sm">
                                         <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0"/>
                                         تظهر شارة التوثيق الخضراء (✅) بجانب اسمك كدليل على ثقة المنصة بك.
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium">التقدم نحو الهدف</span>
                                    <span className="font-bold">${(teamTotalDeposit).toLocaleString()} / ${RANK_GOAL.toLocaleString()}</span>
                                </div>
                                <Progress value={((teamTotalDeposit) / RANK_GOAL) * 100} />
                            </div>
                             {userProfile?.rank === 'representative' && (
                                <div className="text-center font-bold text-green-600 bg-green-500/10 p-3 rounded-md">
                                    تهانينا! أنت ممثل رسمي.
                                </div>
                            )}
                             <Button onClick={handleCheckRank} disabled={isCheckingRank} className="w-full">
                                {isCheckingRank ? 'جاري التحقق...' : 'تحقق من الرتبة'}
                            </Button>
                        </CardContent>
                    </Card>

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
                            <CardTitle className="flex items-center gap-2">
                                كود الدعوة الخاص بك
                                {userProfile?.rank === 'representative' && <CheckCircle className="h-5 w-5 text-green-500" title="ممثل رسمي"/>}
                            </CardTitle>
                            <CardDescription>شارك هذا الكود مع أصدقائك واطلب منهم استخدامه عند التسجيل.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex w-full items-center space-x-2 space-x-reverse">
                                <Input type="text" value={referralCode} readOnly className="font-mono text-center tracking-widest text-lg" />
                                <Button type="button" size="icon" onClick={copyToClipboard} disabled={!userProfile?.referralCode}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>سجل الإحالات</CardTitle>
                            <CardDescription>قائمة بالمستخدمين الذين انضموا باستخدام كود الدعوة الخاص بك ومقدار الربح من كل إيداع.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>اسم المستخدم</TableHead>
                                        <TableHead>تاريخ الانضمام</TableHead>
                                        <TableHead>مبلغ الإيداع</TableHead>
                                        <TableHead className="text-left">العمولة المكتسبة</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {referralsData && referralsData.length > 0 ? referralsData.map(ref => (
                                        <TableRow key={ref.id}>
                                            <TableCell className="font-medium">{ref.referredUsername || 'N/A'}</TableCell>
                                            <TableCell>{typeof ref.referralDate === 'number' ? format(new Date(ref.referralDate), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                                            <TableCell>${(ref.depositAmount || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-left text-green-600 font-medium">+${(ref.bonusAmount || 0).toFixed(2)}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
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
