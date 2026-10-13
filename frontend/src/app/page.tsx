import { Suspense } from 'react';
import Link from 'next/link';
import Pricelist, { PricelistSkeleton } from '@/components/Pricelist';

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-petal/60 blur-3xl"
        />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rosewood">
            Makeup Artist Profesional
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-ink sm:text-6xl">
            Tampil memukau di setiap momen spesialmu
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Dari pernikahan hingga wisuda, percayakan riasanmu pada tangan yang
            tepat. Lihat pricelist, lalu booking jadwalmu dengan mudah.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/#pricelist"
              className="rounded-full bg-rosewood px-7 py-3 font-medium text-white shadow-md shadow-rosewood/20 transition-colors hover:bg-rosewood-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood focus-visible:ring-offset-2"
            >
              Lihat Pricelist
            </Link>
            <Link
              href="/register"
              className="rounded-full border border-rosewood px-7 py-3 font-medium text-rosewood transition-colors hover:bg-blush focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood focus-visible:ring-offset-2"
            >
              Buat Akun
            </Link>
          </div>
        </div>
      </section>

      <section
        id="pricelist"
        aria-labelledby="pricelist-heading"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6"
      >
        <div className="mb-10 text-center">
          <h2
            id="pricelist-heading"
            className="font-display text-3xl font-semibold text-ink sm:text-4xl"
          >
            Pricelist Layanan
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Harga dalam Rupiah. Pilih layanan yang sesuai kebutuhanmu.
          </p>
        </div>
        <Suspense fallback={<PricelistSkeleton />}>
          <Pricelist />
        </Suspense>
      </section>
    </>
  );
}
