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
} from "@/components/ui/alert-dialog"
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
import { ref, set, push, remove } from 'firebase/database';
import type { PartnerRank } from '@/lib/placeholder-data';
import { Edit, Crown, PlusCircle, Trash2 } from 'lucide-react';
import { useAdminData } from './admin-data-provider';

const initialRankState: Partial<PartnerRank> = {
  id: '',
  name: '',
  goal: 0,
  commission: 0,
};

export function AdminRanksCard() {
  const database = useDatabase();
  const { toast } = useToast();
  const { allRanks: ranks, isLoading } = useAdminData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRank, setCurrentRank] = useState<Partial<PartnerRank> | null>(null);

  const handleOpenModal = (rank?: PartnerRank) => {
    setCurrentRank(rank || initialRankState);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentRank(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!currentRank) return;
    const val = name === 'id' || name === 'name' ? value : parseFloat(value);
    setCurrentRank({ ...currentRank, [name]: val });
  };

  const handleSaveRank = async () => {
    if (!database || !currentRank || !currentRank.id || !currentRank.name) {
        toast({ title: "بيانات ناقصة", description: "معرف الرتبة واسمها مطلوبان.", variant: 'destructive'});
        return;
    }

    try {
        const rankRef = ref(database, `partner_ranks/${currentRank.id}`);
        await set(rankRef, {
            id: currentRank.id,
            name: currentRank.name,
            goal: Number(currentRank.goal) || 0,
            commission: Number(currentRank.commission) || 0,
        });
        toast({ title: 'تم حفظ الرتبة بنجاح' });
        handleCloseModal();
    } catch (error) {
      console.error('Error saving rank:', error);
      toast({ title: 'خطأ', description: 'فشل حفظ الرتبة.', variant: 'destructive' });
    }
  };

  const handleDeleteRank = async (rankId: string) => {
      if(!database) return;
      try {
          const rankRef = ref(database, `partner_ranks/${rankId}`);
          await remove(rankRef);
          toast({ title: 'تم حذف الرتبة' });
      } catch (error) {
          console.error("Error deleting rank:", error);
          toast({ title: 'خطأ', description: 'فشل حذف الرتبة.', variant: "destructive" });
      }
  }


  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    <CardTitle>إدارة برنامج الشركاء</CardTitle>
                </div>
                <CardDescription>تعديل شروط ومكافآت رتب الشركاء.</CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()} size="sm">
                <PlusCircle className="ml-2 h-4 w-4" />
                رتبة جديدة
            </Button>
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
                    <TableCell className="flex gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(rank)}><Edit className="h-4 w-4" /></Button>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                               <Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيؤدي هذا إلى حذف الرتبة بشكل دائم. لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteRank(rank.id)}>نعم، قم بالحذف</AlertDialogAction>
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

      {currentRank && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{currentRank.name ? `تعديل رتبة: ${currentRank.name}` : 'إنشاء رتبة جديدة'}</DialogTitle>
              <DialogDescription>املأ تفاصيل الرتبة أدناه.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="id" className="text-right">المعرف (ID)</Label>
                <Input 
                    id="id" 
                    name="id" 
                    value={currentRank.id || ''} 
                    onChange={handleChange} 
                    className="col-span-3"
                    placeholder="e.g. success-partner"
                    disabled={!!(currentRank.name && currentRank.goal)} // Disable if editing
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">اسم الرتبة</Label>
                <Input id="name" name="name" value={currentRank.name || ''} onChange={handleChange} className="col-span-3" />
              </div>
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
