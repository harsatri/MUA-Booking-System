import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: AuthCardProps) {
  return (
    <section className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 sm:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-petal/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-blush blur-3xl"
      />
      <div className="relative w-full max-w-md rounded-3xl border border-petal/70 bg-white/90 p-6 shadow-xl shadow-rosewood/5 backdrop-blur sm:p-8">
        <h1 className="font-display text-3xl font-semibold text-ink">
          {title}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-center text-sm text-ink-soft">{footer}</p>
      </div>
    </section>
  );
}
