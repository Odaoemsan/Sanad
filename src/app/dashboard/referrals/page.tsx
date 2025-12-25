'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Users, Activity, Percent, Crown, CheckCircle, Rocket, Star, Medal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useUser, useDatabase, useDatabaseList, useDatabaseObject, useMemoFirebase } from "@/firebase";
import { ref, get, query, orderByChild, equalTo, update } from 'firebase/database';
import type { Referral, UserProfile, Transaction } from "@/lib/placeholder-data";
import { format } from "date-fns";
import { useState, useCallback, useMemo } from "react";
import { Progress } from "@/components/ui/progress";

const RANKS = {
    user: { name: 'عضو', goal: 0, next: 'success-partner' },
    'success-partner': { name: 'شريك نجاح', goal: 5000, next: 'representative' },
    'representative': { name: 'ممثل رسمي', goal: 10000, next: null },
};

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

    const teamTotalDeposit = useMemo(() => {
        if (!user || !referralsData || !allTransactions) return 0;
        
        const userOwnDeposits = allTransactions
            .filter(tx => tx.userProfileId === user.uid && tx.type === 'Deposit' && tx.status === 'Completed')
            .reduce((sum, tx) => sum + tx.amount, 0);

        const l1ReferralIds = new Set(referralsData.map(r => r.referredId));
        const l1Deposits = allTransactions
            .filter(tx => l1ReferralIds.has(tx.userProfileId) && tx.type === 'Deposit' && tx.status === 'Completed')
            .reduce((sum, tx) => sum + tx.amount, 0);
        
        // This is a simplified L1 + own deposit calculation. A full team calculation (L2, L3...)
        // would be more complex and is best handled by Cloud Functions for performance.
        return userOwnDeposits + l1Deposits;
    }, [user, referralsData, allTransactions]);


    const handleCheckRank = async () => {
        if (!user || !database || !userProfileRef || !userProfile) return;
        setIsCheckingRank(true);
        
        await update(userProfileRef, { teamTotalDeposit: teamTotalDeposit });

        const currentRank = userProfile.rank || 'user';
        
        if (currentRank === 'representative') {
             toast({ title: "أنت في أعلى رتبة!", description: "لقد وصلت إلى رتبة ممثل رسمي. استمر في العمل الرائع!", className: "bg-blue-500 text-white" });
        } else if (teamTotalDeposit >= RANKS['representative'].goal) {
            await update(userProfileRef, { rank: 'representative' });
            toast({ title: "🎉 تهانينا! تمت ترقيتك!", description: "لقد أصبحت الآن ممثل رسمي وتحصل على عمولة 5% على الإحالات الجديدة.", className: "bg-green-600 border-green-600 text-white" });
        } else if (teamTotalDeposit >= RANKS['success-partner'].goal) {
            if (currentRank !== 'success-partner') {
                 await update(userProfileRef, { rank: 'success-partner' });
                 toast({ title: "🎉 تهانينا! تمت ترقيتك!", description: "لقد أصبحت الآن شريك نجاح وتحصل على عمولة 3% على الإحالات الجديدة.", className: "bg-green-600 border-green-600 text-white" });
            } else {
                 const remaining = RANKS['representative'].goal - teamTotalDeposit;
                 toast({ title: "أنت بالفعل شريك نجاح!", description: `واصل العمل! يتبقى لك ${remaining.toFixed(2)}$ للوصول إلى رتبة ممثل رسمي.`, variant: "default" });
            }
        } else {
            const remaining = RANKS['success-partner'].goal - teamTotalDeposit;
            toast({ title: "لم تصل إلى الهدف بعد", description: `واصل العمل! يتبقى لك ${remaining.toFixed(2)}$ للوصول إلى رتبة شريك نجاح.`, variant: "destructive" });
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
    
    const currentRankName = RANKS[userProfile?.rank || 'user']?.name || 'عضو';
    const nextRankKey = RANKS[userProfile?.rank || 'user']?.next;
    const nextRankGoal = nextRankKey ? RANKS[nextRankKey as keyof typeof RANKS].goal : RANKS['representative'].goal;

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
                            <CardDescription>قم بترقية حسابك لزيادة أرباحك من الإحالات. رتبتك الحالية: <span className="font-bold text-primary">{currentRankName}</span></CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border rounded-lg bg-muted/30">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <Star className="h-5 w-5 text-yellow-500"/>
                                        رتبة: شريك نجاح
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">عندما يصل إجمالي إيداعاتك أنت وفريقك إلى <span className="font-bold text-primary">${RANKS["success-partner"].goal.toLocaleString()}</span>.</p>
                                    <div className="mt-3 flex items-start gap-2 text-sm">
                                        <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0"/>
                                        <div><span className="font-semibold">عمولة 3%</span> على جميع إيداعات المستوى الأول.</div>
                                    </div>
                                </div>
                                 <div className="p-4 border rounded-lg bg-muted/30">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <Medal className="h-5 w-5 text-blue-500"/>
                                        رتبة: ممثل رسمي
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">عندما يصل إجمالي إيداعاتك أنت وفريقك إلى <span className="font-bold text-primary">${RANKS["representative"].goal.toLocaleString()}</span>.</p>
                                    <div className="mt-3 space-y-2">
                                        <div className="flex items-start gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0"/>
                                            <div><span className="font-semibold">عمولة 5%</span> على جميع إيداعات المستوى الأول.</div>
                                        </div>
                                        <div className="flex items-start gap-2 text-sm">
                                             <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0"/>
                                             شارة التوثيق الخضراء (✅) بجانب اسمك.
                                        </div>
                                    </div>
                                </div>
                            </div>

                             {userProfile?.rank !== 'representative' && (
                               <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium">التقدم نحو الرتبة التالية</span>
                                        <span className="font-bold">${(teamTotalDeposit).toLocaleString()} / ${nextRankGoal.toLocaleString()}</span>
                                    </div>
                                    <Progress value={((teamTotalDeposit) / nextRankGoal) * 100} />
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
                                    <p className="font-bold">المستوى الأول: عمولة تصل إلى 5%</p>
                                    <p className="text-muted-foreground">تعتمد عمولتك على رتبتك: عضو (1.5%)، شريك نجاح (3%)، ممثل رسمي (5%).</p>
                                </div>
                            </div>
                             <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                                 <div className="flex items-center justify-center bg-primary/10 text-primary rounded-full h-10 w-10">
                                    <p className="font-bold text-lg">2</p>
                                </div>
                                <div>
                                    <p className="font-bold">المستوى الثاني: 1% عمولة</p>
                                    <p className="text-muted-foreground">عندما يقوم الشخص الذي دعاه صديقك بالإيداع، ستحصل أنت أيضًا على 1% من مبلغ إيداعه.</p>
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
