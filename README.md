# MUA Booking System

Aplikasi web untuk booking jasa makeup artist (MUA): pelanggan melihat pricelist, memilih jadwal yang masih kosong, membayar DP secara online, lalu memantau riwayat booking. Proyek ini berbentuk monorepo dengan dua aplikasi: `backend` (REST API) dan `frontend` (web).

## Fitur

- **Pricelist layanan** — daftar layanan per kategori lengkap dengan harga dan durasi.
- **Booking dengan cek jadwal bentrok** — slot 30 menit pada jam operasional 08:00–17:00 WIB; slot yang sudah lewat atau bentrok otomatis tidak bisa dipilih.
- **Autentikasi JWT dengan role** — registrasi dan login; role `CUSTOMER` dan `ADMIN` (kelola layanan hanya untuk admin).
- **Pembayaran DP via Midtrans (sandbox)** — DP 30% dibayar lewat Midtrans Snap; status booking berubah ke `PAID` otomatis.
- **Riwayat dan pembatalan booking** — pelanggan melihat status booking dan dapat membatalkan booking yang belum selesai.

## Tech Stack

| Lapisan | Teknologi |
| --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Pembayaran | Midtrans Snap (sandbox) |
| CI | GitHub Actions |
| Hosting | Vercel (frontend), Render (backend), Neon (PostgreSQL) |

## Arsitektur

```mermaid
flowchart LR
    U[Pelanggan / Browser] -->|HTTPS| FE[Frontend<br/>Next.js - Vercel]
    FE -->|REST + JWT| BE[Backend<br/>NestJS - Render]
    BE -->|Prisma| DB[(PostgreSQL<br/>Neon)]
    BE -->|Snap API| MT[Midtrans Sandbox]
    FE -->|Redirect ke Snap| MT
    MT -->|Webhook notifikasi<br/>+ verifikasi signature| BE
```

## Keputusan Teknis

- **Zona waktu WIB, disimpan sebagai UTC.** Frontend mengirim waktu dengan offset `+07:00`; database menyimpan `DateTime` dalam UTC. Jam operasional dan slot dihitung di backend dalam WIB, dan frontend menampilkannya dengan `Asia/Jakarta`.
- **Validasi di backend.** Jam operasional, kesejajaran slot 30 menit, waktu di masa depan, dan bentrok jadwal selalu diperiksa di server; validasi di frontend hanya untuk kenyamanan pengguna.
- **Verifikasi signature webhook.** Notifikasi Midtrans diterima hanya jika `SHA512(order_id + status_code + gross_amount + server key)` cocok dengan `signature_key` (dibandingkan dengan `timingSafeEqual`). Nominal pada notifikasi juga dicocokkan dengan DP yang tersimpan.
- **Nominal DP dihitung server.** Klien tidak pernah mengirim nominal; server menghitung `round(totalPrice × 30%)` dan membuat `order_id` baru di setiap percobaan bayar.
- **Idempotensi.** Perubahan ke `PAID` hanya terjadi dari status `PENDING` lewat satu update atomik, sehingga notifikasi ganda tidak berefek dan booking yang sudah `PAID`/`CONFIRMED`/`DONE`/`CANCELLED` tidak pernah diubah. Frontend juga menyelaraskan status lewat endpoint `sync` saat halaman riwayat dibuka (berguna jika webhook belum sampai, mis. di lokal).

## Menjalankan Secara Lokal

Prasyarat: Node.js 22+, npm, dan PostgreSQL (lokal atau via Docker).

### 1. Database

**Opsi A — Docker (disarankan).** Dari root repo:

```bash
docker compose up -d
```

Database `makeup_booking` tersedia di `localhost:5432` (user `postgres`, password `postgres`).

**Opsi B — PostgreSQL lokal.** Buat database kosong bernama `makeup_booking`, lalu sesuaikan `DATABASE_URL` di langkah berikut.

### 2. Backend (port 3000)

```bash
cd backend
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

Isi `backend/.env`:

| Variabel | Keterangan |
| --- | --- |
| `DATABASE_URL` | Mis. `postgresql://postgres:postgres@localhost:5432/makeup_booking` (sesuai Docker di atas) |
| `JWT_SECRET` | String acak yang panjang |
| `MIDTRANS_SERVER_KEY` | Server key sandbox dari dashboard Midtrans |
| `FRONTEND_URL` | `http://localhost:3001` (tanpa trailing slash) |
| `PORT` | Opsional, default `3000` |

Lalu migrasi database, (opsional) isi data contoh, dan jalankan:

```bash
npx prisma migrate deploy
npx prisma generate
```

