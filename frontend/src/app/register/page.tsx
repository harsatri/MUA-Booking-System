'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthCard from '@/components/AuthCard';
import FormField from '@/components/FormField';
import SubmitButton from '@/components/SubmitButton';
import { registerUser } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { ready, isLoggedIn } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && isLoggedIn) router.replace('/');
  }, [ready, isLoggedIn, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const nextErrors: FieldErrors = {};
    if (trimmedName.length === 0) {
      nextErrors.name = 'Nama wajib diisi.';
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = 'Masukkan alamat email yang valid.';
    }
    if (password.length < 8) {
      nextErrors.password = 'Password minimal 8 karakter.';
    }
    setErrors(nextErrors);
    setApiError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      await registerUser({
        name: trimmedName,
        email: trimmedEmail,
        password,
      });
      router.push('/login?registered=1');
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
      title="Buat akun baru"
      subtitle="Daftar untuk mulai booking layanan makeup."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link
            href="/login"
            className="font-medium text-rosewood underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood"
          >
            Masuk
          </Link>
        </>
      }
    >
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
          id="name"
          label="Nama lengkap"
          type="text"
          autoComplete="name"
          placeholder="Nama kamu"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          disabled={loading}
        />
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
          autoComplete="new-password"
          hint="Minimal 8 karakter."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          disabled={loading}
        />
        <SubmitButton loading={loading} loadingText="Mendaftarkan…">
          Daftar
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
