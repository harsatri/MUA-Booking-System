import { formatRupiah, getServices, type Service } from '@/lib/api';
import Link from 'next/link';

function groupByCategory(services: Service[]): [string, Service[]][] {
  const groups = new Map<string, Service[]>();
  for (const service of services) {
    const list = groups.get(service.category);
    if (list) list.push(service);
    else groups.set(service.category, [service]);
  }
  return [...groups.entries()];
}

function Notice({ title, message }: { title: string; message: string }) {
  return (
    <div
      role="status"
      className="mx-auto max-w-lg rounded-2xl border border-petal bg-white/80 px-6 py-10 text-center"
    >
      <p className="font-display text-xl text-ink">{title}</p>
      <p className="mt-2 text-sm text-ink-soft">{message}</p>
    </div>
  );
}

export function PricelistSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat pricelist" className="space-y-6">
      <div className="h-7 w-40 animate-pulse rounded-full bg-petal/60" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-52 animate-pulse rounded-2xl border border-petal/60 bg-white/70"
          />
        ))}
      </div>
    </div>
  );
}

export default async function Pricelist() {
  let services: Service[];
  try {
    services = (await getServices()).filter((s) => s.isActive);
  } catch {
    return (
      <Notice
        title="Pricelist belum dapat dimuat"
        message="Server sedang tidak dapat dihubungi. Silakan muat ulang halaman beberapa saat lagi."
      />
    );
  }

  if (services.length === 0) {
    return (
      <Notice
        title="Belum ada layanan"
        message="Layanan makeup akan segera tersedia. Kunjungi lagi nanti ya!"
      />
    );
  }

  return (
    <div className="space-y-12">
      {groupByCategory(services).map(([category, items]) => (
        <section key={category} aria-labelledby={`cat-${category}`}>
          <h3
            id={`cat-${category}`}
            className="mb-5 flex items-center gap-3 font-display text-2xl font-semibold text-ink"
          >
            {category}
            <span aria-hidden="true" className="h-px flex-1 bg-petal" />
          </h3>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((service) => (
              <li
                key={service.id}
                className="group flex flex-col rounded-2xl border border-petal/70 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rosewood/10"
              >
                <h4 className="font-display text-xl font-semibold text-ink">
                  {service.name}
                </h4>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                  {service.description ?? 'Tanpa deskripsi.'}
                </p>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Durasi {service.durationMin} menit
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-lg font-semibold text-rosewood-dark">
                    {formatRupiah(service.price)}
                  </span>
                  <Link
                    href="/login"
                    className="rounded-full bg-rosewood px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-rosewood-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rosewood focus-visible:ring-offset-2"
                  >
                    Booking
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
