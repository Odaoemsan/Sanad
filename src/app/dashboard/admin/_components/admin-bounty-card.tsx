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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { ref, set, push, remove, serverTimestamp } from 'firebase/database';
import type { Bounty } from '@/lib/placeholder-data';
import { PlusCircle, Edit, Trash2, Gift } from 'lucide-react';
import { useAdminData } from './admin-data-provider';

const initialBountyState: Omit<Bounty, 'id' | 'createdAt'> = {
  title: '',
  description: '',
  reward: 1,
  isActive: true,
  durationHours: 24,
  submissionType: 'link',
};

export function AdminBountyCard() {
  const database = useDatabase();
  const { toast } = useToast();
  const { allBounties: bounties, isLoading } = useAdminData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBounty, setCurrentBounty] = useState<Partial<Bounty> | null>(null);

  const handleOpenModal = (bounty?: Bounty) => {
    setCurrentBounty(bounty || initialBountyState);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentBounty(null);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (!currentBounty) return;
    const val = e.target.type === 'number' ? parseFloat(value) : value;
    setCurrentBounty({ ...currentBounty, [name]: val });
  };

  const handleSaveBounty = async () => {
    if (!database || !currentBounty || !currentBounty.title || !currentBounty.reward) {
        toast({ title: "بيانات ناقصة", description: "الرجاء ملء جميع الحقول المطلوبة.", variant: 'destructive'});
        return;
    }

    try {
      const dataToSave: Omit<Bounty, 'id'> = {
        title: currentBounty.title || '',
        description: currentBounty.description || '',
        reward: Number(currentBounty.reward) || 0,
        durationHours: Number(currentBounty.durationHours) || 24,
        isActive: currentBounty.isActive ?? true,
        submissionType: 'link', // Always link now
        createdAt: currentBounty.createdAt || serverTimestamp() as any,
      };

      if (currentBounty.id) {
        // Editing
        const bountyRef = ref(database, `bounties/${currentBounty.id}`);
        await set(bountyRef, { ...dataToSave, id: currentBounty.id });
        toast({ title: 'تم تحديث المهمة' });
      } else {
        // Creating
        const newBountyRef = push(ref(database, 'bounties'));
        await set(newBountyRef, {
          ...dataToSave,
          id: newBountyRef.key,
        });
        toast({ title: 'تم إنشاء المهمة بنجاح' });
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving bounty:', error);
      toast({ title: 'خطأ', description: 'فشل حفظ المهمة.', variant: 'destructive' });
    }
  };

  const handleDeleteBounty = async (bountyId: string) => {
      if (!database) return;
      try {
          await remove(ref(database, `bounties/${bountyId}`));
          toast({ title: "تم حذف المهمة" });
      } catch (error) {
          console.error("Error deleting bounty:", error);
          toast({ title: "خطأ", description: "فشل حذف المهمة.", variant: "destructive" });
      }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>إدارة المهام</CardTitle>
            <CardDescription>إنشاء وتعديل مهام المستخدمين.</CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()} size="sm">
            <PlusCircle className="ml-2 h-4 w-4" />
            مهمة جديدة
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>جاري تحميل المهام...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المهمة</TableHead>
                  <TableHead>المكافأة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bounties?.map((bounty) => (
                  <TableRow key={bounty.id}>
                    <TableCell className="font-medium">{bounty.title}</TableCell>
                    <TableCell>${bounty.reward}</TableCell>
                    <TableCell>{bounty.isActive ? 'نشطة' : 'غير نشطة'}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(bounty)}><Edit className="h-4 w-4" /></Button>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                               <Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيؤدي هذا إلى حذف المهمة بشكل دائم.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteBounty(bounty.id)}>نعم، قم بالحذف</AlertDialogAction>
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

      {currentBounty && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift/>
                {currentBounty.id ? 'تعديل المهمة' : 'إنشاء مهمة جديدة'}
                </DialogTitle>
              <DialogDescription>املأ تفاصيل المهمة أدناه. الإثبات المطلوب هو رابط نصي دائمًا.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">العنوان</Label>
                <Input id="title" name="title" value={currentBounty.title || ''} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">الوصف</Label>
                <Textarea id="description" name="description" value={currentBounty.description || ''} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reward" className="text-right">المكافأة ($)</Label>
                <Input id="reward" name="reward" type="number" value={currentBounty.reward || 0} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="durationHours" className="text-right">المدة (ساعات)</Label>
                <Input id="durationHours" name="durationHours" type="number" value={currentBounty.durationHours || 24} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isActive" className="text-right">مهمة نشطة</Label>
                <Switch id="isActive" name="isActive" checked={currentBounty.isActive} onCheckedChange={(checked) => setCurrentBounty({...currentBounty, isActive: checked})} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">إلغاء</Button></DialogClose>
              <Button onClick={handleSaveBounty}>حفظ التغييرات</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
