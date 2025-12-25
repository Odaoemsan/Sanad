'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Users, Activity, Percent, Crown, CheckCircle, Rocket, Star, Medal } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useUser, useDatabase, useDatabaseList, useDatabaseObject, useMemoFirebase } from "@/firebase";
import { ref, get, query, orderByChild, equalTo, update } from 'firebase/database';
import type { Referral, UserProfile, Transaction, PartnerRank } from "@/lib/placeholder-data";
import { format } from "date-fns";
import { useState, useCallback, useMemo } from "react";
import { Progress } from "@/components/ui/progress";

const BASE_COMMISSION = 1.5;

async function calculateTeamDeposit(database: any, user: any, referrals: Referral[]): Promise<number> {
    if (!user || !referrals || referrals.length === 0) return 0;
    
    const transactionsRef = ref(database, 'transactions');
    let totalDeposit = 0;

    // L1 Deposits
    const l1ReferralIds = referrals.map(r => r.referredId);
    const depositPromises = l1ReferralIds.map(id => 
        get(query(transactionsRef, orderByChild('userProfileId'), equalTo(id)))
    );

    const l1Snapshots = await Promise.all(depositPromises);
    const l1Transactions: Transaction[] = [];
    l1Snapshots.forEach(snapshot => {
        if (snapshot.exists()) {
            Object.values(snapshot.val()).forEach((tx: any) => {
                 if (tx.type === 'Deposit' && tx.status === 'Completed') {
                    l1Transactions.push(tx);
                 }
            });
        }
    });
    totalDeposit += l1Transactions.reduce((sum, tx) => sum + tx.amount, 0);

    // L2 Deposits would require another level of fetching, which can get complex
    // on the client. This is best handled by a server function for accuracy and performance.
    // For now, we stick to L1 for client-side calculation.

    return totalDeposit;
}


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
    
    const ranksRef = useMemoFirebase(() => database ? ref(database, 'partner_ranks') : null, [database]);

    const { data: userProfile, isLoading: isLoadingProfile } = useDatabaseObject<UserProfile>(userProfileRef);
    const { data: referralsData, isLoading: isLoadingReferrals } = useDatabaseList<Referral>(referralsRef);
    const { data: ranksData, isLoading: isLoadingRanks } = useDatabaseList<PartnerRank>(ranksRef);
    
    const isLoading = isLoadingProfile || isLoadingReferrals || isLoadingRanks;

    const sortedRanks = useMemo(() => ranksData?.sort((a, b) => a.goal - b.goal) || [], [ranksData]);

    const handleCheckRank = async () => {
        if (!user || !database || !userProfileRef || !userProfile || !sortedRanks.length || !referralsData) {
            toast({ title: "لا يمكن التحقق الآن", description: "البيانات المطلوبة غير مكتملة.", variant: "destructive" });
            return;
        }
        setIsCheckingRank(true);
        
        try {
            const calculatedTeamDeposit = await calculateTeamDeposit(database, user, referralsData);
            await update(userProfileRef, { teamTotalDeposit: calculatedTeamDeposit });

            const currentRankId = userProfile.rank;
            const highestAchievedRank = sortedRanks.slice().reverse().find(rank => calculatedTeamDeposit >= rank.goal);

            if (highestAchievedRank) {
                if (currentRankId !== highestAchievedRank.id) {
                    await update(userProfileRef, { rank: highestAchievedRank.id });
                    toast({ title: "🎉 تهانينا! تمت ترقيتك!", description: `لقد أصبحت الآن ${highestAchievedRank.name} وتحصل على عمولة ${highestAchievedRank.commission}% على الإحالات الجديدة.`, className: "bg-green-600 border-green-600 text-white" });
                } else {
                    toast({ title: `أنت بالفعل ${highestAchievedRank.name}!`, description: `واصل العمل الرائع! إجمالي إيداعات فريقك هو ${calculatedTeamDeposit.toFixed(2)}$`, variant: "default" });
                }
            } else {
                const nextRank = sortedRanks[0];
                const remaining = nextRank.goal - calculatedTeamDeposit;
                toast({ title: "لم تصل إلى الهدف بعد", description: `واصل العمل! يتبقى لك ${remaining.toFixed(2)}$ للوصول إلى رتبة ${nextRank.name}.`, variant: "destructive" });
            }
        } catch (error) {
            console.error("Rank check failed:", error);
            toast({ title: "خطأ", description: "فشل التحقق من الرتبة. حاول مرة أخرى.", variant: "destructive" });
        } finally {
            setIsCheckingRank(false);
        }
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
    
    const currentRank = sortedRanks.find(r => r.id === userProfile?.rank);
    const currentRankName = currentRank?.name || 'عضو';
    
    const currentRankIndex = sortedRanks.findIndex(r => r.id === currentRank?.id);
    const nextRank = sortedRanks[currentRankIndex + 1];
    const teamTotalDeposit = userProfile?.teamTotalDeposit || 0;

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
                                {sortedRanks.map(rank => (
                                    <div key={rank.id} className="p-4 border rounded-lg bg-muted/30">
                                        <h3 className="font-bold flex items-center gap-2">
                                             {rank.id === 'success-partner' && <Star className="h-5 w-5 text-yellow-500"/>}
                                             {rank.id === 'representative' && <Medal className="h-5 w-5 text-blue-500"/>}
                                            رتبة: {rank.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1">عندما يصل إجمالي إيداعات فريقك إلى <span className="font-bold text-primary">${rank.goal.toLocaleString()}</span>.</p>
                                        <div className="mt-3 flex items-start gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0"/>
                                            <div><span className="font-semibold">عمولة {rank.commission}%</span> على جميع إيداعات المستوى الأول.</div>
                                        </div>
                                         {rank.id === 'representative' && (
                                            <div className="flex items-start gap-2 text-sm mt-2">
                                                 <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0"/>
                                                 شارة التوثيق الخضراء (✅) بجانب اسمك.
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                             {nextRank && (
                               <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium">التقدم نحو رتبة {nextRank.name}</span>
                                        <span className="font-bold">${(teamTotalDeposit).toLocaleString()} / ${nextRank.goal.toLocaleString()}</span>
                                    </div>
                                    <Progress value={((teamTotalDeposit) / nextRank.goal) * 100} />
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
                                    <p className="font-bold">المستوى الأول: عمولة تصل إلى {sortedRanks[sortedRanks.length - 1]?.commission || BASE_COMMISSION}%</p>
                                    <p className="text-muted-foreground">تعتمد عمولتك على رتبتك: عضو ({BASE_COMMISSION}%)، {sortedRanks.map(r => `${r.name} (${r.commission}%)`).join('، ')}.</p>
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
