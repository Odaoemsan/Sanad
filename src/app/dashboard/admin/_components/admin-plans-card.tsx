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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
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
import { useDatabase } from "@/firebase";
import { ref, set, push, remove } from 'firebase/database';
import type { InvestmentPlan } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAdminData } from "./admin-data-provider";

const initialPlanState: Omit<InvestmentPlan, 'id'> = {
  name: '',
  description: '',
  dailyReturn: 0,
  duration: 0,
  minDeposit: 0,
  maxDeposit: 0,
  isPopular: false,
};

export function AdminPlansCard() {
  const database = useDatabase();
  const { toast } = useToast();

  const { allPlans: plans, isLoading } = useAdminData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Partial<InvestmentPlan> | null>(null);

  const handleOpenModal = (plan?: InvestmentPlan) => {
    setCurrentPlan(plan || initialPlanState);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentPlan(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (!currentPlan) return;
    
    // Handle checkbox separately
    if (type === 'checkbox' && e.target instanceof HTMLInputElement) {
        const checked = e.target.checked;
        setCurrentPlan({ ...currentPlan, [name]: checked });
        return;
    }

    const val = type === 'number' ? parseFloat(value) : value;
    setCurrentPlan({ ...currentPlan, [name]: val });
  };


  const handleSavePlan = async () => {
    if (!database || !currentPlan) return;

    try {
      if (currentPlan.id) {
        // Editing existing plan
        const planRef = ref(database, `investment_plans/${currentPlan.id}`);
        await set(planRef, {
            ...currentPlan,
            // Ensure numeric types are stored correctly
            dailyReturn: Number(currentPlan.dailyReturn) || 0,
            duration: Number(currentPlan.duration) || 0,
            minDeposit: Number(currentPlan.minDeposit) || 0,
            maxDeposit: Number(currentPlan.maxDeposit) || 0,
        });
        toast({ title: "تم تحديث الخطة بنجاح" });
      } else {
        // Creating new plan
        const newPlanRef = push(ref(database, 'investment_plans'));
        const newPlanId = newPlanRef.key;
        await set(newPlanRef, { 
            ...currentPlan, 
            id: newPlanId,
            dailyReturn: Number(currentPlan.dailyReturn) || 0,
            duration: Number(currentPlan.duration) || 0,
            minDeposit: Number(currentPlan.minDeposit) || 0,
            maxDeposit: Number(currentPlan.maxDeposit) || 0,
        });
        toast({ title: "تم إنشاء الخطة بنجاح" });
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({ title: "خطأ", description: "فشل حفظ الخطة.", variant: "destructive" });
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!database) return;

    try {
      const planRef = ref(database, `investment_plans/${planId}`);
      await remove(planRef);
      toast({ title: "تم حذف الخطة" });
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast({ title: "خطأ", description: "فشل حذف الخطة.", variant: "destructive" });
    }
  };
  
  const pageIsLoading = isLoading || !database;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>إدارة الخطط</CardTitle>
            <CardDescription>إنشاء وتعديل وحذف الخطط.</CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()} size="sm">
            <PlusCircle className="ml-2 h-4 w-4" />
            جديدة
          </Button>
        </CardHeader>
        <CardContent>
          {pageIsLoading ? (
            <p>جاري تحميل الخطط...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الربح</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans?.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>{plan.dailyReturn}%</TableCell>
                    <TableCell>{plan.duration} ي</TableCell>
                    <TableCell className="flex gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(plan)}><Edit className="h-4 w-4" /></Button>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                               <Button variant="destructive" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيؤدي هذا إلى حذف الخطة بشكل دائم. لا يمكن التراجع عن هذا الإجراء.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePlan(plan.id)}>نعم، قم بالحذف</AlertDialogAction>
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

      {currentPlan && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{currentPlan.id ? 'تعديل الخطة' : 'إنشاء خطة جديدة'}</DialogTitle>
              <DialogDescription>املأ التفاصيل أدناه.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">الاسم</Label>
                <Input id="name" name="name" value={currentPlan.name || ''} onChange={handleChange} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="description" className="text-right pt-2">الوصف</Label>
                <Textarea id="description" name="description" value={currentPlan.description || ''} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dailyReturn" className="text-right">الربح اليومي %</Label>
                <Input id="dailyReturn" name="dailyReturn" type="number" value={currentPlan.dailyReturn || 0} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="duration" className="text-right">المدة (أيام)</Label>
                <Input id="duration" name="duration" type="number" value={currentPlan.duration || 0} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="minDeposit" className="text-right">أدنى إيداع</Label>
                <Input id="minDeposit" name="minDeposit" type="number" value={currentPlan.minDeposit || 0} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="maxDeposit" className="text-right">أقصى إيداع</Label>
                <Input id="maxDeposit" name="maxDeposit" type="number" value={currentPlan.maxDeposit || 0} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isPopular" className="text-right">خطة شائعة</Label>
                <Switch id="isPopular" name="isPopular" checked={currentPlan.isPopular || false} onCheckedChange={(checked) => setCurrentPlan({...currentPlan, isPopular: checked})} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">إلغاء</Button></DialogClose>
              <Button onClick={handleSavePlan}>حفظ التغييرات</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
