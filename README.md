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

## Catatan penting tentang data

Seluruh data (siswa, pembayaran, pengaturan) disimpan di **localStorage browser** masing-masing pengguna. Artinya:

- Perubahan hanya terlihat di browser tempat perubahan dilakukan.
- Data tidak dibagi antar pengguna atau perangkat.
- Data hilang bila penyimpanan browser dibersihkan.

Untuk penggunaan nyata oleh yayasan, aplikasi perlu disambungkan ke backend + database bersama. Cadangkan data lewat **Pengaturan → Database → Download Backup (.json)**.

## Struktur proyek

```
src/
  components/   # Halaman & modal (Dashboard, Pembayaran, Siswa, WhatsApp, Laporan, Portal, Pengaturan)
  services/     # storage (localStorage), WhatsApp, PDF, template Excel
  data/         # Data awal & pengaturan bawaan
  types/        # Tipe TypeScript
public/assets/  # Logo yayasan
```

## Teknologi

React 19, TypeScript, Vite 8, Tailwind CSS 4, jsPDF, SheetJS (`xlsx`), lucide-react.
