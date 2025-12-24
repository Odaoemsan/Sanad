'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useDatabase, useDatabaseObject, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ref, set, update } from 'firebase/database';
import { Activity } from 'lucide-react';

export function AdminSettingsTab() {
  const database = useDatabase();
  const { toast } = useToast();
  const [telegramLink, setTelegramLink] = useState('');
  const [depositAddress, setDepositAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const settingsRef = useMemoFirebase(() => database ? ref(database, 'settings') : null, [database]);
  
  const { data: settingsData, isLoading } = useDatabaseObject<{telegramLink: string, depositAddress: string}>(settingsRef);

  useEffect(() => {
    if (settingsData) {
       setTelegramLink(settingsData.telegramLink || '');
       setDepositAddress(settingsData.depositAddress || '');
    }
  }, [settingsData]);

  const handleSaveSettings = async () => {
    if (!settingsRef) return;
    setIsSaving(true);
    try {
      await update(settingsRef, {
          telegramLink: telegramLink,
          depositAddress: depositAddress
      });
      toast({ title: 'تم حفظ الإعدادات', description: 'تم تحديث الإعدادات بنجاح.' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({ title: 'خطأ', description: 'فشل حفظ الإعدادات.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>الإعدادات العامة</CardTitle>
        <CardDescription>إدارة الإعدادات العامة للتطبيق مثل روابط الدعم وعناوين الإيداع.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center p-10">
             <Activity className="h-10 w-10 animate-pulse text-primary" />
          </div>
        ) : (
          <>
            <div className="space-y-2">
                <Label htmlFor="telegramLink">رابط دعم تيليجرام</Label>
                <Input
                id="telegramLink"
                value={telegramLink || ''}
                onChange={(e) => setTelegramLink(e.target.value)}
                placeholder="https://t.me/your_username"
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="depositAddress">عنوان الإيداع (USDT TRC20)</Label>
                <Input
                id="depositAddress"
                value={depositAddress || ''}
                onChange={(e) => setDepositAddress(e.target.value)}
                placeholder="أدخل عنوان محفظة USDT TRC20 هنا"
                />
            </div>
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? 'جار الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
