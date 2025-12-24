'use client';
import { useState } from "react";
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
import { useDatabase, useDatabaseList, useMemoFirebase } from "@/firebase";
import { ref, update } from 'firebase/database';
import type { UserProfile } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { Mail, Edit, Check, X, Zap, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export function AdminUsersPage() {
  const database = useDatabase();
  const auth = useAuth();
  const { toast } = useToast();

  const usersRef = useMemoFirebase(() => database ? ref(database, 'users') : null, [database]);
  const { data: users, isLoading } = useDatabaseList<UserProfile>(usersRef);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState<number>(0);
  const [resetingProfitFor, setResetingProfitFor] = useState<string | null>(null);


  const handleEditBalance = (user: UserProfile) => {
    setEditingUserId(user.id);
    setNewBalance(user.balance);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
  };

  const handleUpdateBalance = async (userId: string) => {
    if (!database) return;
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, { balance: newBalance });
      toast({ title: "تم تحديث الرصيد", description: `تم تحديث رصيد المستخدم بنجاح.` });
      setEditingUserId(null);
    } catch (error) {
      console.error("Error updating balance: ", error);
      toast({ title: "خطأ", description: "فشل تحديث الرصيد.", variant: "destructive" });
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
  
  const pageIsLoading = isLoading || !database;

  return (
    <Card>
      <CardHeader>
        <CardTitle>قائمة المستخدمين ({users?.length || 0})</CardTitle>
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
                <TableHead>الرصيد</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {editingUserId === user.id ? (
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          value={newBalance} 
                          onChange={(e) => setNewBalance(parseFloat(e.target.value))} 
                          className="w-24 h-8"
                        />
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => handleUpdateBalance(user.id)}><Check /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={handleCancelEdit}><X /></Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>${(user.balance || 0).toFixed(2)}</span>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditBalance(user)}><Edit /></Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{user.registrationDate ? format(new Date(user.registrationDate), 'yyyy-MM-dd') : 'N/A'}</TableCell>
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
