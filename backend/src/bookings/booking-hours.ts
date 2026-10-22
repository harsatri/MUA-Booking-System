/** Jam operasional & slot booking (zona waktu WIB, UTC+7 tanpa DST). */
export const WIB_OFFSET_MIN = 7 * 60;
export const OPEN_MIN = 8 * 60; // 08:00
export const CLOSE_MIN = 17 * 60; // 17:00
export const SLOT_MIN = 30;

const MS_PER_MIN = 60_000;

export interface WibParts {
  /** Menit sejak 00:00 WIB. */
  minuteOfDay: number;
  /** Detik + milidetik (bukan 0 berarti tidak sejajar slot). */
  subMinuteMs: number;
}

export function toWibParts(date: Date): WibParts {
  const shifted = new Date(date.getTime() + WIB_OFFSET_MIN * MS_PER_MIN);
  return {
    minuteOfDay: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    subMinuteMs: shifted.getUTCSeconds() * 1000 + shifted.getUTCMilliseconds(),
  };
}

/** Awal hari (00:00 WIB) untuk tanggal 'YYYY-MM-DD'; null jika tanggal tidak valid. */
export function wibDayStart(dateStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  if (Number.isNaN(start.getTime())) return null;
  // Tolak tanggal yang "bergulir" (mis. 2026-02-31).
  const back = new Date(start.getTime() + WIB_OFFSET_MIN * MS_PER_MIN)
    .toISOString()
    .slice(0, 10);
  return back === dateStr ? start : null;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MS_PER_MIN);
}

export function formatHHmm(minuteOfDay: number): string {
  const h = String(Math.floor(minuteOfDay / 60)).padStart(2, '0');
  const m = String(minuteOfDay % 60).padStart(2, '0');
  return `${h}:${m}`;
}
