import { AuthSessionProvider } from '@/components/provider/session';
import { ThemeProvider } from '@/components/provider/theme';
import { Toaster } from '@/components/ui/sonner';
import type { Metadata } from 'next';
import { Geist_Mono, Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Stockly',
  description:
    'Stockly adalah aplikasi manajemen stok yang simpel dan cepat untuk memantau persediaan secara real-time, mencatat barang masuk/keluar, dan memastikan stok selalu aman lewat notifikasi stok menipis—semua rapi dalam satu dashboard.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} bg-background min-h-screen font-sans antialiased`}
      >
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="from-primary/10 via-background to-background dark:from-primary/15 dark:via-background dark:to-background absolute inset-0 bg-linear-to-b" />
          <div className="bg-primary/15 absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl" />
          <div className="bg-primary/10 absolute right-0 -bottom-32 h-96 w-96 rounded-full blur-3xl" />
        </div>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthSessionProvider>
            {children}
            <Toaster
              closeButton
              toastOptions={{
                classNames: {
                  success: '!bg-primary !text-primary-foreground !border-0',
                  warning: '!bg-accent !text-accent-foreground !border-0',
                  error: '!bg-destructive !text-primary-foreground !border-0',
                  closeButton: '!bg-background !text-foreground !border-border',
                },
              }}
            />
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