Data contoh layanan ada di `backend/prisma/sample-data.sql`:

```bash
# dengan psql
psql "$DATABASE_URL" -f prisma/sample-data.sql

# atau lewat container Docker (PowerShell)
Get-Content prisma/sample-data.sql | docker exec -i makeup-db psql -U postgres -d makeup_booking
```

```bash
npm run start:dev
```

### 3. Frontend (port 3001)

Di terminal kedua:

```bash
cd frontend
npm install
cp .env.example .env.local  # Windows PowerShell: Copy-Item .env.example .env.local
npm run dev                 # sudah memakai port 3001
```

`NEXT_PUBLIC_API_URL` di `.env.local` harus menunjuk ke backend (default `http://localhost:3000`). Buka <http://localhost:3001>.

### Akun admin

Daftar akun lewat halaman Daftar, lalu ubah role-nya langsung di database:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'email-kamu@contoh.com';
```

### Menguji pembayaran di lokal

Webhook Midtrans membutuhkan URL publik. Untuk mencobanya di lokal, buka backend lewat tunnel (mis. ngrok) dan isi **Payment Notification URL** di dashboard Midtrans sandbox dengan `https://<tunnel>/payments/notification`. Tanpa webhook, status tetap diperbarui lewat sinkronisasi saat halaman **Booking Saya** dibuka.

## Deploy

| Komponen | Layanan | Pengaturan utama |
| --- | --- | --- |
| Database | Neon | Salin connection string ke `DATABASE_URL` (tambahkan `?sslmode=require` jika belum ada) |
| Backend | Render (Web Service) | Root directory `backend` · Build: `npm install --include=dev && npx prisma generate && npm run build` · Start: `npm run start:render` (menjalankan `prisma migrate deploy` lalu server) · Env: `DATABASE_URL`, `JWT_SECRET`, `MIDTRANS_SERVER_KEY`, `FRONTEND_URL` |
| Frontend | Vercel | Root directory `frontend` · Env: `NEXT_PUBLIC_API_URL` = URL backend di Render |

Setelah backend aktif, isi Payment Notification URL di dashboard Midtrans sandbox dengan `https://<backend-render>/payments/notification`.

CI (`.github/workflows/ci.yml`) menjalankan build backend dan frontend secara paralel di setiap push dan pull request ke `main`.

## Endpoint Utama

| Method | Path | Akses | Deskripsi |
| --- | --- | --- | --- |
| POST | `/auth/register` | Publik | Registrasi pengguna |
| POST | `/auth/login` | Publik | Login, mengembalikan `accessToken` JWT |
| GET | `/services` | Publik | Daftar layanan (pricelist) |
| GET | `/services/:id` | Publik | Detail layanan |
| POST / PATCH / DELETE | `/services`, `/services/:id` | Admin | Kelola layanan |
| GET | `/bookings/availability?date=YYYY-MM-DD&serviceId=` | Publik | Slot jam tersedia pada suatu tanggal |
| POST | `/bookings` | Login | Buat booking |
| GET | `/bookings/my` | Login | Riwayat booking milik sendiri |
| GET | `/bookings` | Admin | Semua booking |
| PATCH | `/bookings/:id/cancel` | Login (pemilik) | Batalkan booking |
| POST | `/payments/bookings/:id/pay` | Login (pemilik) | Buat transaksi Snap DP, mengembalikan `redirectUrl` |
| POST | `/payments/bookings/:id/sync` | Login (pemilik) | Selaraskan status pembayaran dengan Midtrans |
| POST | `/payments/notification` | Publik (signature) | Webhook notifikasi Midtrans |

## Demo

<!-- TODO: tambahkan link demo (frontend) setelah deploy ke Vercel -->
<!-- TODO: tambahkan link backend/API setelah deploy ke Render -->
<!-- TODO: tambahkan screenshot: beranda/pricelist, form booking, riwayat booking, halaman pembayaran Midtrans -->

> **Catatan:** backend di-host pada free tier sehingga akan "tidur" saat tidak dipakai. Permintaan pertama bisa memakan waktu hingga beberapa puluh detik; tunggu sebentar lalu muat ulang jika perlu.

## Pengembangan Lanjutan

- Dashboard admin (kelola layanan, lihat dan konfirmasi booking).
- Pembatalan otomatis booking yang tidak dibayar dalam batas waktu tertentu.
- Transaksi dengan isolation level `Serializable` untuk mencegah race condition saat dua pelanggan membooking slot yang sama bersamaan.
- Test otomatis (unit dan end-to-end) serta langkahnya di CI.
