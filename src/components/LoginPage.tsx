import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  UserPlus, 
  GraduationCap, 
  ArrowRight,
  School,
  ExternalLink
} from 'lucide-react';
import { AppUser, UserRole, FoundationSettings } from '../types';
import { storage } from '../services/storage';

interface LoginPageProps {
  settings: FoundationSettings;
  onLoginSuccess: (user: AppUser) => void;
  onOpenParentPortal: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  settings,
  onLoginSuccess,
  onOpenParentPortal,
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Register state
  const [regNama, setRegNama] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regNoWa, setRegNoWa] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('KASIR');
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  const users = storage.getUsers();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const user = users.find(
      u => (u.username.toLowerCase() === usernameInput.trim().toLowerCase() ||
            u.email.toLowerCase() === usernameInput.trim().toLowerCase())
    );

    if (!user) {
      setErrorMsg('Username atau email tidak terdaftar.');
      return;
    }

    if (user.password && user.password !== passwordInput.trim()) {
      setErrorMsg('Password yang Anda masukkan salah.');
      return;
    }

    if (user.status === 'MENUNGGU_PERSETUJUAN') {
      setErrorMsg('Akun Anda masih MENUNGGU PERSETUJUAN dari Administrator Sistem YPWI Konawe. Silakan hubungi Administrator.');
      return;
    }

    if (user.status === 'NONAKTIF') {
      setErrorMsg('Akun ini telah dinonaktifkan oleh Administrator.');
      return;
    }

    // Success
    storage.setCurrentUser(user);
    onLoginSuccess(user);
  };

  const handleQuickLogin = (targetUser: AppUser) => {
    if (targetUser.status === 'MENUNGGU_PERSETUJUAN') {
      alert(`Akun "${targetUser.namaLengkap}" masih berstatus MENUNGGU PERSETUJUAN Administrator.`);
      return;
    }
    storage.setCurrentUser(targetUser);
    onLoginSuccess(targetUser);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regNama || !regUsername || !regPassword) {
      setErrorMsg('Mohon lengkapi Nama, Username, dan Password!');
      return;
    }

    const existing = users.find(u => u.username.toLowerCase() === regUsername.trim().toLowerCase());
    if (existing) {
      setErrorMsg('Username sudah digunakan. Silakan pilih username lain.');
      return;
    }

    const newUser: AppUser = {
      id: `usr-${Date.now()}`,
      namaLengkap: regNama.trim(),
      username: regUsername.trim(),
      email: regEmail.trim() || `${regUsername.trim()}@ypwi.org`,
      noWa: regNoWa.trim() || '',
      password: regPassword.trim(),
      role: regRole,
      status: 'MENUNGGU_PERSETUJUAN',
      tanggalDibuat: new Date().toISOString().split('T')[0],
    };

    storage.saveUser(newUser);
    setRegSuccess(
      `Pendaftaran berhasil! Akun "${newUser.namaLengkap}" telah dibuat dan saat ini berstatus MENUNGGU PERSETUJUAN dari Administrator YPWI Konawe.`
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      
      {/* Background Islamic geometric accent glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Branding Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 sm:p-7 text-center relative">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-1 rounded-2xl mx-auto mb-3 shadow-md border-2 border-emerald-300">
            <img
              src={settings.logoUrl || 'assets/aistudio/LOGO_YAYASAN_d78c341b.png'}
              alt="Logo YPWI Konawe"
              className="w-full h-full object-contain"
            />
          </div>

          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-900/60 text-emerald-200 border border-emerald-500/30 mb-1">
            Portal Keamanan & Hak Akses
          </span>

          <h1 className="text-lg sm:text-xl font-black text-white leading-tight">
            Sistem Informasi SPP YPWI Konawe
          </h1>
          <p className="text-xs text-emerald-100/90 mt-1 max-w-md mx-auto">
            {settings.namaYayasan} • RA/TK, SDIT, SMPIT, SMAIT / Tahfidz
          </p>
        </div>

        {/* Tab Toggle: Login vs Register */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => { setIsRegisterMode(false); setErrorMsg(null); setRegSuccess(null); }}
            className={`flex-1 py-3.5 text-center border-b-2 transition-all cursor-pointer ${
              !isRegisterMode
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Masuk / Login Akun
          </button>
          <button
            type="button"
            onClick={() => { setIsRegisterMode(true); setErrorMsg(null); }}
            className={`flex-1 py-3.5 text-center border-b-2 transition-all cursor-pointer ${
              isRegisterMode
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Daftar Akun Baru (Menunggu Approval)
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-7 space-y-5 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {regSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pendaftaran Berhasil Dikirim!</span>
              </div>
              <p className="text-[11px] text-emerald-900/90 leading-relaxed">{regSuccess}</p>
            </div>
          )}

          {!isRegisterMode ? (
            /* FORM LOGIN */
            <div className="space-y-5">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username atau Email</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: admin atau kasir"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kata Sandi (Password)</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      placeholder="Masukkan kata sandi..."
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold rounded-xl shadow-md shadow-emerald-700/20 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Masuk ke Sistem Aplikasi</span>
                </button>
              </form>

              {/* Quick Login Buttons (Pre-configured authorized accounts for testing) */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Pilih Cepat Akun Peran (Demo Langsung):
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    1-Klik Masuk
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {users.filter(u => u.status === 'AKTIF').slice(0, 5).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleQuickLogin(u)}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-1">
                        <p className="font-bold text-slate-900 text-xs truncate">
                          {u.namaLengkap.split('(')[0]}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          User: <strong>{u.username}</strong>
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold shrink-0 ${
                        u.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'BENDAHARA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : u.role === 'KASIR'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {u.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            /* FORM REGISTER */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>Pemberitahuan:</strong> Setiap pendaftaran akun baru harus <strong>disetujui (diapprove) oleh Administrator Sistem</strong> terlebih dahulu sebelum dapat digunakan untuk login.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ust. Ahmad Fauzan, S.Pd.I."
                  value={regNama}
                  onChange={(e) => setRegNama(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username Login *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: kasir_unaaha"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Peran Yang Diminta *</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-xs cursor-pointer"
                  >
                    <option value="KASIR">Kasir Penerima Pembayaran SPP</option>
                    <option value="BENDAHARA">Bendahara Yayasan</option>
                    <option value="KETUA_YAYASAN">Ketua Yayasan</option>
                    <option value="PENGAWAS">Pengawas Yayasan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="081234567890"
                    value={regNoWa}
                    onChange={(e) => setRegNoWa(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kata Sandi (Password) *</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 4 karakter"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Ajukan Pendaftaran ke Administrator</span>
              </button>
            </form>
          )}

          {/* Special Link for Parents without accounts */}
          <div className="pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={onOpenParentPortal}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
            >
              <span>👨‍👩‍👧 Orang Tua / Wali Murid? Klik Di Sini untuk Cek Tagihan Siswa</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      <p className="mt-4 text-xs text-slate-400 text-center">
        {settings.namaYayasan} • Sistem SPP & WhatsApp Gateway
      </p>

    </div>
  );
};
