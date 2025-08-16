import { Toaster } from "@/components/ui/sonner";
import { env } from "@/lib/env";
import { ImageKitProvider } from "@imagekit/next";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stocking App",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${poppins.variable} antialiased`}>
        <ImageKitProvider urlEndpoint={env.data?.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT}>
          {children}
          <Toaster />
        </ImageKitProvider>
      </body>
    </html>
  );
}
