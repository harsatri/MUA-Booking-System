export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMin: number;
  category: string;
  isActive: boolean;
}

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
}

export interface LoginResponse {
  accessToken: string;
}

export type BookingStatus =
  | 'PENDING'
  | 'PAID'
  | 'CONFIRMED'
  | 'DONE'
  | 'CANCELLED';

export interface AvailabilitySlot {
  time: string;
  available: boolean;
}

export interface Availability {
  date: string;
  durationMin: number;
  slots: AvailabilitySlot[];
}

export interface Booking {
  id: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  totalPrice: number;
  status: BookingStatus;
  dpAmount: number | null;
  orderId: string | null;
  paidAt: string | null;
}

export interface MyBooking extends Booking {
  service: Service;
}

export interface CreateBookingInput {
  serviceId: string;
  startTime: string;
  location?: string;
  notes?: string;
}

/** Error API dengan status HTTP, agar UI bisa membedakan mis. 409. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: number): string {
  return rupiahFormatter.format(amount);
}

const NETWORK_ERROR_MESSAGE =
  'Tidak dapat terhubung ke server. Coba lagi beberapa saat.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Ambil pesan dari body error API ({ message: string | string[] }). */
function extractErrorMessage(body: unknown, fallback: string): string {
  if (isRecord(body)) {
    const { message } = body;
    if (typeof message === 'string' && message.length > 0) return message;
    if (Array.isArray(message)) {
      const parts = message.filter(
        (item): item is string => typeof item === 'string',
      );
      if (parts.length > 0) return parts.join(', ');
    }
  }
  return fallback;
}

async function readJson(res: Response): Promise<unknown> {
  try {
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new Error(NETWORK_ERROR_MESSAGE);
  }

  const body = await readJson(res);
  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, `Permintaan gagal (status ${res.status}).`),
      res.status,
    );
  }
  return body as T;
}

export function apiPost<TResponse, TBody extends object>(
  path: string,
  body: TBody,
): Promise<TResponse> {
  return apiFetch<TResponse>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function getServices(): Promise<Service[]> {
  return apiFetch<Service[]>('/services', { cache: 'no-store' });
}

export function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<RegisteredUser> {
  return apiPost<RegisteredUser, typeof input>('/auth/register', input);
}

export function loginUser(input: {
  email: string;
  password: string;
}): Promise<LoginResponse> {
  return apiPost<LoginResponse, typeof input>('/auth/login', input);
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export function getAvailability(
  date: string,
  serviceId: string,
): Promise<Availability> {
  const query = new URLSearchParams({ date, serviceId });
  return apiFetch<Availability>(`/bookings/availability?${query.toString()}`, {
    cache: 'no-store',
  });
}

export function createBooking(
  token: string,
  input: CreateBookingInput,
): Promise<Booking> {
  return apiFetch<Booking>('/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  });
}

export function getMyBookings(token: string): Promise<MyBooking[]> {
  return apiFetch<MyBooking[]>('/bookings/my', {
    headers: authHeaders(token),
    cache: 'no-store',
  });
}

export function cancelBooking(token: string, id: string): Promise<Booking> {
  return apiFetch<Booking>(`/bookings/${encodeURIComponent(id)}/cancel`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
}

export function createPayment(
  token: string,
  bookingId: string,
): Promise<{ redirectUrl: string }> {
  return apiFetch<{ redirectUrl: string }>(
    `/payments/bookings/${encodeURIComponent(bookingId)}/pay`,
    { method: 'POST', headers: authHeaders(token) },
  );
}

export function syncPayment(token: string, bookingId: string): Promise<Booking> {
  return apiFetch<Booking>(
    `/payments/bookings/${encodeURIComponent(bookingId)}/sync`,
    { method: 'POST', headers: authHeaders(token) },
  );
}
