/**
 * Layout wrapper for authenticated app pages (dashboard area).
 *
 * This keeps consistent spacing without changing the URL structure
 * (route group folders like `(dashboard)` are ignored by Next.js routing).
 */
export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      {children}
    </div>
  );
}
