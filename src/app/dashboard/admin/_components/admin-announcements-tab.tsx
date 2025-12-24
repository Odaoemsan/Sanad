'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useDatabase, useDatabaseObject, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ref, serverTimestamp, set, remove } from 'firebase/database';
import { Activity, Megaphone, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
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

type Announcement = {
    text: string;
    timestamp: number;
}

export function AdminAnnouncementsTab() {
  const database = useDatabase();
  const { toast } = useToast();
  const [announcementText, setAnnouncementText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const announcementRef = useMemoFirebase(() => database ? ref(database, 'announcement') : null, [database]);
  
  const { data: currentAnnouncement, isLoading } = useDatabaseObject<Announcement>(announcementRef);

  useEffect(() => {
    // If there is a current announcement, set it in the text area, otherwise, ensure the text area is clear.
    if (currentAnnouncement && currentAnnouncement.text) {
       setAnnouncementText(currentAnnouncement.text);
    } else {
       setAnnouncementText('');
    }
  }, [currentAnnouncement]);

  const handleSaveAnnouncement = async () => {
    if (!announcementRef) return;
    
    if(!announcementText.trim()) {
        toast({ title: 'خطأ', description: 'نص الإعلان لا يمكن أن يكون فارغًا.', variant: 'destructive' });
        return;
    }

    setIsSaving(true);
    try {
      await set(announcementRef, {
        text: announcementText,
        timestamp: serverTimestamp()
      });
      toast({ title: 'تم نشر/تحديث الإعلان', description: 'سيظهر الإعلان لجميع المستخدمين.' });
    } catch (error) {
      console.error('Failed to save announcement:', error);
      toast({ title: 'خطأ', description: 'فشل حفظ الإعلان.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
      if (!announcementRef) return;
      setIsDeleting(true);
      try {
          await remove(announcementRef);
          setAnnouncementText('');
          toast({ title: 'تم حذف الإعلان', description: 'لم يعد الإعلان ظاهرًا للمستخدمين.' });
      } catch (error) {
           console.error('Failed to delete announcement:', error);
           toast({ title: 'خطأ', description: 'فشل حذف الإعلان.', variant: 'destructive' });
      } finally {
          setIsDeleting(false);
      }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>إدارة الإعلانات</CardTitle>
        <CardDescription>أنشئ، حدّث أو احذف الإعلان الذي يظهر للمستخدمين عند فتح التطبيق.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-10">
             <Activity className="h-10 w-10 animate-pulse text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="announcementText" className="flex items-center gap-2 mb-2">
                <Megaphone className="h-4 w-4"/>
                رسالة الإعلان
              </Label>
              <Textarea
                id="announcementText"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="اكتب إعلانك هنا..."
                rows={5}
                disabled={isSaving || isDeleting}
              />
            </div>
            <div className="flex gap-2">
                 <Button onClick={handleSaveAnnouncement} disabled={isSaving || isDeleting}>
                    {isSaving ? 'جار الحفظ...' : (currentAnnouncement?.text ? 'تحديث الإعلان' : 'نشر الإعلان')}
                </Button>
                {currentAnnouncement?.text && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isDeleting}>
                                <Trash2 className="ml-2 h-4 w-4" />
                                حذف الإعلان
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                            <AlertDialogDescription>
                                سيؤدي هذا إلى حذف الإعلان بشكل دائم من قاعدة البيانات ولن يظهر للمستخدمين بعد الآن.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteAnnouncement} disabled={isDeleting}>
                                {isDeleting ? 'جار الحذف...' : 'نعم، قم بالحذف'}
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
