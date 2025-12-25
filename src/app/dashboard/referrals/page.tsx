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
import { useState, useCallback } from "react";
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

    const { data: userProfile, isLoading: isLoadingProfile } = useDatabaseObject<UserProfile>(userProfileRef);
    const { data: referralsData, isLoading: isLoadingReferrals } = useDatabaseList<Referral>(referralsRef);

    const isLoading = isLoadingProfile || isLoadingReferrals;
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
    
    const checkAndUpgradeRank = useCallback(async () => {
        if (!database || !user) return;
        setIsCheckingRank(true);

        try {
            // 1. Get L1 referrals
            const l1ReferralsSnap = await get(query(ref(database, 'users'), orderByChild('referrerId'), equalTo(user.uid)));
            if (!l1ReferralsSnap.exists()) {
                toast({ title: "لا يوجد فريق بعد", description: "ليس لديك أي إحالات مباشرة حتى الآن."});
                return;
            }
            const l1Referrals: UserProfile[] = Object.values(l1ReferralsSnap.val());
            const l1Ids = l1Referrals.map(r => r.id);

            // 2. Get L2 referrals
            let l2Ids: string[] = [];
            for (const l1Id of l1Ids) {
                const l2ReferralsSnap = await get(query(ref(database, 'users'), orderByChild('referrerId'), equalTo(l1Id)));
                if (l2ReferralsSnap.exists()) {
                    const l2Referrals: UserProfile[] = Object.values(l2ReferralsSnap.val());
                    l2Ids.push(...l2Referrals.map(r => r.id));
                }
            }
            
            const teamIds = [user.uid, ...l1Ids, ...l2Ids];
            let totalDeposit = 0;

            // 3. Get all transactions and sum deposits
            const transactionsSnap = await get(ref(database, 'transactions'));
            if(transactionsSnap.exists()){
                const allTransactions: Transaction[] = Object.values(transactionsSnap.val());
                totalDeposit = allTransactions
                    .filter(tx => teamIds.includes(tx.userProfileId) && tx.type === 'Deposit' && tx.status === 'Completed')
                    .reduce((sum, tx) => sum + tx.amount, 0);
            }
            
             // 4. Update user rank if goal is met
            const userRef = ref(database, `users/${user.uid}`);
            await update(userRef, { teamTotalDeposit: totalDeposit });

            if (totalDeposit >= RANK_GOAL && userProfile?.rank !== 'representative') {
                await update(userRef, { rank: 'representative' });
                toast({ title: "تهانينا! لقد تمت ترقيتك!", description: "لقد أصبحت الآن 'ممثل رسمي' وستحصل على عمولات أعلى.", className: "bg-green-600 text-white border-green-600" });
            } else if (userProfile?.rank === 'representative') {
                 toast({ title: "أنت بالفعل ممثل رسمي!", description: `إجمالي إيداعات فريقك: $${totalDeposit.toLocaleString()}` });
            } else {
                 toast({ title: "استمر في التقدم!", description: `لقد حقق فريقك $${totalDeposit.toLocaleString()} من أصل $${RANK_GOAL.toLocaleString()}.` });
            }

        } catch (error) {
            console.error("Rank check failed:", error);
            toast({ title: "خطأ", description: "فشل التحقق من الرتبة. حاول مرة أخرى.", variant: "destructive" });
        } finally {
            setIsCheckingRank(false);
        }
    }, [database, user, userProfile]);

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
                                <p className="text-sm text-muted-foreground mt-1">عندما يصل إجمالي إيداعات فريقك (المستوى الأول + الثاني) إلى <span className="font-bold text-primary">${RANK_GOAL.toLocaleString()}</span>، تتم ترقيتك تلقائيًا.</p>
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
                                    <span className="font-bold">${(userProfile?.teamTotalDeposit || 0).toLocaleString()} / ${RANK_GOAL.toLocaleString()}</span>
                                </div>
                                <Progress value={((userProfile?.teamTotalDeposit || 0) / RANK_GOAL) * 100} />
                            </div>

                             <Button onClick={checkAndUpgradeRank} disabled={isCheckingRank} className="w-full">
                                {isCheckingRank ? 'جاري التحقق...' : 'التحقق من أهليتي للترقية'}
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
