'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Wallet, CreditCard, Copy } from "lucide-react";
import { useState, Suspense } from "react";
import { useUser, useDatabase, useDatabaseObject, useMemoFirebase, useAuth, useDatabaseList } from '@/firebase';
import { ref, push, set, runTransaction as runDBTransaction, serverTimestamp } from 'firebase/database';
import type { UserProfile, Investment } from "@/lib/placeholder-data";
import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "next/navigation";

const MIN_WITHDRAWAL_AMOUNT = 50;

function DepositForm() {
    const { user } = useUser();
    const database = useDatabase();
    const { toast } = useToast();

    const [amount, setAmount] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const depositAddressRef = useMemoFirebase(() => database ? ref(database, 'settings/depositAddress') : null, [database]);
    const { data: depositAddress, isLoading: isLoadingAddress } = useDatabaseObject<string>(depositAddressRef);

    const copyToClipboard = () => {
        if (depositAddress) {
            navigator.clipboard.writeText(depositAddress);
            toast({ title: 'تم نسخ العنوان!' });
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !database || !transactionId || !amount) {
            toast({ title: "بيانات ناقصة", description: "الرجاء ملء جميع الحقول.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const depositAmount = parseFloat(amount);
            if (isNaN(depositAmount) || depositAmount <= 0) {
                toast({ title: "مبلغ غير صالح", description: "الرجاء إدخال مبلغ إيداع صحيح.", variant: "destructive" });
                setIsSubmitting(false);
                return;
            }

            const newTransactionRef = push(ref(database, 'transactions'));
            await set(newTransactionRef, {
                id: newTransactionRef.key,
                userProfileId: user.uid,
                type: 'Deposit',
                amount: depositAmount,
                status: 'Pending',
                transactionDate: serverTimestamp(),
                paymentGateway: 'USDT_TRC20_Manual',
                transactionId: transactionId,
            });

            toast({
                title: 'تم إرسال طلب الإيداع',
                description: 'طلبك قيد المراجعة الآن وسيتم معالجته قريبًا.',
                className: "bg-green-600 border-green-600 text-white"
            });
            
            setAmount('');
            setTransactionId('');

        } catch (error) {
            console.error('Deposit submission failed:', error);
            toast({ title: 'فشل إرسال الطلب', description: 'حدث خطأ ما، يرجى المحاولة مرة أخرى.', variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Label>عنوان الإيداع (USDT TRC20)</Label>
                 <div className="flex w-full items-center space-x-2 space-x-reverse">
                    <Input
                        value={isLoadingAddress ? "جاري التحميل..." : (depositAddress || "لم يتم تعيين عنوان بعد.")}
                        readOnly
                        className="font-mono text-center text-sm"
                    />
                    <Button type="button" size="icon" variant="outline" onClick={copyToClipboard} disabled={isLoadingAddress || !depositAddress}>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>
                 <p className="text-xs text-muted-foreground">أرسل المبلغ الذي تريد إيداعه إلى هذا العنوان ثم املأ النموذج أدناه.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid gap-2">
                    <Label htmlFor="deposit-amount">المبلغ الذي قمت بإيداعه (بالدولار الأمريكي)</Label>
                    <Input 
                        id="deposit-amount" 
                        type="number" 
                        placeholder="أدخل المبلغ" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)} 
                        required
                        min="1"
                    />
                </div>
                
                <div className="grid gap-2">
                    <Label htmlFor="transaction-id">معرف المعاملة (TxID)</Label>
                    <Input 
                        id="transaction-id" 
                        type="text" 
                        placeholder="أدخل معرف المعاملة هنا" 
                        value={transactionId} 
                        onChange={(e) => setTransactionId(e.target.value)} 
                        required
                    />
                     <p className="text-xs text-muted-foreground">يرجى لصق معرّف المعاملة (TxID) من منصة الإرسال.</p>
                </div>
                
                <Button type="submit" className="w-full" disabled={isSubmitting || !amount || !transactionId}>
                    {isSubmitting ? 'جارٍ إرسال الطلب...' : 'تأكيد الإيداع'}
                </Button>
            </form>
        </div>
    )
}

function WithdrawForm() {
    const { user } = useUser();
    const auth = useAuth();
    const database = useDatabase();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const userProfileRef = useMemoFirebase(() => {
        if (!database || !user) return null;
        return ref(database, `users/${user.uid}`);
    }, [database, user]);

    const { data: userProfile } = useDatabaseObject<UserProfile>(userProfileRef);

    
    const handleWithdraw = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !auth || !user.email || isSubmitting || !database) return;

        const form = e.currentTarget;
        const formData = new FormData(form);
        const amount = parseFloat(formData.get('withdraw-amount') as string);
        const address = formData.get('withdraw-address') as string;
        const password = formData.get('password') as string;

        if (isNaN(amount) || amount < MIN_WITHDRAWAL_AMOUNT) {
            toast({ title: "مبلغ غير صالح", description: `الحد الأدنى للسحب هو ${MIN_WITHDRAWAL_AMOUNT}$ دولار.`, variant: "destructive" });
            return;
        }

        if (!address.trim()) {
            toast({ title: "العنوان مطلوب", description: "الرجاء إدخال عنوان محفظة USDT (BEP20) الخاصة بك.", variant: "destructive" });
            return;
        }
        
        if (!password) {
            toast({ title: "كلمة المرور مطلوبة", description: "الرجاء إدخال كلمة مرور حسابك لتأكيد السحب.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);

        try {
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);

            const userRef = ref(database, `users/${user.uid}`);
            
            await runDBTransaction(userRef, (currentData: UserProfile | null) => {
                if (!currentData) throw new Error("User profile not found.");
                if ((currentData.balance || 0) < amount) throw new Error("رصيد غير كافٍ");
                currentData.balance = (currentData.balance || 0) - amount;
                return currentData;
            });
            
            const newTransactionRef = push(ref(database, 'transactions'));
            await set(newTransactionRef, {
                id: newTransactionRef.key,
                userProfileId: user.uid,
                type: 'Withdrawal',
                amount: amount,
                transactionDate: serverTimestamp(),
                status: 'Pending',
                paymentGateway: 'USDT_BEP20',
                withdrawAddress: address.trim()
            });


            toast({
                title: "تم تقديم طلب السحب",
                description: "طلب السحب الخاص بك قيد المراجعة الآن. ستتم معالجته في غضون 24 ساعة.",
                 className: "bg-green-600 border-green-600 text-white"
            });
            form.reset();

        } catch(error: any) {
             console.error("Withdraw request failed:", error);
             if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                 toast({ title: "كلمة المرور غير صحيحة", description: "الرجاء التحقق من كلمة المرور والمحاولة مرة أخرى.", variant: "destructive" });
             } else if (error.message === "رصيد غير كافٍ") {
                toast({ title: "رصيد غير كافٍ", description: "لا يمكنك سحب أكثر من رصيدك المتاح.", variant: "destructive" });
             } else {
                toast({ title: "فشل تقديم الطلب", description: "حدث خطأ ما. الرجاء المحاولة مرة أخرى.", variant: "destructive" });
             }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
         <form onSubmit={handleWithdraw} className="space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="withdraw-amount">المبلغ (بالدولار الأمريكي)</Label>
                <Input id="withdraw-amount" name="withdraw-amount" type="number" placeholder={`المتاح للسحب: $${(userProfile?.balance || 0).toFixed(2)} | الحد الأدنى: ${MIN_WITHDRAWAL_AMOUNT}$`} required min={MIN_WITHDRAWAL_AMOUNT}/>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="withdraw-address">عنوان السحب الخاص بك (USDT - BEP20)</Label>
                <Input id="withdraw-address" name="withdraw-address" placeholder="أدخل عنوان محفظتك هنا" required />
                <p className="text-xs text-muted-foreground">يرجى التحقق من العنوان مرة أخرى. المعاملات لا يمكن عكسها.</p>
            </div>
             <div className="grid gap-2">
                <Label htmlFor="password">كلمة مرور الحساب</Label>
                <Input id="password" name="password" type="password" placeholder="أدخل كلمة المرور لتأكيد السحب" required />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                 {isSubmitting ? 'جارٍ إرسال الطلب...' : 'طلب سحب'}
            </Button>
        </form>
    )
}

function WalletPageContent() {
    const { user } = useUser();
    const database = useDatabase();
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');

    const userProfileRef = useMemoFirebase(() => {
        if (!database || !user) return null;
        return ref(database, `users/${user.uid}`);
    }, [database, user]);
    
    const investmentsRef = useMemoFirebase(() => {
        if (!user || !database) return null;
        return ref(database, `users/${user.uid}/investments`);
    }, [user, database]);

    const { data: userProfile, isLoading: isProfileLoading } = useDatabaseObject<UserProfile>(userProfileRef);
    const { data: investmentsData, isLoading: areInvestmentsLoading } = useDatabaseList<Investment>(investmentsRef);

    const totalInvested = investmentsData?.reduce((sum, investment) => sum + investment.amount, 0) || 0;
    const totalBalance = userProfile?.balance || 0;
    const availableForWithdrawal = totalBalance;

    const isLoading = !user || !database || isProfileLoading || areInvestmentsLoading;
    const defaultTab = tab === 'withdraw' ? 'withdraw' : 'deposit';

    return (
        <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Tabs defaultValue={defaultTab}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="deposit">إيداع</TabsTrigger>
                            <TabsTrigger value="withdraw">سحب</TabsTrigger>
                        </TabsList>
                        <TabsContent value="deposit">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CreditCard />
                                        إيداع يدوي
                                    </CardTitle>
                                    <CardDescription>أضف أموالاً إلى حسابك لبدء الاستثمار. تتم مراجعة الإيداعات يدويًا.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <DepositForm />
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="withdraw">
                            <Card>
                                <CardHeader>
                                    <CardTitle>سحب الأموال</CardTitle>
                                    <CardDescription>حوّل أرباحك إلى محفظتك الشخصية. تتم معالجة عمليات السحب يدويًا للأمان.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <WithdrawForm />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
                 <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>ملخص الرصيد</CardTitle>
                            <CardDescription>رصيد حسابك الحالي.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-8 w-full" />
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-6 w-2/3" />
                                </div>
                            ) : (
                            <>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-muted-foreground">إجمالي الرصيد</span>
                                    <span className="text-2xl font-bold">${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-muted-foreground">متاح للسحب</span>
                                    <span className="text-lg font-medium text-green-600">${availableForWithdrawal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-muted-foreground">مستثمر حاليًا</span>
                                    <span className="text-lg font-medium">${totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    )
}

export default function WalletPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WalletPageContent />
        </Suspense>
    )
}
