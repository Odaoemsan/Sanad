'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MountainIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth, useDatabase } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile, UserCredential } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

const formSchema = z
  .object({
    fullName: z.string().min(2, { message: 'يجب أن يكون الاسم الكامل حرفين على الأقل.' }),
    email: z.string().email({ message: 'الرجاء إدخال عنوان بريد إلكتروني صالح.' }),
    password: z.string().min(6, { message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمات المرور غير متطابقة",
    path: ['confirmPassword'],
  });

export default function SignupPage() {
  const auth = useAuth();
  const database = useDatabase();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const referrerId = searchParams.get('ref');

  useEffect(() => {
    if (!isUserLoading && user) {
        router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !database) return;

    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const authUser = userCredential.user;

      if (authUser) {
        await updateProfile(authUser, { displayName: values.fullName });

        const userProfileData: any = {
          id: authUser.uid,
          username: values.fullName,
          email: authUser.email,
          registrationDate: new Date().toISOString(),
          balance: 0,
          lastProfitClaim: null,
        };
        
        if (referrerId) {
          const referrerRef = ref(database, `users/${referrerId}`);
          const referrerSnap = await get(referrerRef);
          if (referrerSnap.exists()) {
            userProfileData.referrerId = referrerId;
            toast({ title: "تم تسجيل الإحالة!", description: "تم ربط حسابك بالشخص الذي قام بدعوتك." });
          } else {
             console.warn("Referrer ID not found:", referrerId);
          }
        }

        const profileRef = ref(database, `users/${authUser.uid}`);
        await set(profileRef, userProfileData);

        // Redirect is handled by the useEffect watching the user state
      }

    } catch (error: any) {
      console.error('Error signing up:', error);
       if (error.code === 'auth/email-already-in-use') {
          form.setError('email', { type: 'manual', message: 'هذا البريد الإلكتروني مستخدم بالفعل.' });
       } else if (error.code === 'auth/invalid-credential') {
          form.setError('root', { type: 'manual', message: 'بيانات الاعتماد المقدمة غير صالحة.' });
       }
       else {
        form.setError('root', { type: 'manual', message: 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.' });
      }
    }
  }

  if (isUserLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl font-semibold">جار التحميل...</div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen py-12 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Link href="/" className="inline-flex justify-center mb-4">
            <MountainIcon className="h-8 w-8 text-primary" />
          </Link>
          <CardTitle className="text-2xl font-bold">إنشاء حساب</CardTitle>
          <CardDescription>أدخل معلوماتك للبدء.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم الكامل</FormLabel>
                    <FormControl>
                      <Input placeholder="فلان الفلاني" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="m@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تأكيد كلمة المرور</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root && <FormMessage>{form.formState.errors.root.message}</FormMessage>}
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "جارٍ إنشاء الحساب..." : "إنشاء حساب"}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            هل لديك حساب بالفعل؟{' '}
            <Link href="/login" className="underline">
              تسجيل الدخول
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
