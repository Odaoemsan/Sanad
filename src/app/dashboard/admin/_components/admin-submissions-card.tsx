'use client';

import { useMemo } from 'react';
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
import { ref, update, get, push } from 'firebase/database';
import type { BountySubmission, Bounty, UserProfile } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Check, X, Eye, Activity, Inbox, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';


export function AdminSubmissionsCard() {
  const database = useDatabase();
  const { toast } = useToast();
  
  const submissionsRef = useMemoFirebase(() => database ? ref(database, 'bounty_submissions') : null, [database]);

  const { data: submissions, isLoading, error } = useDatabaseList<BountySubmission>(submissionsRef);
  
  const pendingSubmissions = useMemo(() => {
      return submissions?.filter(s => s.status === 'Pending') || [];
  }, [submissions]);

  const handleSubmission = async (submission: BountySubmission, newStatus: 'Approved' | 'Rejected') => {
    if (!database) return;

    try {
        const updates: { [key: string]: any } = {};
        updates[`bounty_submissions/${submission.id}/status`] = newStatus;

        if (newStatus === 'Approved') {
            const bountyRef = ref(database, `bounties/${submission.bountyId}`);
            const bountySnap = await get(bountyRef);
            if (!bountySnap.exists()) throw new Error("Bounty not found");
            const bounty: Bounty = bountySnap.val();

            const userRef = ref(database, `users/${submission.userId}`);
            const userSnap = await get(userRef);
            if (!userSnap.exists()) throw new Error("User not found");
            const userProfile: UserProfile = userSnap.val();

            // 1. Add reward to user's balance
            updates[`users/${submission.userId}/balance`] = (userProfile.balance || 0) + bounty.reward;

            // 2. Create a transaction for the reward
            const transactionRef = push(ref(database, 'transactions'));
            updates[`transactions/${transactionRef.key}`] = {
                id: transactionRef.key,
                userProfileId: submission.userId,
                type: 'Bounty Reward',
                amount: bounty.reward,
                status: 'Completed',
                transactionDate: new Date().toISOString(),
                notes: `Reward for completing bounty: ${submission.bountyTitle}`
            };
        }
        
        await update(ref(database), updates);

        toast({
            title: "تم تحديث المهمة",
            description: `تم تحديث حالة المهمة إلى ${newStatus}.`
        });

    } catch (error: any) {
        console.error("Error handling submission:", error);
        toast({ title: "خطأ", description: error.message || "فشل تحديث المهمة.", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>مراجعة المهام ({pendingSubmissions.length})</CardTitle>
        <CardDescription>مراجعة و قبول/رفض تقديمات المهام من المستخدمين.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
           <div className="flex items-center justify-center p-10">
              <Activity className="h-10 w-10 animate-pulse text-primary" />
          </div>
        ) : error ? (
          <p className="text-destructive text-center">حدث خطأ أثناء تحميل التقديمات.</p>
        ) : pendingSubmissions.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>المهمة</TableHead>
                  <TableHead>الإثبات</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingSubmissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium text-xs">{sub.userEmail}</TableCell>
                    <TableCell className="font-medium text-xs">{sub.bountyTitle}</TableCell>
                    <TableCell>
                      <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                           <a href={sub.submissionData} target="_blank" rel="noopener noreferrer">
                                {sub.submissionData.startsWith('data:image') ? <Eye className="ml-2 h-4 w-4" /> : <LinkIcon className="ml-2 h-4 w-4" />}
                                عرض
                           </a>
                        </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button title="موافقة" size="icon" className="h-8 w-8 bg-green-500 hover:bg-green-600" onClick={() => handleSubmission(sub, 'Approved')}><Check /></Button>
                        <Button title="رفض" size="icon" className="h-8 w-8 bg-red-500 hover:bg-red-600" onClick={() => handleSubmission(sub, 'Rejected')}><X /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-10 space-y-3">
              <Inbox className="h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">لا توجد تقديمات مهام معلقة حاليًا.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
