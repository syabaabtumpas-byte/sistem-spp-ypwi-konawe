# Sistem SPP YPWI Konawe

Aplikasi informasi pembayaran SPP **Yayasan Pendidikan Wahdah Islamiyah Konawe** (RA/TK, SDIT, SMPIT, SMAIT/Tahfidz): pencatatan pembayaran, kuitansi PDF, otomasi notifikasi WhatsApp, laporan keuangan, dan portal mandiri wali murid.

## Fitur

- **Dashboard** — rekap kas masuk, siswa lunas, tunggakan, potensi piutang, dan rekap per unit pendidikan.
- **Pembayaran SPP** — pilih unit & kelas, centang beberapa bulan sekaligus, hitung SPP + biaya lain + infaq pembangunan + infaq WIZ.
- **Data Siswa & Wali** — CRUD siswa, nomor WhatsApp wali, impor massal.
- **WhatsApp Notifikasi** — pengingat tagihan personal, pengiriman massal, template pesan yang bisa diedit, log pengiriman.
- **Laporan Keuangan** — buku kas masuk, daftar tunggakan, rekap metode & bank, ekspor CSV, cetak PDF.
- **Portal Wali Murid** — cek tagihan lewat NIS/nama tanpa login, unduh kuitansi PDF per bulan.
- **Peran pengguna** — Admin, Bendahara, Kasir, Ketua Yayasan, Pengawas.
- **Impor massal** — template Excel (`.xlsx`) dan CSV, keduanya memakai pemetaan kolom yang sama.

## Menjalankan secara lokal

```bash
npm install
npm run dev      # http://localhost:3000
```

Perintah lain:

```bash
npm run build    # build produksi ke folder dist/
npm run preview  # pratinjau hasil build
npm run lint     # pemeriksaan tipe (tsc --noEmit)
```

Tidak diperlukan API key. Halaman login menyediakan tombol **1-Klik Masuk** untuk tiap peran demo.

## Deploy ke GitHub Pages

Repo sudah dilengkapi workflow `.github/workflows/deploy.yml`:

1. Push ke branch `main`.
2. Buka **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Workflow akan menjalankan `npm ci`, `npm run build`, lalu menerbitkan `dist/`.

Aplikasi memakai base path relatif (`base: './'`), sehingga tetap berfungsi baik di domain root maupun di subfolder `https://username.github.io/nama-repo/`. Untuk hosting lain (Netlify, Vercel, Cloudflare Pages), cukup build dengan `npm run build` dan arahkan output ke `dist`.

## Mode penyimpanan data

Aplikasi punya dua mode, dipilih lewat berkas `.env` (lihat `.env.example`).

### Mode lokal (bawaan, tanpa konfigurasi)

Data disimpan di **localStorage browser** masing-masing pengguna:

- Perubahan hanya terlihat di browser tempat perubahan dilakukan.
- Data tidak dibagi antar pengguna atau perangkat.
- Data hilang bila penyimpanan browser dibersihkan.

Cocok untuk mencoba aplikasi atau pemakaian satu komputer kasir.

### Mode cloud (data bersama)

Bila `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` diisi, aplikasi memakai database Supabase sehingga semua pengurus melihat data yang sama dari perangkat mana pun. Langkah mengaktifkannya:

1. Buat proyek gratis di [supabase.com](https://supabase.com), lalu buka **SQL Editor** dan jalankan seluruh isi `supabase/schema.sql`.
2. Buka **Authentication → Users → Add user** dan buat akun untuk tiap pengurus (email + kata sandi). Ini akun login aplikasi pada mode cloud.
3. Salin **Project URL** dan **anon public key** dari **Project Settings → API** ke berkas `.env`:

   ```bash
   VITE_SUPABASE_URL="https://xxxx.supabase.co"
   VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."
   ```

4. Build ulang (`npm run build`). Saat build untuk GitHub Pages, isi variabel yang sama sebagai **Repository secrets** (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) agar workflow meneruskannya.

Cara kerjanya:

- Login memakai email + kata sandi akun Supabase; tombol masuk cepat dinonaktifkan agar tidak melewati autentikasi.
- Email akun harus terdaftar pada daftar pengguna aplikasi (**Pengaturan → Pengguna**) dengan status AKTIF agar peran dan hak aksesnya dikenali.
- Data disinkronkan dua arah: perubahan dikirim beberapa saat setelah disimpan, dan data terbaru diambil setiap 20 detik serta saat aplikasi dibuka.
- Bila server belum punya data (instalasi pertama), data lokal diunggah sebagai isi awal.
- Konflik diselesaikan *last-write-wins* per kelompok data (siswa, pembayaran, pengaturan, log WhatsApp, pengguna). Hindari dua orang menyunting data yang sama pada saat bersamaan.
- Status sinkronisasi dan tombol **Sinkronkan Sekarang** ada di **Pengaturan → Database**.
- `anon key` memang dirancang untuk dipakai di aplikasi publik; keamanan data dijaga Row Level Security di database (hanya pengguna yang sudah login dapat membaca/menulis).

Cadangkan data kapan saja lewat **Pengaturan → Database → Download Backup (.json)**.

## Struktur proyek

```
src/
  components/   # Halaman & modal (Dashboard, Pembayaran, Siswa, WhatsApp, Laporan, Portal, Pengaturan)
  services/     # storage (localStorage), cloud (sinkronisasi Supabase), WhatsApp, PDF, template Excel
  data/         # Data awal & pengaturan bawaan
  types/        # Tipe TypeScript
public/assets/  # Logo yayasan
supabase/
  schema.sql    # Tabel app_state + RLS untuk mode cloud
```

## Teknologi

React 19, TypeScript, Vite 8, Tailwind CSS 4, jsPDF, SheetJS (`xlsx`), lucide-react.
