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
    <html lang="en">
      <body
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
