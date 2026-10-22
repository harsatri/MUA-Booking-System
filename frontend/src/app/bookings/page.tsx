'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  cancelBooking,
  createPayment,
  formatRupiah,
  getMyBookings,
  syncPayment,
  type Booking,
  type MyBooking,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  CANCELLABLE,
  STATUS_LABEL,
  STATUS_STYLE,
  formatWibDate,
  formatWibTime,
} from '@/lib/booking-format';

const DP_RATE = 0.3;

interface LoadState {
  bookings: MyBooking[];
  error: string | null;
  loaded: boolean;
}

const primaryButton =
  'rounded-full bg-rosewood px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rosewood-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

function BookingCard({
  booking,
  cancelling,
  paying,
  busy,
  onCancel,
  onPay,
}: {
  booking: MyBooking;
  cancelling: boolean;
  paying: boolean;
  busy: boolean;
  onCancel: (id: string) => void;
  onPay: (id: string) => void;
}) {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const isFuture = start.getTime() > Date.now();
  const canCancel = CANCELLABLE.includes(booking.status) && isFuture;
  const canPay = booking.status === 'PENDING' && isFuture;
  const dpAmount = booking.dpAmount ?? Math.round(booking.totalPrice * DP_RATE);
  const paidAt = booking.paidAt ? new Date(booking.paidAt) : null;

  return (
    <li className="rounded-2xl border border-petal/70 bg-white p-5 shadow-sm transition hover:shadow-lg hover:shadow-rosewood/10 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">
            {booking.service.name}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {formatWibDate(start)}
          </p>
          <p className="text-sm font-medium text-ink">
            {formatWibTime(start)} – {formatWibTime(end)} WIB
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[booking.status]}`}
        >
          {STATUS_LABEL[booking.status]}
        </span>
      </div>

      {(booking.location || booking.notes) && (
        <dl className="mt-3 space-y-1 text-sm">
          {booking.location && (
            <div className="flex gap-2">
              <dt className="text-ink-soft">Lokasi:</dt>
              <dd className="text-ink">{booking.location}</dd>
            </div>
          )}
          {booking.notes && (
            <div className="flex gap-2">
              <dt className="text-ink-soft">Catatan:</dt>
              <dd className="text-ink">{booking.notes}</dd>
            </div>
          )}
        </dl>
      )}

      {booking.status === 'PAID' && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-emerald-800">
          <span className="font-semibold">DP lunas</span>
          <span>({formatRupiah(dpAmount)})</span>
          {paidAt && (
            <span className="text-ink-soft">
              · dibayar {formatWibDate(paidAt)}, {formatWibTime(paidAt)} WIB
            </span>
          )}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-petal/60 pt-4">
        <span className="text-lg font-semibold text-rosewood-dark">
          {formatRupiah(booking.totalPrice)}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {canPay && (
            <button
              type="button"
              onClick={() => onPay(booking.id)}
              disabled={busy}
              className={primaryButton}
            >
              {paying
                ? 'Mengalihkan…'
                : `Bayar DP (30%) · ${formatRupiah(dpAmount)}`}
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel(booking.id)}
              disabled={busy}
              className="rounded-full border border-rosewood px-4 py-2 text-sm font-medium text-rosewood transition-colors hover:bg-rosewood hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cancelling ? 'Membatalkan…' : 'Batalkan'}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function PaymentBanner({
  checking,
  paid,
}: {
  checking: boolean;
  paid: boolean;
}) {
  const style = paid
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-amber-200 bg-amber-50 text-amber-800';
  return (
    <div
      role="status"
      className={`mb-4 rounded-xl border px-4 py-3 text-sm ${style}`}
    >
      {paid
        ? 'Pembayaran DP berhasil! Terima kasih, booking-mu sudah tercatat.'
        : checking
          ? 'Memeriksa status pembayaran…'
          : 'Pembayaran sedang diproses. Status akan diperbarui otomatis setelah pembayaran dikonfirmasi — coba muat ulang halaman beberapa saat lagi.'}
    </div>
  );
}

function BookingsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, isLoggedIn, token } = useAuth();

  const [state, setState] = useState<LoadState>({
    bookings: [],
    error: null,
    loaded: false,
  });
  const [syncDone, setSyncDone] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const paymentFinish = searchParams.get('payment') === 'finish';
  const finishedOrderId = searchParams.get('order_id');

  useEffect(() => {
    if (ready && !isLoggedIn) router.replace('/login');
  }, [ready, isLoggedIn, router]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load(authToken: string) {
      let bookings: MyBooking[];
      try {
        bookings = await getMyBookings(authToken);
      } catch (error) {
        if (!cancelled) {
          setState({
            bookings: [],
            error:
              error instanceof Error
                ? error.message
                : 'Riwayat booking tidak dapat dimuat.',
            loaded: true,
          });
        }
        return;
      }
      if (cancelled) return;
      setState({ bookings, error: null, loaded: true });

      // Selaraskan status pembayaran booking PENDING yang sudah punya order Midtrans.
      const pending = bookings.filter((b) => b.status === 'PENDING' && b.orderId);
      if (pending.length === 0) {
        setSyncDone(true);
        return;
      }
      const results = await Promise.allSettled(
        pending.map((b) => syncPayment(authToken, b.id)),
      );
      if (cancelled) return;

      const updates = new Map<string, Booking>();
      let failed = false;
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') updates.set(pending[i].id, result.value);
        else failed = true;
      });
      setState((prev) => ({
        ...prev,
        bookings: prev.bookings.map((b) => {
          const update = updates.get(b.id);
          return update ? { ...b, ...update } : b;
        }),
      }));
      setSyncFailed(failed);
      setSyncDone(true);
    }

    void load(token);
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleCancel = useCallback(
    async (id: string) => {
      if (!token || cancellingId || payingId) return;
      if (!window.confirm('Yakin ingin membatalkan booking ini?')) return;

      setCancellingId(id);
      setActionError(null);
      try {
        const updated = await cancelBooking(token, id);
        setState((prev) => ({
          ...prev,
          bookings: prev.bookings.map((b) =>
            b.id === id ? { ...b, status: updated.status } : b,
          ),
        }));
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'Gagal membatalkan booking.',
        );
      } finally {
        setCancellingId(null);
      }
    },
    [token, cancellingId, payingId],
  );

  const handlePay = useCallback(
    async (id: string) => {
      if (!token || cancellingId || payingId) return;

      setPayingId(id);
      setActionError(null);
      try {
        const { redirectUrl } = await createPayment(token, id);
        window.location.href = redirectUrl;
      } catch (error) {
        setActionError(
          error instanceof Error
            ? error.message
            : 'Pembayaran tidak dapat dimulai. Coba lagi.',
        );
        setPayingId(null);
      }
    },
    [token, cancellingId, payingId],
  );

  if (!ready || !isLoggedIn || !state.loaded) {
    return (
      <div
        aria-busy="true"
        aria-label="Memuat riwayat booking"
        className="space-y-4"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-2xl border border-petal/60 bg-white/70"
          />
        ))}
      </div>
    );
  }

  if (state.error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-700"
      >
        {state.error}
      </div>
    );
  }

  if (state.bookings.length === 0) {
    return (
      <div
        role="status"
        className="mx-auto max-w-lg rounded-2xl border border-petal bg-white/80 px-6 py-10 text-center"
      >
        <p className="font-display text-xl text-ink">Belum ada booking</p>
        <p className="mt-2 text-sm text-ink-soft">
          Yuk pilih layanan favoritmu dan jadwalkan sesi makeup pertamamu.
        </p>
        <Link
          href="/#pricelist"
          className="mt-5 inline-block rounded-full bg-rosewood px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rosewood-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood focus-visible:ring-offset-2"
        >
          Lihat Pricelist
        </Link>
      </div>
    );
  }

  // Booking yang dibayar: cocokkan dengan order_id dari redirect Midtrans bila ada.
  const paymentCandidates = state.bookings.filter((b) =>
    finishedOrderId ? b.orderId === finishedOrderId : b.orderId !== null,
  );
  const paymentPaid = paymentCandidates.some((b) => b.status === 'PAID');
  const showBanner =
    paymentFinish && (paymentCandidates.length > 0 || !syncDone);

  return (
    <>
      {showBanner && (
        <PaymentBanner checking={!syncDone} paid={paymentPaid} />
      )}
      {syncDone && syncFailed && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Status pembayaran belum dapat diperiksa saat ini. Coba muat ulang
          halaman beberapa saat lagi.
        </div>
      )}
      {actionError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}
      <ul className="space-y-4">
        {state.bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            cancelling={cancellingId === booking.id}
            paying={payingId === booking.id}
            busy={cancellingId !== null || payingId !== null}
            onCancel={(id) => void handleCancel(id)}
            onPay={(id) => void handlePay(id)}
          />
        ))}
      </ul>
    </>
  );
}

export default function BookingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
            Booking Saya
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Riwayat dan status booking makeup-mu.
          </p>
        </div>
        <Link
          href="/booking"
          className="rounded-full bg-rosewood px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-rosewood-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood focus-visible:ring-offset-2"
        >
          Booking Baru
        </Link>
      </div>
      <Suspense
        fallback={<div aria-busy="true" className="min-h-[24rem]" />}
      >
        <BookingsList />
      </Suspense>
    </div>
  );
}
