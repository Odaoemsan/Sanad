'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser, useDatabase, useDatabaseObject, useDatabaseList, useMemoFirebase } from '@/firebase';
import { ref, update, push, serverTimestamp, runTransaction, set, query, orderByChild, equalTo } from 'firebase/database';
import { CheckCircle, Loader, Clock, Zap, TrendingUp, Gift, Upload, Link as LinkIcon, AlertCircle } from 'lucide-react';
import type { InvestmentPlan, UserProfile, Investment, Bounty, BountySubmission } from '@/lib/placeholder-data';
import { addHours, formatDistanceToNowStrict, isBefore, format, isPast, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';


const tradingMessages = [
    { text: "بدء جلسة التداول...", delay: 0 },
    { text: "تحليل مؤشرات السوق...", delay: 2000 },
    { text: "تحديد الفرص المربحة...", delay: 5000 },
    { text: "تنفيذ صفقة شراء...", delay: 8000 },
    { text: "مراقبة تقلبات الأسعار...", delay: 12000 },
    { text: "تنفيذ صفقة بيع...", delay: 15000 },
    { text: "احتساب الأرباح وتأمينها...", delay: 18000 },
];

function DailyProfitClaim() {
    const { user } = useUser();
    const database = useDatabase();
    const { toast } = useToast();

    type ClaimStatus = 'loading' | 'ready' | 'processing' | 'success' | 'claimed';

    const [claimStatus, setClaimStatus] = useState<ClaimStatus>('loading');
    const [countdown, setCountdown] = useState('');
    const [processingMessage, setProcessingMessage] = useState('');
    const [claimedAmount, setClaimedAmount] = useState(0);

    const userProfileRef = useMemoFirebase(() => (database && user) ? ref(database, `users/${user.uid}`) : null, [database, user]);
    const investmentsRef = useMemoFirebase(() => (user && database) ? ref(database, `users/${user.uid}/investments`) : null, [user, database]);
    const investmentPlansRef = useMemoFirebase(() => database ? ref(database, 'investment_plans') : null, [database]);

    const { data: userProfile, isLoading: isProfileLoading } = useDatabaseObject<UserProfile>(userProfileRef);
    const { data: investments, isLoading: areInvestmentsLoading } = useDatabaseList<Investment>(investmentsRef);
    const { data: investmentPlans, isLoading: arePlansLoading } = useDatabaseList<InvestmentPlan>(investmentPlansRef);
    
    const isLoading = isProfileLoading || areInvestmentsLoading || arePlansLoading;

    useEffect(() => {
        let timer: NodeJS.Timeout | undefined;
        if (isLoading) {
            setClaimStatus('loading');
            return;
        }

        if (claimStatus !== 'processing' && claimStatus !== 'success') {
            const now = new Date();
            const lastClaimTimestamp = userProfile?.lastProfitClaim;

            if (typeof lastClaimTimestamp === 'number') {
                const nextPossibleClaimTime = addHours(new Date(lastClaimTimestamp), 24);
                if (isBefore(now, nextPossibleClaimTime)) {
                    setClaimStatus('claimed');
                    const updateCountdown = () => setCountdown(formatDistanceToNowStrict(nextPossibleClaimTime, { locale: ar, addSuffix: true }));
                    updateCountdown();
                    timer = setInterval(updateCountdown, 1000);
                } else {
                    setClaimStatus('ready');
                }
            } else {
                 setClaimStatus('ready');
            }
        }
        return () => { if (timer) clearInterval(timer); };
    }, [userProfile, isLoading, claimStatus]);

    const hasActiveInvestments = investments?.some(inv => inv.status === 'active');
    
    const handleClaimProfit = async () => {
        if (!database || !user || !userProfile || !userProfileRef || !hasActiveInvestments) {
            toast({ title: "لا توجد استثمارات نشطة", variant: 'destructive' });
            return;
        }
        setClaimStatus('processing');

        const totalDailyProfit = investments?.reduce((acc, investment) => {
            const plan = investmentPlans?.find(p => p.id === investment.investmentPlanId);
            return (plan && investment.status === 'active') ? acc + (investment.amount * plan.dailyReturn) / 100 : acc;
        }, 0) || 0;
        setClaimedAmount(totalDailyProfit);

        if (totalDailyProfit <= 0) {
            toast({ title: "لا يوجد ربح لجمعه", variant: 'destructive' });
            setClaimStatus('ready');
            return;
        }
        
        tradingMessages.forEach(msg => setTimeout(() => setProcessingMessage(msg.text), msg.delay));

        setTimeout(async () => {
            try {
                const transactionResult = await runTransaction(userProfileRef, (currentData: UserProfile | null) => {
                    if (currentData) {
                        const now = new Date();
                        const lastClaim = currentData.lastProfitClaim;
                        if (typeof lastClaim === 'number' && isBefore(now, addHours(new Date(lastClaim), 24))) return;
                        currentData.balance = (currentData.balance || 0) + totalDailyProfit;
                        currentData.lastProfitClaim = serverTimestamp() as any;
                        return currentData;
                    }
                    return currentData;
                });

                if (transactionResult.committed) {
                    const transactionRef = push(ref(database, `transactions`));
                    await set(transactionRef, {
                        id: transactionRef.key, type: 'Profit', amount: totalDailyProfit,
                        transactionDate: serverTimestamp(), status: 'Completed', userProfileId: user.uid
                    });
                    setClaimStatus('success');
                    setTimeout(() => setClaimStatus('claimed'), 3000);
                } else {
                    toast({ title: 'فشل جمع الربح', description: 'لقد قمت بالفعل بجمع الربح خلال الـ 24 ساعة الماضية.', variant: 'destructive' });
                    setClaimStatus('ready');
                }
            } catch (error: any) {
                toast({ title: 'خطأ', description: 'فشل جمع الربح اليومي.', variant: 'destructive' });
                setClaimStatus('ready');
            }
        }, 20000);
    };

    
    const renderContent = () => {
        if (claimStatus === 'loading' || isLoading) return <div className="flex flex-col items-center justify-center space-y-4"><Loader className="h-16 w-16 animate-spin text-primary" /><p className="text-muted-foreground">جاري تحميل حالة الربح...</p></div>
        switch (claimStatus) {
            case 'ready': return <div className="flex flex-col items-center justify-center space-y-6 text-center"><Zap className="h-20 w-20 text-primary" /><h3 className="text-2xl font-bold">أرباحك اليومية جاهزة للجمع!</h3><p className="text-muted-foreground max-w-sm">اضغط على الزر أدناه لبدء عملية التداول اليومي وإضافة أرباحك إلى رصيدك.</p><Button onClick={handleClaimProfit} disabled={!hasActiveInvestments} size="lg" className="w-full max-w-xs">اجمع أرباح اليوم</Button>{!hasActiveInvestments && <p className="text-sm text-destructive">ليس لديك استثمارات نشطة لجمع الأرباح.</p>}</div>;
            case 'processing': return <div className="flex flex-col items-center justify-center space-y-4 text-center"><Loader className="h-16 w-16 animate-spin text-primary" /><h3 className="text-2xl font-bold">عملية التداول جارية...</h3><p className="text-green-500 font-medium max-w-sm h-5 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> {processingMessage}</p></div>;
            case 'success': return <div className="flex flex-col items-center justify-center space-y-4 text-center animate-in fade-in zoom-in-95"><CheckCircle className="h-20 w-20 text-green-500" /><h3 className="text-2xl font-bold">تمت إضافة الأرباح بنجاح!</h3><p className="text-2xl font-bold text-green-500">+${claimedAmount.toFixed(2)}</p></div>;
            case 'claimed': return <div className="flex flex-col items-center justify-center space-y-6 text-center"><CheckCircle className="h-20 w-20 text-green-500" /><h3 className="text-2xl font-bold">لقد جمعت أرباحك لهذا اليوم.</h3><p className="text-muted-foreground max-w-sm">يمكنك الجمع مرة أخرى بعد انتهاء العداد.</p><div className="flex items-center justify-center gap-2 text-lg text-primary font-bold p-4 bg-muted/50 rounded-lg w-full max-w-xs"><Clock className="h-6 w-6" /><span>{countdown || "..."}</span></div></div>;
            default: return <div className="flex flex-col items-center justify-center space-y-4"><Loader className="h-16 w-16 animate-spin text-primary" /><p className="text-muted-foreground">جاري تحميل...</p></div>;
        }
    };
    return <Card className="overflow-hidden"><CardHeader className="bg-muted/30"><CardTitle className="text-2xl">جمع الربح اليومي</CardTitle><CardDescription>اجمع أرباحك اليومية بناءً على استثماراتك النشطة. هذه العملية متاحة مرة كل 24 ساعة.</CardDescription></CardHeader><CardContent className="flex flex-col items-center justify-center p-6 md:p-10 min-h-[350px]">{renderContent()}</CardContent></Card>
}

function BountySystem() {
    const { user } = useUser();
    const database = useDatabase();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [submissionData, setSubmissionData] = useState('');
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

    const bountiesRef = useMemoFirebase(() => database ? query(ref(database, 'bounties'), orderByChild('isActive'), equalTo(true)) : null, [database]);
    const submissionsRef = useMemoFirebase(() => (database && user) ? query(ref(database, 'bounty_submissions'), orderByChild('userId'), equalTo(user.uid)) : null, [database]);

    const { data: bounties, isLoading: isLoadingBounties } = useDatabaseList<Bounty>(bountiesRef);
    const { data: userSubmissions, isLoading: isLoadingSubmissions } = useDatabaseList<BountySubmission>(submissionsRef);
    
    const submittedBountyIds = useMemo(() => new Set(userSubmissions?.map(s => s.bountyId)), [userSubmissions]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast({ title: 'ملف غير صالح', variant: 'destructive'}); return; }
        if (file.size > 2 * 1024 * 1024) { toast({ title: 'الملف كبير جدًا (الحد الأقصى 2MB)', variant: 'destructive'}); return; }
        setProofFile(file);
    };

    const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    const handleSubmit = async (bounty: Bounty) => {
        if (!user || !database) return;
        
        let finalSubmissionData = submissionData;
        if (bounty.submissionType === 'image') {
            if (!proofFile) { toast({ title: "الرجاء اختيار صورة", variant: "destructive" }); return; }
            finalSubmissionData = await fileToBase64(proofFile);
        } else {
            if (!submissionData) { toast({ title: "الرجاء إدخال الرابط", variant: "destructive" }); return; }
        }

        setIsSubmitting(bounty.id);
        try {
            const newSubmissionRef = push(ref(database, 'bounty_submissions'));
            await set(newSubmissionRef, {
                id: newSubmissionRef.key,
                bountyId: bounty.id,
                bountyTitle: bounty.title,
                userId: user.uid,
                status: 'Pending',
                submissionData: finalSubmissionData,
                submittedAt: serverTimestamp(),
            });
            toast({ title: 'تم إرسال المهمة بنجاح', description: 'سيتم مراجعتها من قبل الإدارة.' });
            setSubmissionData('');
            setProofFile(null);
        } catch (error) {
            toast({ title: 'فشل إرسال المهمة', variant: 'destructive' });
        } finally {
            setIsSubmitting(null);
        }
    };
    
    const isLoading = isLoadingBounties || isLoadingSubmissions;
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Gift /> نظام المهام</CardTitle>
                    <CardDescription>أكمل المهام التالية واحصل على مكافآت تضاف مباشرة إلى رصيدك.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {isLoading && <p>جاري تحميل المهام...</p>}
                     {!isLoading && bounties?.length === 0 && <p className="text-muted-foreground text-center p-4">لا توجد مهام متاحة حاليًا.</p>}

                     {bounties?.map(bounty => {
                         const hasSubmitted = submittedBountyIds.has(bounty.id);
                         const bountyCreatedAt = typeof bounty.createdAt === 'number' ? bounty.createdAt : (bounty.createdAt ? parseISO(bounty.createdAt).getTime() : Date.now());
                         const isExpired = bounty.durationHours ? isPast(addHours(bountyCreatedAt, bounty.durationHours)) : false;
                         const canSubmit = !hasSubmitted && !isExpired;

                         return (
                            <Card key={bounty.id} className="bg-muted/30">
                                <CardHeader>
                                    <CardTitle className="text-lg flex justify-between items-center">
                                        <span>{bounty.title}</span>
                                        <Badge variant="secondary" className="bg-green-500/20 text-green-700">${bounty.reward}</Badge>
                                    </CardTitle>
                                    <CardDescription>{bounty.description}</CardDescription>
                                </CardHeader>
                                {canSubmit && (
                                    <CardFooter className="flex-col items-start gap-2">
                                        <Label htmlFor={`submission-${bounty.id}`}>
                                            {bounty.submissionType === 'link' ? 'أدخل الرابط هنا' : 'ارفع صورة الإثبات'}
                                        </Label>
                                        {bounty.submissionType === 'link' ? (
                                            <Input id={`submission-${bounty.id}`} value={submissionData} onChange={(e) => setSubmissionData(e.target.value)} placeholder="https://..." />
                                        ) : (
                                            <>
                                            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full justify-start gap-2">
                                                <Upload className="h-4 w-4"/>
                                                {proofFile ? `تم اختيار: ${proofFile.name}` : 'اختر صورة الإثبات'}
                                            </Button>
                                            <Input id="proof-file" type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                                            </>
                                        )}
                                        <Button onClick={() => handleSubmit(bounty)} disabled={isSubmitting === bounty.id} className="w-full mt-2">
                                            {isSubmitting === bounty.id ? 'جارٍ الإرسال...' : 'إرسال للمراجعة'}
                                        </Button>
                                    </CardFooter>
                                )}
                                {hasSubmitted && (
                                    <CardFooter>
                                         <p className="text-sm text-green-600 font-medium w-full text-center">لقد قمت بتنفيذ هذه المهمة من قبل.</p>
                                    </CardFooter>
                                )}
                                {isExpired && !hasSubmitted && (
                                     <CardFooter>
                                         <p className="text-sm text-destructive font-medium w-full text-center">انتهت صلاحية هذه المهمة.</p>
                                    </CardFooter>
                                )}
                            </Card>
                         )
                     })}
                </CardContent>
            </Card>

            {userSubmissions && userSubmissions.length > 0 && (
                 <Card>
                    <CardHeader><CardTitle>سجل مهامي</CardTitle></CardHeader>
                    <CardContent>
                         {userSubmissions.sort((a,b) => (typeof b.submittedAt === 'number' ? b.submittedAt : 0) - (typeof a.submittedAt === 'number' ? a.submittedAt : 0)).map(sub => (
                            <div key={sub.id} className="flex justify-between items-center p-2 border-b">
                                <div>
                                    <p className="font-semibold">{sub.bountyTitle}</p>
                                    <p className="text-xs text-muted-foreground">{typeof sub.submittedAt === 'number' ? format(new Date(sub.submittedAt), 'yyyy-MM-dd') : 'قيد التحديد'}</p>
                                </div>
                                <Badge variant={sub.status === 'Approved' ? 'default' : sub.status === 'Rejected' ? 'destructive' : 'secondary'}
                                className={cn(sub.status === 'Approved' && 'bg-green-500/20 text-green-700', sub.status === 'Rejected' && 'bg-red-500/20 text-red-700')}>
                                    {sub.status}
                                </Badge>
                            </div>
                         ))}
                    </CardContent>
                </Card>
            )}

        </div>
    )
}


export default function DailyProfitPage() {
    return (
        <main className="flex flex-1 flex-col gap-8 p-4 sm:px-6 sm:py-0 md:gap-8">
            <DailyProfitClaim />
            <Separator />
            <BountySystem />
        </main>
    );
}
