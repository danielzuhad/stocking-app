import {
  FileDown,
  Package,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { LoginForm } from './login-form';

/** Page metadata for `/login`. */
export const metadata: Metadata = {
  title: 'Masuk • Stockly',
};

const highlights = [
  {
    icon: Package,
    title: 'Ledger stok rapi',
    desc: 'IN / OUT / ADJUST tercatat jelas, gampang ditelusuri.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit trail otomatis',
    desc: 'Siapa ubah apa & kapan—aman buat tim & kontrol.',
  },
  {
    icon: ReceiptText,
    title: 'Invoice & retur',
    desc: 'Penjualan, refund, dan retur lebih tertib.',
  },
  {
    icon: FileDown,
    title: 'Export laporan',
    desc: 'Unduh CSV/PDF untuk laporan internal atau akuntansi.',
  },
];

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-center p-4 md:p-8">
        <div className="grid w-full gap-10 lg:grid-cols-2 lg:items-center">
          {/* Left / Marketing panel */}
          <div className="hidden lg:block">
            <div className="relative h-full overflow-hidden p-5">
              {/* top badge */}
              <div className="relative inline-flex items-center gap-2 rounded-full border-2 border-white bg-white/50 px-3 py-1 text-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                <div className="pointer-events-none absolute inset-0 rounded-full bg-linear-to-b from-white/20 via-white/5 to-transparent dark:from-white/10" />
                <span className="bg-primary relative size-2 rounded-full" />
                <span className="text-foreground relative">
                  Inventory + invoice untuk multi outlet
                </span>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <div
                  className={[
                    'relative grid shrink-0 place-items-center overflow-hidden rounded-full',
                    'border border-white/25 bg-white/35 shadow-sm backdrop-blur-xl',
                    'size-11 sm:size-12 md:size-13 dark:border-white/10 dark:bg-white/5',
                  ].join(' ')}
                >
                  {/* glass highlight */}
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-linear-to-b from-white/35 via-white/10 to-transparent dark:from-white/10" />

                  <Image
                    alt="stockly-logo"
                    src="/assets/logo.svg"
                    fill
                    priority
                    sizes="64px"
                    className="relative scale-[1.28] object-contain dark:invert"
                  />
                </div>

                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  Stockly
                </h1>
              </div>
              <p className="text-muted-foreground mt-3 max-w-lg text-base leading-relaxed">
                Kelola stok tanpa ribet—catat barang masuk/keluar, opname,
                retur, sampai laporan. Semuanya rapi, siap diaudit.
              </p>

              {/* tags */}
              <div className="mt-6 flex flex-wrap gap-2">
                {['Retail', 'F&B', 'Kosmetik', 'Gudang'].map((t) => (
                  <span
                    key={t}
                    className="text-muted-foreground relative inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                  >
                    <span className="pointer-events-none absolute inset-0 rounded-full bg-linear-to-b from-white/18 via-white/5 to-transparent dark:from-white/10" />
                    <span className="relative">{t}</span>
                  </span>
                ))}
              </div>

              {/* feature cards */}
              <div className="mt-8 grid grid-cols-2 gap-4">
                {highlights.map((h) => {
                  const Icon = h.icon;
                  return (
                    <div
                      key={h.title}
                      className="relative rounded-xl border border-white/15 bg-white/10 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="pointer-events-none absolute inset-0 rounded-xl bg-linear-to-b from-white/18 via-white/5 to-transparent dark:from-white/10" />
                      <div className="text-primary relative flex items-center gap-2">
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-semibold">{h.title}</span>
                      </div>
                      <p className="text-muted-foreground relative mt-2 text-sm leading-relaxed">
                        {h.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* bottom note */}
              <div className="relative mt-8 flex items-start gap-3 rounded-xl border border-white/15 bg-white/10 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-linear-to-b from-white/18 via-white/5 to-transparent dark:from-white/10" />
                <Sparkles className="text-primary relative mt-0.5 h-5 w-5" />
                <div className="relative">
                  <p className="text-sm font-medium">Lebih cepat untuk tim</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Minim salah input, histori jelas, dan proses stok lebih
                    konsisten—cocok untuk operasional harian.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right / Form */}
          <div className="mx-auto w-full max-w-md">
            <div className="mb-3 lg:hidden">
              {/* brand row */}
              <div className="flex items-center gap-3">
                <div
                  className={[
                    'relative grid shrink-0 place-items-center overflow-hidden rounded-full',
                    'border border-white/25 bg-white/35 shadow-sm backdrop-blur-xl',
                    'size-10 dark:border-white/10 dark:bg-white/5',
                  ].join(' ')}
                >
                  {/* glass highlight */}
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-linear-to-b from-white/35 via-white/10 to-transparent dark:from-white/10" />

                  <Image
                    alt="stockly-logo"
                    src="/assets/logo.svg"
                    fill
                    priority
                    sizes="64px"
                    className="relative scale-[1.28] object-contain dark:invert"
                  />
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    Stockly
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    Masuk untuk kelola stok, opname, retur, dan laporan—semua
                    rapi & siap diaudit.
                  </p>
                </div>
              </div>
            </div>

            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
