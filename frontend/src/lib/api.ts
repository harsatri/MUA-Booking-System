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
    throw new Error(
      extractErrorMessage(body, `Permintaan gagal (status ${res.status}).`),
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
