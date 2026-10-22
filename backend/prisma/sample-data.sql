-- Data contoh tabel "Service". Jalankan setelah `npx prisma migrate deploy`:
--   psql "$DATABASE_URL" -f prisma/sample-data.sql
-- Aman dijalankan ulang: baris dengan id yang sama dilewati.

INSERT INTO "Service" ("id", "name", "description", "price", "durationMin", "category", "isActive") VALUES
  ('svc_makeup_wisuda',    'Makeup Wisuda',    'Makeup natural dan tahan lama untuk hari wisuda.',            350000,   90, 'Makeup', true),
  ('svc_makeup_pengantin', 'Makeup Pengantin', 'Makeup pengantin lengkap untuk akad maupun resepsi.',         1500000, 180, 'Makeup', true),
  ('svc_makeup_pesta',     'Makeup Pesta',     'Makeup glamor untuk undangan, lamaran, dan acara spesial.',    500000,  90, 'Makeup', true),
  ('svc_makeup_harian',    'Makeup Harian',    'Makeup ringan dan segar untuk aktivitas sehari-hari.',         250000,  60, 'Makeup', true),
  ('svc_hairdo',           'Hairdo',           'Penataan rambut sesuai tema makeup (add-on).',                 150000,  45, 'Add-on', true),
  ('svc_hijab_do',         'Hijab Do',         'Penataan hijab rapi dan elegan (add-on).',                     100000,  30, 'Add-on', true)
ON CONFLICT ("id") DO NOTHING;
