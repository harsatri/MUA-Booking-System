import type { BookingStatus } from '@/lib/api';

const TIME_ZONE = 'Asia/Jakarta';

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatWibDate(date: Date): string {
  return dateFormatter.format(date);
}

/** Jam "HH.mm" (format id-ID) dalam WIB. */
export function formatWibTime(date: Date): string {
  return timeFormatter.format(date);
}

/** Tanggal 'YYYY-MM-DD' menurut WIB, dengan penambahan hari opsional. */
export function wibIsoDate(base: Date, addDays = 0): string {
  return isoDateFormatter.format(new Date(base.getTime() + addDays * 86_400_000));
}

/** 'YYYY-MM-DD' (tanggal WIB) -> Date pada tengah hari WIB, aman untuk diformat. */
export function dateFromWibIso(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00+07:00`);
}

/** Tambah menit ke string 'HH:mm', hasil 'HH:mm'. */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: 'Menunggu',
  PAID: 'Dibayar',
  CONFIRMED: 'Dikonfirmasi',
  DONE: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export const STATUS_STYLE: Record<BookingStatus, string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  PAID: 'border-sky-200 bg-sky-50 text-sky-800',
  CONFIRMED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  DONE: 'border-stone-200 bg-stone-100 text-stone-700',
  CANCELLED: 'border-red-200 bg-red-50 text-red-700',
};

export const CANCELLABLE: readonly BookingStatus[] = [
  'PENDING',
  'PAID',
  'CONFIRMED',
];
