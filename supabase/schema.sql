-- ============================================================
-- Skema database Sistem SPP YPWI Konawe (mode cloud / Supabase)
-- Jalankan seluruh isi berkas ini di Supabase -> SQL Editor -> Run.
-- ============================================================

-- Menyimpan satu "dokumen" per kelompok data aplikasi:
--   students   -> daftar siswa
--   payments   -> daftar pembayaran
--   settings   -> pengaturan yayasan
--   waLogs     -> log notifikasi WhatsApp
--   users      -> daftar akun & peran pengurus
create table if not exists public.app_state (
  key         text primary key,
  payload     jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);

comment on table public.app_state is
  'Data bersama aplikasi SPP YPWI Konawe. Satu baris per kelompok data.';

-- Row Level Security: hanya pengurus yang sudah login (akun Supabase)
-- yang boleh membaca dan menulis. Anon key tidak bisa mengakses data.
alter table public.app_state enable row level security;

drop policy if exists "app_state read for authenticated" on public.app_state;
create policy "app_state read for authenticated"
  on public.app_state
  for select
  to authenticated
  using (true);

drop policy if exists "app_state insert for authenticated" on public.app_state;
create policy "app_state insert for authenticated"
  on public.app_state
  for insert
  to authenticated
  with check (updated_by is null or updated_by = auth.uid());

drop policy if exists "app_state update for authenticated" on public.app_state;
create policy "app_state update for authenticated"
  on public.app_state
  for update
  to authenticated
  using (true)
  with check (updated_by is null or updated_by = auth.uid());

-- Semua pengurus boleh mengelola data; penghapusan dibatasi admin
-- lewat aplikasi, bukan lewat database.

-- Index bantu untuk pemantauan perubahan.
create index if not exists app_state_updated_at_idx
  on public.app_state (updated_at desc);
