'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useDatabase } from '@/firebase';
import { ref, update } from 'firebase/database';
import type { PartnerRank } from '@/lib/placeholder-data';
import { Edit, Crown } from 'lucide-react';
import { useAdminData } from './admin-data-provider';

export function AdminRanksCard() {
  const database = useDatabase();
  const { toast } = useToast();
  const { allRanks: ranks, isLoading } = useAdminData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRank, setCurrentRank] = useState<PartnerRank | null>(null);

  const handleOpenModal = (rank: PartnerRank) => {
    setCurrentRank(rank);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentRank(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!currentRank) return;
    const val = e.target.type === 'number' ? parseFloat(value) : value;
    setCurrentRank({ ...currentRank, [name]: val });
  };

  const handleSaveRank = async () => {
    if (!database || !currentRank || !currentRank.id) {
        toast({ title: "بيانات ناقصة", description: "الرجاء ملء جميع الحقول المطلوبة.", variant: 'destructive'});
        return;
    }

    try {
        const rankRef = ref(database, `partner_ranks/${currentRank.id}`);
        await update(rankRef, {
            goal: Number(currentRank.goal) || 0,
            commission: Number(currentRank.commission) || 0,
        });
        toast({ title: 'تم تحديث الرتبة' });
        handleCloseModal();
    } catch (error) {
      console.error('Error saving rank:', error);
      toast({ title: 'خطأ', description: 'فشل حفظ الرتبة.', variant: 'destructive' });
    }
  };


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <CardTitle>إدارة برنامج الشركاء</CardTitle>
          </div>
          <CardDescription>تعديل شروط ومكافآت رتب الشركاء.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>جاري تحميل الرتب...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الرتبة</TableHead>
                  <TableHead>الهدف ($)</TableHead>
                  <TableHead>العمولة (%)</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranks?.map((rank) => (
                  <TableRow key={rank.id}>
                    <TableCell className="font-medium">{rank.name}</TableCell>
                    <TableCell>${rank.goal.toLocaleString()}</TableCell>
                    <TableCell>{rank.commission}%</TableCell>
                    <TableCell>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(rank)}><Edit className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {currentRank && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>تعديل رتبة: {currentRank.name}</DialogTitle>
              <DialogDescription>قم بتحديث الهدف والعمولة لهذه الرتبة.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="goal" className="text-right">الهدف ($)</Label>
                <Input id="goal" name="goal" type="number" value={currentRank.goal || 0} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="commission" className="text-right">العمولة (%)</Label>
                <Input id="commission" name="commission" type="number" value={currentRank.commission || 0} onChange={handleChange} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">إلغاء</Button></DialogClose>
              <Button onClick={handleSaveRank}>حفظ التغييرات</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
