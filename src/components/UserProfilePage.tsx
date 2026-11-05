import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  User, 
  MessageSquare, 
  Mail, 
  Camera, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Key, 
  Shield, 
  Settings, 
  Users, 
  LogOut, 
  Calendar, 
  Check, 
  Sparkles,
  Building2,
  FileCheck2,
  Award
} from 'lucide-react';
import { AppUser, FoundationSettings } from '../types';
import { storage } from '../services/storage';

interface UserProfilePageProps {
  currentUser: AppUser | null;
  settings: FoundationSettings;
  onBack: () => void;
  onOpenAuth: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({
  currentUser,
  settings,
  onBack,
  onOpenAuth,
  onOpenSettings,
  onLogout,
}) => {
  const [photoSaveSuccess, setPhotoSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!currentUser) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center max-w-md mx-auto my-12 border border-slate-200 shadow-sm">
        <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Sesi Belum Aktif</h3>
        <p className="text-xs text-slate-500 mt-1 mb-4">Silakan masuk dengan akun terdaftar terlebih dahulu.</p>
        <button
          onClick={onOpenAuth}
          className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 cursor-pointer"
        >
          Masuk ke Akun
        </button>
      </div>
    );
  }

  const handleSelfPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Pilih file gambar valid (JPG, PNG, atau WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const updated = { ...currentUser, fotoUrl: dataUrl };
        storage.saveUser(updated);
        storage.setCurrentUser(updated);
        setPhotoSaveSuccess(true);
        setTimeout(() => setPhotoSaveSuccess(false), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    if (window.confirm('Hapus foto profil dan gunakan avatar inisial nama?')) {
      const updated = { ...currentUser, fotoUrl: undefined };
      storage.saveUser(updated);
      storage.setCurrentUser(updated);
      setPhotoSaveSuccess(true);
      setTimeout(() => setPhotoSaveSuccess(false), 3000);
    }
  };

  const getRoleInfo = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          title: 'Administrator Sistem Yayasan',
          badge: 'bg-purple-100 text-purple-800 border-purple-200',
          desc: 'Memiliki otoritas penuh mengelola konfigurasi yayasan, rekening kas, nama sekolah, logo, dan menyetujui akun seluruh staf.',
          permissions: [
            'Mengubah identitas, rekening & logo yayasan',
            'Mengatur nama & biaya SPP seluruh unit sekolah',
            'Menyetujui & mengelola akun Bendahara, Kasir, Pengawas & Ketua',
            'Mengakses rekapitulasi keuangan & seluruh pencatatan transaksi',
            'Mengirim notifikasi tagihan massal via WhatsApp'
          ]
        };
      case 'BENDAHARA':
        return {
          title: 'Bendahara Keuangan Yayasan',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          desc: 'Bertanggung jawab penuh atas rekapitulasi penerimaan kas, validasi setoran SPP siswa, dan laporan keuangan resmi yayasan.',
          permissions: [
            'Melihat rekapitulasi kas masuk & kolektibilitas per unit sekolah',
            'Ekspor laporan keuangan bulanan (Excel/CSV & PDF)',
            'Memantau status pelunasan siswa secara real-time',
            'Menerbitkan dan memvalidasi kuitansi kuitansi pembayaran resmi'
          ]
        };
      case 'KASIR':
        return {
          title: 'Kasir SPP Seluruh Sekolah',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          desc: 'Bertugas melayani pembayaran SPP di loket kasir sekolah, menerima infaq sukarela, dan mengirimkan resi kuitansi digital via WhatsApp.',
          permissions: [
            'Mencatat pembayaran SPP bulanan siswa per unit sekolah',
            'Menerima tambahan Infaq Pembangunan & Infaq WIZ',
            'Mencetak kuitansi pembayaran format resmi PDF',
            'Mengirimkan resi digital otomatis ke WhatsApp wali murid'
          ]
        };
      case 'KETUA_YAYASAN':
        return {
          title: 'Ketua Yayasan Pendidikan Wahdah Islamiyah',
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          desc: 'Memantau kinerja operasional, penerimaan SPP dari semua jenjang pendidikan (RA, SDIT, SMPIT, SMAIT), serta perkembangan kas yayasan.',
          permissions: [
            'Akses eksekutif Dashboard monitoring real-time',
            'Melihat laporan keuangan dan efektivitas tagihan',
            'Memantau rekapitulasi siswa yang belum lunas SPP'
          ]
        };
      case 'PENGAWAS':
        return {
          title: 'Pengawas Yayasan',
          badge: 'bg-slate-100 text-slate-800 border-slate-200',
          desc: 'Melakukan fungsi pengawasan, audit independen terhadap seluruh mutasi kas masuk, serta kepatuhan prosedur keuangan.',
          permissions: [
            'Audit rekaman transaksi kas masuk SPP & infaq',
            'Memeriksa riwayat pengiriman notifikasi WhatsApp',
            'Verifikasi data siswa dan kepatuhan penerimaan'
          ]
        };
      default:
        return {
          title: 'Pengguna Terdaftar',
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          desc: 'Pengguna terverifikasi sistem administrasi SPP YPWI Konawe.',
          permissions: ['Melihat data informasi yang diizinkan']
        };
    }
  };

  const roleInfo = getRoleInfo(currentUser.role);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Top Navigation Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
          
          <div className="h-5 w-px bg-slate-200 hidden sm:block"></div>
          
          <div>
            <h1 className="text-base font-black text-slate-900 leading-tight">
              Profil & Detail Akun Pengguna
            </h1>
            <p className="text-xs text-slate-500">
              Kelola informasi kredensial, foto tampilan, dan otoritas akses sistem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAuth}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Ganti Akun</span>
          </button>

          <button
            onClick={onLogout}
            className="px-3 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Hero Profile Banner Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Banner Graphic Header */}
        <div className="h-36 sm:h-44 bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-900 relative p-6 flex flex-col justify-between text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top badges */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-emerald-200 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-emerald-300" />
              <span>Sistem SPP Resmi YPWI Konawe</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/30 text-emerald-100 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Akun Aktif Terverifikasi</span>
            </div>
          </div>

          {/* Bottom Banner Content: Placed on the RIGHT side to ensure the bottom-left is 100% free for the photo avatar */}
          <div className="relative z-10 flex items-end justify-end text-right">
            <div className="hidden md:block max-w-md">
              <h2 className="text-base sm:text-lg font-bold text-white/95 drop-shadow-sm">
                {settings.namaYayasan}
              </h2>
              <p className="text-xs text-emerald-200/85 font-medium mt-0.5">
                Unit Pendidikan: RA / TK Islam · SDIT · SMPIT · SMAIT / Tahfidzul Qur'an Unaaha
              </p>
            </div>
          </div>
        </div>

        {/* User Identity & Photo Bar */}
        <div className="px-6 pb-6 pt-2">
          <div className="-mt-14 sm:-mt-16 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 pb-4 border-b border-slate-100">
            
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              {/* Photo Avatar */}
              <div className="relative group shrink-0">
                {currentUser.fotoUrl ? (
                  <img 
                    src={currentUser.fotoUrl} 
                    alt={currentUser.namaLengkap} 
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-white shadow-xl bg-white"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-800 text-white flex items-center justify-center text-4xl font-black ring-4 ring-white shadow-xl">
                    {currentUser.namaLengkap.charAt(0)}
                  </div>
                )}

                {/* Camera quick upload trigger */}
                <label 
                  className="absolute -bottom-2 -right-2 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg cursor-pointer transition-all active:scale-95 border-2 border-white"
                  title="Ganti Foto Profil Anda"
                >
                  <Camera className="w-4 h-4" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleSelfPhotoUpload} 
                    className="hidden" 
                  />
                </label>
              </div>

              {/* Title & Role Info */}
              <div className="pb-1">
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${roleInfo.badge}`}>
                    {roleInfo.title}
                  </span>
                  <span className="font-mono text-xs text-slate-500 font-semibold bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    @{currentUser.username}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 leading-snug">
                  {currentUser.namaLengkap}
                </h2>
                
                <p className="text-xs text-slate-500 mt-0.5">
                  Terdaftar sejak: <strong>{currentUser.tanggalDibuat || '2024-01-01'}</strong> • Otorisasi: <strong className="text-emerald-700">{currentUser.disetujuiOleh || 'Administrator'}</strong>
                </p>
              </div>
            </div>

            {/* Photo Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl cursor-pointer shadow-xs transition-all text-xs">
                <Upload className="w-4 h-4" />
                <span>Upload Foto Baru</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleSelfPhotoUpload} 
                  className="hidden" 
                />
              </label>

              {currentUser.fotoUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  title="Hapus foto profil dan gunakan avatar inisial"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-slate-200 hover:border-rose-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

          </div>

          {/* Photo Save Notification Banner */}
          {photoSaveSuccess && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-800 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Foto profil akun Anda telah berhasil diperbarui dan tersimpan dalam sistem!</span>
            </div>
          )}
        </div>

      </div>

      {/* Main Grid: Detail Informasi & Hak Akses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Data Kredensial Pengguna (2 Cols span) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Rincian Akun & Kredensial */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <User className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Rincian Identitas Kredensial</h3>
                  <p className="text-[11px] text-slate-500">Informasi utama akun yang digunakan dalam aplikasi</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                Aktif & Terdaftar
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-1">
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Nama Lengkap
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {currentUser.namaLengkap}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-1">
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  Username Login
                </span>
                <p className="font-mono font-bold text-slate-900 text-sm">
                  @{currentUser.username}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-1">
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  Nomor WhatsApp Terhubung
                </span>
                <p className="font-mono font-bold text-slate-900 text-sm">
                  {currentUser.noWa ? currentUser.noWa : 'Belum ditambahkan'}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-1">
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  Email Kredensial
                </span>
                <p className="font-bold text-slate-900 text-sm truncate" title={currentUser.email}>
                  {currentUser.email || `${currentUser.username}@wahdah.or.id`}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-1">
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Terakhir Login
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {currentUser.terakhirLogin || 'Sesi ini (Hari ini)'}
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-1">
                <span className="text-slate-400 text-[11px] font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  Status Otorisasi
                </span>
                <p className="font-bold text-emerald-700 text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Disetujui Administrator
                </p>
              </div>

            </div>
          </div>

          {/* Card: Wewenang & Hak Akses Peran */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hak Akses & Batas Wewenang</h3>
                <p className="text-[11px] text-slate-500">Fasilitas sistem yang dapat diakses oleh peran akun Anda</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
              {roleInfo.desc}
            </p>

            <div className="space-y-2 pt-1">
              <p className="text-xs font-bold text-slate-800">Daftar Fitur yang Diberikan:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {roleInfo.permissions.map((perm, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-slate-700 font-medium">{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Profil Yayasan & Tindakan Cepat (1 Col) */}
        <div className="space-y-6">
          
          {/* Card: Lembaga & Yayasan Info */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white rounded-3xl p-6 border border-emerald-100 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white p-1 border border-emerald-200 shadow-xs shrink-0 flex items-center justify-center">
                <img 
                  src={settings.logoUrl || 'assets/aistudio/LOGO_YAYASAN_d78c341b.png'} 
                  alt="Logo Yayasan" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm leading-tight">
                  {settings.namaYayasan}
                </h4>
                <p className="text-[11px] text-emerald-800 font-semibold">
                  Unaaha, Kab. Konawe, Sulawesi Tenggara
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2 pt-2 border-t border-emerald-100">
              <div className="flex justify-between py-1 border-b border-emerald-50">
                <span className="text-slate-500">Rekening Kas SPP:</span>
                <span className="font-mono font-bold text-slate-900">7148892019 (BSI)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-emerald-50">
                <span className="text-slate-500">Atas Nama:</span>
                <span className="font-bold text-slate-900">YPWI KONAWE</span>
              </div>
              <div className="flex justify-between py-1 border-b border-emerald-50">
                <span className="text-slate-500">WA Center:</span>
                <span className="font-mono font-bold text-emerald-800">{settings.nomorWaYayasan}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Bendahara Resmi:</span>
                <span className="font-bold text-slate-900">{settings.namaBendahara}</span>
              </div>
            </div>
          </div>

          {/* Card: Tindakan Akun & Navigasi */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tindakan Akun
            </h4>

            {currentUser.role === 'ADMIN' && (
              <button
                onClick={onOpenSettings}
                className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-950 font-bold text-xs transition-all cursor-pointer text-left group"
              >
                <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                  <Settings className="w-4 h-4" />
                </span>
                <div>
                  <p className="leading-tight">Pengaturan Yayasan & Sekolah</p>
                  <p className="text-[10px] text-emerald-700/80 font-normal">Identitas, logo, rekening & staf</p>
                </div>
              </button>
            )}

            <button
              onClick={onOpenAuth}
              className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs transition-all cursor-pointer text-left group border border-slate-200/80"
            >
              <span className="p-2 bg-slate-200 text-slate-700 rounded-xl group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <p className="leading-tight">Ganti Akun / Switch User</p>
                <p className="text-[10px] text-slate-500 font-normal">Masuk dengan akun staf lain</p>
              </div>
            </button>

            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 p-3 rounded-2xl bg-rose-50 hover:bg-rose-100/80 text-rose-800 font-bold text-xs transition-all cursor-pointer text-left group border border-rose-100"
            >
              <span className="p-2 bg-rose-600 text-white rounded-xl shadow-xs group-hover:scale-105 transition-transform">
                <LogOut className="w-4 h-4" />
              </span>
              <div>
                <p className="leading-tight">Keluar / Logout Akun</p>
                <p className="text-[10px] text-rose-600/80 font-normal">Akhiri sesi penggunaan aplikasi ini</p>
              </div>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
