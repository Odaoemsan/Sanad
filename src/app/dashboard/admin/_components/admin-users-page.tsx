'use client';
import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDatabase } from "@/firebase";
import { ref, update, get, query, orderByChild, equalTo } from 'firebase/database';
import type { UserProfile, Investment } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { Mail, Edit, Check, X, Zap, Activity, Ban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAdminData } from "./admin-data-provider";

export function AdminUsersPage() {
  const database = useDatabase();
  const auth = useAuth();
  const { toast } = useToast();
  
  const { allUsers: users, isLoading } = useAdminData();

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ balance: number; claims: number }>({ balance: 0, claims: 0 });
  const [resetingProfitFor, setResetingProfitFor] = useState<string | null>(null);
  const [cancellingInvestmentFor, setCancellingInvestmentFor] = useState<string | null>(null);

  const sortedUsers = useMemo(() => {
    if (!users) return [];
    // Sort users by registrationDate in descending order (newest first)
    return [...users].sort((a, b) => {
        const dateA = typeof a.registrationDate === 'number' ? a.registrationDate : 0;
        const dateB = typeof b.registrationDate === 'number' ? b.registrationDate : 0;
        return dateB - dateA;
    });
  }, [users]);


  const handleEdit = (user: UserProfile) => {
    setEditingUserId(user.id);
    setEditValues({
        balance: user.balance || 0,
        claims: user.dailyProfitClaims || 0
    });
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
  };

  const handleUpdateUser = async (userId: string) => {
    if (!database) return;
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, { 
          balance: editValues.balance,
          dailyProfitClaims: editValues.claims
      });
      toast({ title: "تم تحديث المستخدم", description: `تم تحديث بيانات المستخدم بنجاح.` });
      setEditingUserId(null);
    } catch (error) {
      console.error("Error updating user: ", error);
      toast({ title: "خطأ", description: "فشل تحديث المستخدم.", variant: "destructive" });
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    if (!auth) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "تم إرسال البريد الإلكتروني",
        description: `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email}.`,
      });
    } catch (error) {
      console.error("Error sending password reset email: ", error);
      toast({
        title: "خطأ",
        description: "فشل إرسال البريد الإلكتروني.",
        variant: "destructive",
      });
    }
  };

  const handleResetDailyProfit = async (userId: string) => {
    if (!database) return;
    setResetingProfitFor(userId);
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, { lastProfitClaim: null });
      toast({
        title: "تم إعادة تفعيل الربح اليومي",
        description: "يمكن للمستخدم الآن المطالبة بالربح اليومي مرة أخرى."
      });
    } catch (error) {
      console.error("Error resetting daily profit: ", error);
      toast({
        title: "خطأ",
        description: "فشل إعادة تفعيل الربح اليومي.",
        variant: "destructive",
      });
    } finally {
        setResetingProfitFor(null);
    }
  };
  
    const handleCancelInvestment = async (userId: string) => {
        if (!database) return;
        setCancellingInvestmentFor(userId);
        try {
            const investmentsRef = ref(database, `users/${userId}/investments`);
            const q = query(investmentsRef, orderByChild('status'), equalTo('active'));
            const snapshot = await get(q);

            if (!snapshot.exists()) {
                toast({ title: "لا يوجد استثمار", description: "هذا المستخدم ليس لديه استثمار نشط لإلغائه.", variant: "destructive" });
                return;
            }
            
            const updates: { [key: string]: any } = {};
            let investmentToCancel: Investment | null = null;
            let investmentId = '';
            
            snapshot.forEach(childSnapshot => {
                investmentId = childSnapshot.key!;
                investmentToCancel = childSnapshot.val();
            });

            if (!investmentToCancel || !investmentId) throw new Error('Failed to retrieve active investment.');

            const userRef = ref(database, `users/${userId}`);
            const userSnap = await get(userRef);
            if (!userSnap.exists()) throw new Error('User not found');
            const userProfile = userSnap.val();

            // Prepare updates
            updates[`users/${userId}/investments/${investmentId}/status`] = 'cancelled';
            updates[`users/${userId}/balance`] = (userProfile.balance || 0) + investmentToCancel.amount;

            await update(ref(database), updates);

            toast({ title: "تم إلغاء الاستثمار", description: `تمت إعادة مبلغ ${investmentToCancel.amount}$ إلى رصيد المستخدم.`});

        } catch (error) {
             console.error("Error cancelling investment: ", error);
             toast({ title: "خطأ", description: "فشل إلغاء الاستثمار.", variant: "destructive" });
        } finally {
            setCancellingInvestmentFor(null);
        }
    }
  
  const pageIsLoading = isLoading || !database;

  return (
    <Card>
      <CardHeader>
        <CardTitle>قائمة المستخدمين ({sortedUsers?.length || 0})</CardTitle>
        <CardDescription>عرض وتعديل بيانات المستخدمين.</CardDescription>
      </CardHeader>
      <CardContent>
        {pageIsLoading ? (
          <div className="flex items-center justify-center p-10">
              <Activity className="h-10 w-10 animate-pulse text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم المستخدم</TableHead>
                <TableHead>البريد الإلكتروني</TableHead>
                <TableHead>الرصيد / أيام الربح</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {editingUserId === user.id ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                           <Input 
                            type="number" 
                            value={String(editValues.balance)} 
                            onChange={(e) => setEditValues(v => ({ ...v, balance: parseFloat(e.target.value) || 0 }))} 
                            className="w-24 h-8"
                           />
                           <span className="text-xs text-muted-foreground">الرصيد</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <Input 
                            type="number" 
                            value={String(editValues.claims)} 
                            onChange={(e) => setEditValues(v => ({ ...v, claims: parseInt(e.target.value) || 0 }))} 
                            className="w-24 h-8"
                           />
                            <span className="text-xs text-muted-foreground">الأيام</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => handleUpdateUser(user.id)}><Check /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={handleCancelEdit}><X /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <div className="flex flex-col">
                            <span className="font-semibold">${(user.balance || 0).toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">{user.dailyProfitClaims || 0} أيام</span>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => handleEdit(user)}><Edit /></Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{typeof user.registrationDate === 'number' ? format(new Date(user.registrationDate), 'yyyy-MM-dd HH:mm') : 'N/A'}</TableCell>
                  <TableCell className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendPasswordReset(user.email)}
                    >
                      <Mail className="ml-2 h-4 w-4" />
                      إعادة تعيين
                    </Button>
                     <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleResetDailyProfit(user.id)}
                      disabled={resetingProfitFor === user.id}
                    >
                      <Zap className="ml-2 h-4 w-4" />
                       {resetingProfitFor === user.id ? 'جارٍ...' : 'تفعيل الربح'}
                    </Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                            variant="destructive"
                            size="sm"
                            disabled={cancellingInvestmentFor === user.id}
                            >
                                <Ban className="ml-2 h-4 w-4" />
                                {cancellingInvestmentFor === user.id ? 'جارٍ...' : 'إلغاء الاستثمار'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                سيؤدي هذا إلى إلغاء الاستثمار النشط للمستخدم "{user.username}" وإعادة مبلغ الاستثمار الأصلي إلى رصيده. لا يمكن التراجع عن هذا الإجراء.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>تراجع</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancelInvestment(user.id)}>
                                نعم، قم بالإلغاء
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
