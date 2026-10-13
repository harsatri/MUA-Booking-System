'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthCard from '@/components/AuthCard';
import FormField from '@/components/FormField';
import SubmitButton from '@/components/SubmitButton';
import { loginUser } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, isLoggedIn, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const justRegistered = searchParams.get('registered') === '1';

  useEffect(() => {
    if (ready && isLoggedIn) router.replace('/');
  }, [ready, isLoggedIn, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const trimmedEmail = email.trim().toLowerCase();
    const nextErrors: FieldErrors = {};
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = 'Masukkan alamat email yang valid.';
    }
    if (password.length === 0) {
      nextErrors.password = 'Password wajib diisi.';
    }
    setErrors(nextErrors);
    setApiError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      const { accessToken } = await loginUser({
        email: trimmedEmail,
        password,
      });
      login(accessToken);
      router.replace('/');
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : 'Terjadi kesalahan.',
      );
      setLoading(false);
    }
  }

  if (!ready || isLoggedIn) {
    return <div aria-busy="true" className="min-h-[24rem]" />;
  }

  return (
    <AuthCard
      title="Selamat datang kembali"
      subtitle="Masuk untuk melanjutkan booking makeup-mu."
      footer={
        <>
          Belum punya akun?{' '}
          <Link
            href="/register"
            className="font-medium text-rosewood underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood"
          >
            Daftar
          </Link>
        </>
      }
    >
      {justRegistered && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          Pendaftaran berhasil! Silakan masuk dengan akunmu.
        </div>
      )}
      {apiError && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {apiError}
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          disabled={loading}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={loading}
        />
        <SubmitButton loading={loading} loadingText="Memproses…">
          Masuk
        </SubmitButton>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div aria-busy="true" className="min-h-[24rem]" />}>
      <LoginForm />
    </Suspense>
  );
}
