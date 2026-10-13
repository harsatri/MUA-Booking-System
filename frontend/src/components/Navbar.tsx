'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

const linkClass =
  'rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-blush hover:text-rosewood-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood focus-visible:ring-offset-2';

export default function Navbar() {
  const { ready, isLoggedIn, role, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-petal/60 bg-background/85 backdrop-blur">
      <nav
        aria-label="Navigasi utama"
        className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6"
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood focus-visible:ring-offset-2"
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-petal to-rosewood text-sm text-white"
          >
            ✦
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-ink">
            MUA Booking
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/#pricelist" className={linkClass}>
            Pricelist
          </Link>

          {/* Placeholder dengan tinggi tetap agar tidak berkedip sebelum status login diketahui */}
          {!ready ? (
            <span aria-hidden="true" className="inline-block h-9 w-28" />
          ) : isLoggedIn ? (
            <>
              {role === 'ADMIN' && (
                <span className="rounded-full bg-rosewood px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Admin
                </span>
              )}
              <button
                type="button"
                onClick={logout}
                className="rounded-full border border-rosewood px-4 py-2 text-sm font-medium text-rosewood transition-colors hover:bg-rosewood hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood focus-visible:ring-offset-2"
              >
                Keluar
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={linkClass}>
                Masuk
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-rosewood px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rosewood-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood focus-visible:ring-offset-2"
              >
                Daftar
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
