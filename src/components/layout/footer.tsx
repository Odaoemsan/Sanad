import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-card border-t mt-12">
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} SNAD. جميع الحقوق محفوظة.
          </p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
              شروط الخدمة
            </Link>
            <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
              سياسة الخصوصية
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
