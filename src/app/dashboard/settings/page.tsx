'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth, useUser } from "@/firebase";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const profileFormSchema = z.object({
    displayName: z.string().min(2, { message: "يجب أن يكون الاسم الكامل حرفين على الأقل." }),
});

const passwordFormSchema = z.object({
    currentPassword: z.string().min(1, { message: "كلمة المرور الحالية مطلوبة." }),
    newPassword: z.string().min(6, { message: "يجب أن تكون كلمة المرور الجديدة 6 أحرف على الأقل." }),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "كلمات المرور الجديدة غير متطابقة.",
    path: ["confirmPassword"],
});


export default function SettingsPage() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const { toast } = useToast();
    const [isProfileSaving, setIsProfileSaving] = useState(false);
    const [isPasswordSaving, setIsPasswordSaving] = useState(false);

    const profileForm = useForm<z.infer<typeof profileFormSchema>>({
        resolver: zodResolver(profileFormSchema),
        values: {
            displayName: user?.displayName || "",
        }
    });

    const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        }
    });

    async function onProfileSubmit(values: z.infer<typeof profileFormSchema>) {
        if (!user) return;
        setIsProfileSaving(true);
        try {
            await updateProfile(user, { displayName: values.displayName });
            toast({
                title: "تم تحديث الملف الشخصي",
                description: "تم تحديث اسمك بنجاح.",
            });
        } catch (error) {
            console.error("Error updating profile:", error);
            toast({
                title: "خطأ",
                description: "لا يمكن تحديث ملفك الشخصي.",
                variant: "destructive",
            });
        } finally {
            setIsProfileSaving(false);
        }
    }

    async function onPasswordSubmit(values: z.infer<typeof passwordFormSchema>) {
        if (!user || !auth || !user.email) return;
        setIsPasswordSaving(true);

        const credential = EmailAuthProvider.credential(user.email, values.currentPassword);

        try {
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, values.newPassword);
            toast({
                title: "تم تحديث كلمة المرور",
                description: "تم تغيير كلمة المرور الخاصة بك بنجاح.",
            });
            passwordForm.reset();
        } catch (error: any) {
            console.error("Error updating password:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                passwordForm.setError("currentPassword", { type: "manual", message: "كلمة المرور الحالية غير صحيحة." });
            } else {
                 toast({
                    title: "خطأ في تغيير كلمة المرور",
                    description: "حدث خطأ ما. الرجاء المحاولة مرة أخرى.",
                    variant: "destructive",
                });
            }
        } finally {
            setIsPasswordSaving(false);
        }
    }
    

    return (
        <>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>معلومات الملف الشخصي</CardTitle>
                            <CardDescription>قم بتحديث بياناتك الشخصية.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Form {...profileForm}>
                                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                                     <FormField
                                        control={profileForm.control}
                                        name="displayName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>الاسم الكامل</FormLabel>
                                                <FormControl>
                                                    <Input {...field} disabled={isUserLoading || isProfileSaving} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid gap-2">
                                         <FormLabel>البريد الإلكتروني</FormLabel>
                                         <Input type="email" value={user?.email || ""} disabled />
                                    </div>
                                    <Button type="submit" disabled={isUserLoading || isProfileSaving}>
                                        {isProfileSaving ? "جار الحفظ..." : "حفظ التغييرات"}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>تغيير كلمة المرور</CardTitle>
                            <CardDescription>قم بتحديث كلمة المرور الخاصة بك لتعزيز الأمان.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...passwordForm}>
                                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                     <FormField
                                        control={passwordForm.control}
                                        name="currentPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>كلمة المرور الحالية</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} disabled={isPasswordSaving}/>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={passwordForm.control}
                                        name="newPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>كلمة المرور الجديدة</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} disabled={isPasswordSaving}/>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={passwordForm.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>تأكيد كلمة المرور الجديدة</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} disabled={isPasswordSaving}/>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" disabled={isPasswordSaving}>
                                        {isPasswordSaving ? "جار التحديث..." : "تحديث كلمة المرور"}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </>
    );
}
