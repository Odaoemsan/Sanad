import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { FirebaseClientProvider } from '@/firebase';
import { BottomNavBar } from '@/components/layout/bottom-nav-bar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';


export const metadata: Metadata = {
  title: 'SNAD - منصة استثمارية عالية العائد',
  description: 'استكشف خطط الاستثمار عالية العائد، وتتبع عوائدك، وقم بتنمية محفظتك مع SNAD.',
  viewport: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <SidebarProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow pb-16">{children}</main>
              <Footer />
            </div>
            <Toaster />
            <BottomNavBar />
          </SidebarProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
