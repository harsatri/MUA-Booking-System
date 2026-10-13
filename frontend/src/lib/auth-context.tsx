'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

export type Role = 'CUSTOMER' | 'ADMIN';

export interface JwtPayload {
  sub: string;
  role: Role;
  exp?: number;
}

interface AuthContextValue {
  token: string | null;
  role: Role | null;
  isLoggedIn: boolean;
  /** false saat SSR/hidrasi, true setelah di klien — cegah UI berkedip. */
  ready: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const TOKEN_KEY = 'mua_token';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Decode bagian tengah JWT (base64url) tanpa library. Tidak memverifikasi tanda tangan. */
function decodeJwt(token: string): JwtPayload | null {
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const data: unknown = JSON.parse(json);
    if (!isRecord(data)) return null;
    const { sub, role, exp } = data;
    if (typeof sub !== 'string') return null;
    if (role !== 'CUSTOMER' && role !== 'ADMIN') return null;
    return {
      sub,
      role,
      exp: typeof exp === 'number' ? exp : undefined,
    };
  } catch {
    return null;
  }
}

function isExpired(payload: JwtPayload): boolean {
  return payload.exp !== undefined && payload.exp * 1000 <= Date.now();
}

// --- Penyimpanan token (localStorage) sebagai external store ---

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === TOKEN_KEY || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Token valid tersimpan, atau null (juga null jika rusak/kedaluwarsa). */
function getStoredToken(): string | null {
  try {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (!stored) return null;
    const payload = decodeJwt(stored);
    return payload && !isExpired(payload) ? stored : null;
  } catch {
    return null;
  }
}

function getServerToken(): string | null {
  return null;
}

function removeStoredToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage tidak tersedia; abaikan.
  }
  notify();
}

const subscribeNever = (): (() => void) => () => {};
const getReadyClient = (): boolean => true;
const getReadyServer = (): boolean => false;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useSyncExternalStore(
    subscribe,
    getStoredToken,
    getServerToken,
  );
  const ready = useSyncExternalStore(
    subscribeNever,
    getReadyClient,
    getReadyServer,
  );

  const payload = useMemo(() => (token ? decodeJwt(token) : null), [token]);

  const login = useCallback((newToken: string) => {
    const decoded = decodeJwt(newToken);
    if (!decoded || isExpired(decoded)) return;
    try {
      window.localStorage.setItem(TOKEN_KEY, newToken);
    } catch {
      // localStorage tidak tersedia; sesi tidak dapat disimpan.
    }
    notify();
  }, []);

  const logout = useCallback(() => {
    removeStoredToken();
  }, []);

  // Keluarkan pengguna otomatis saat token kedaluwarsa & bersihkan token basi.
  useEffect(() => {
    if (!ready) return;
    if (!token) {
      if (window.localStorage.getItem(TOKEN_KEY)) removeStoredToken();
      return;
    }
    const exp = payload?.exp;
    if (exp === undefined) return;
    const delay = exp * 1000 - Date.now();
    const timer = window.setTimeout(
      removeStoredToken,
      Math.min(Math.max(delay, 0), 2_147_483_647),
    );
    return () => window.clearTimeout(timer);
  }, [ready, token, payload]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      role: payload?.role ?? null,
      isLoggedIn: token !== null,
      ready,
      login,
      logout,
    }),
    [token, payload, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  }
  return ctx;
}
