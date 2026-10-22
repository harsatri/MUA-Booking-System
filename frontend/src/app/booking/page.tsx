'use client';

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import FormField from '@/components/FormField';
import SubmitButton from '@/components/SubmitButton';
import {
  ApiError,
  createBooking,
  formatRupiah,
  getAvailability,
  getServices,
  type Availability,
  type Service,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  addMinutesToTime,
  dateFromWibIso,
  formatWibDate,
  wibIsoDate,
} from '@/lib/booking-format';

const selectClass =
  'w-full rounded-xl border border-petal bg-white px-4 py-2.5 text-ink transition focus:border-rosewood focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood/60 disabled:cursor-not-allowed disabled:opacity-60';

const CONFLICT_MESSAGE =
  'Maaf, jam yang kamu pilih baru saja diambil orang lain. Silakan pilih jam lain ya.';

interface SlotsResult {
  key: string;
  data: Availability | null;
  error: string | null;
}

interface ServicesState {
  list: Service[];
  error: string | null;
  loaded: boolean;
}

function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-petal/70 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 flex items-center gap-3 font-display text-xl font-semibold text-ink">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-blush text-sm font-semibold text-rosewood-dark"
        >
          {step}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function BookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, isLoggedIn, token } = useAuth();

  const [services, setServices] = useState<ServicesState>({
    list: [],
    error: null,
    loaded: false,
  });
  const [serviceId, setServiceId] = useState(
    () => searchParams.get('serviceId') ?? '',
  );
  const [date, setDate] = useState('');
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [nonce, setNonce] = useState(0);
  const [slotsResult, setSlotsResult] = useState<SlotsResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !isLoggedIn) router.replace('/login');
  }, [ready, isLoggedIn, router]);

  useEffect(() => {
    let cancelled = false;
    getServices()
      .then((list) => {
        if (!cancelled) {
          setServices({
            list: list.filter((s) => s.isActive),
            error: null,
            loaded: true,
          });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setServices({
            list: [],
            error:
              error instanceof Error
                ? error.message
                : 'Layanan tidak dapat dimuat.',
            loaded: true,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Tanggal minimum = besok (WIB). Dihitung setelah di klien agar tidak beda dengan SSR.
  const minDate = useMemo(() => (ready ? wibIsoDate(new Date(), 1) : ''), [ready]);

  const service = services.list.find((s) => s.id === serviceId) ?? null;
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= minDate;
  const slotsKey =
    service && dateValid ? `${service.id}|${date}|${nonce}` : null;

  useEffect(() => {
    if (!slotsKey) return;
    const [sid, day] = slotsKey.split('|');
    let cancelled = false;
    getAvailability(day, sid)
      .then((data) => {
        if (!cancelled) setSlotsResult({ key: slotsKey, data, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSlotsResult({
            key: slotsKey,
            data: null,
            error:
              error instanceof Error
                ? error.message
                : 'Jam tersedia tidak dapat dimuat.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slotsKey]);


  const slotsLoading = slotsKey !== null && slotsResult?.key !== slotsKey;
  const availability =
    slotsKey !== null && slotsResult?.key === slotsKey ? slotsResult : null;

  function handleServiceChange(id: string) {
    setServiceId(id);
    setSelectedTime(null);
    setFormError(null);
  }

  function handleDateChange(value: string) {
    setDate(value);
    setSelectedTime(null);
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !token || !service || !dateValid || !selectedTime) return;

    setSubmitting(true);
    setFormError(null);
    const trimmedLocation = location.trim();
    const trimmedNotes = notes.trim();
    try {
      await createBooking(token, {
        serviceId: service.id,
        startTime: `${date}T${selectedTime}:00+07:00`,
        ...(trimmedLocation ? { location: trimmedLocation } : {}),
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      });
      router.replace('/bookings');
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setFormError(CONFLICT_MESSAGE);
        setSelectedTime(null);
        setNonce((n) => n + 1);
      } else {
        setFormError(
          error instanceof Error ? error.message : 'Terjadi kesalahan.',
        );
      }
      setSubmitting(false);
    }
  }

  if (!ready || !isLoggedIn) {
    return <div aria-busy="true" className="min-h-[24rem]" />;
  }

  const durationMin = availability?.data?.durationMin ?? service?.durationMin;
  const canSubmit =
    Boolean(service && dateValid && selectedTime) && !submitting;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {formError}
        </div>
      )}

      <Section step={1} title="Pilih layanan">
        {!services.loaded ? (
          <div className="h-11 animate-pulse rounded-xl bg-petal/50" />
        ) : services.error ? (
          <p role="alert" className="text-sm text-red-600">
            {services.error}
          </p>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="service" className="block text-sm font-medium text-ink">
              Layanan
            </label>
            <select
              id="service"
              value={service?.id ?? ''}
              onChange={(e) => handleServiceChange(e.target.value)}
              disabled={submitting}
              className={selectClass}
            >
              <option value="" disabled>
                Pilih layanan…
              </option>
              {services.list.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatRupiah(s.price)} ({s.durationMin} menit)
                </option>
              ))}
            </select>
          </div>
        )}
      </Section>

      <Section step={2} title="Pilih tanggal & jam">
        <FormField
          id="date"
          label="Tanggal"
          type="date"
          min={minDate}
          value={date}
          onChange={(e) => handleDateChange(e.target.value)}
          disabled={submitting || !service}
          hint={
            service
              ? 'Booking dapat dibuat mulai besok. Jam operasional 08.00–17.00 WIB.'
              : 'Pilih layanan terlebih dahulu.'
          }
        />

        {service && dateValid && (
          <div className="mt-5" aria-live="polite">
            <p className="mb-2 text-sm font-medium text-ink">Jam mulai (WIB)</p>
            {slotsLoading ? (
              <div
                aria-busy="true"
                aria-label="Memuat jam tersedia"
                className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse rounded-xl bg-petal/50"
                  />
                ))}
              </div>
            ) : availability?.error ? (
              <p role="alert" className="text-sm text-red-600">
                {availability.error}
              </p>
            ) : availability?.data && availability.data.slots.length > 0 ? (
              <>
                <div
                  role="group"
                  aria-label="Pilih jam mulai"
                  className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6"
                >
                  {availability.data.slots.map((slot) => {
                    const selected = slot.time === selectedTime;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available || submitting}
                        aria-pressed={selected}
                        onClick={() => {
                          setSelectedTime(slot.time);
                          setFormError(null);
                        }}
                        className={`rounded-xl border px-2 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood focus-visible:ring-offset-2 ${
                          selected
                            ? 'border-rosewood bg-rosewood text-white shadow-sm'
                            : slot.available
                              ? 'border-petal bg-white text-ink hover:border-rosewood hover:bg-blush'
                              : 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 line-through'
                        }`}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
                {availability.data.slots.every((s) => !s.available) && (
                  <p className="mt-3 text-sm text-ink-soft">
                    Semua jam pada tanggal ini sudah penuh. Coba tanggal lain.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-soft">
                Tidak ada jam tersedia untuk layanan ini pada tanggal tersebut.
              </p>
            )}
          </div>
        )}
      </Section>

      <Section step={3} title="Detail tambahan">
        <div className="space-y-4">
          <FormField
            id="location"
            label="Lokasi (opsional)"
            type="text"
            placeholder="Alamat atau nama tempat acara"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={submitting}
          />
          <div className="space-y-1.5">
            <label htmlFor="notes" className="block text-sm font-medium text-ink">
              Catatan (opsional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Mis. tema makeup, jumlah orang, preferensi warna"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              className="w-full rounded-xl border border-petal bg-white px-4 py-2.5 text-ink transition placeholder:text-ink-soft/60 focus:border-rosewood focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood/60 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>
      </Section>

      <section
        aria-labelledby="summary-heading"
        className="rounded-2xl border border-petal bg-blush/60 p-5 sm:p-6"
      >
        <h2
          id="summary-heading"
          className="mb-3 font-display text-xl font-semibold text-ink"
        >
          Ringkasan
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Layanan</dt>
            <dd className="text-right font-medium text-ink">
              {service ? service.name : '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Tanggal</dt>
            <dd className="text-right font-medium text-ink">
              {date ? formatWibDate(dateFromWibIso(date)) : '—'}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Jam</dt>
            <dd className="text-right font-medium text-ink">
              {selectedTime && durationMin
                ? `${selectedTime} – ${addMinutesToTime(selectedTime, durationMin)} WIB`
                : '—'}
            </dd>
          </div>
          {location.trim() && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Lokasi</dt>
              <dd className="text-right font-medium text-ink">
                {location.trim()}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4 border-t border-petal pt-3 text-base">
            <dt className="font-medium text-ink">Total</dt>
            <dd className="font-semibold text-rosewood-dark">
              {service ? formatRupiah(service.price) : '—'}
            </dd>
          </div>
        </dl>
        <div className="mt-5">
          <SubmitButton
            loading={submitting}
            loadingText="Memproses…"
            disabled={!canSubmit}
          >
            Buat booking
          </SubmitButton>
        </div>
      </section>
    </form>
  );
}

export default function BookingPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">
          Buat Booking
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Pilih layanan dan jadwalmu.{' '}
          <Link
            href="/#pricelist"
            className="font-medium text-rosewood underline-offset-4 hover:underline"
          >
            Lihat pricelist
          </Link>
        </p>
      </div>
      <Suspense fallback={<div aria-busy="true" className="min-h-[24rem]" />}>
        <BookingForm />
      </Suspense>
    </div>
  );
}
