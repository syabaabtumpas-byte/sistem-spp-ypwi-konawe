import React, { useState } from 'react';
import { 
  X, 
  Lock, 
  User, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  ArrowRight,
  UserPlus,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { AppUser, UserRole } from '../types';
import { storage } from '../services/storage';

interface AuthModalProps {
  currentUser: AppUser | null;
  onClose: () => void;
  onLoginSuccess: (user: AppUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  onClose,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Register Form State
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
      setErrorMsg('Akun Anda masih MENUNGGU PERSETUJUAN dari Administrator Sistem YPWI Konawe.');
      return;
    }

    if (user.status === 'NONAKTIF') {
      setErrorMsg('Akun ini telah dinonaktifkan oleh Administrator.');
      return;
    }

    // Success
    storage.setCurrentUser(user);
    onLoginSuccess(user);
    onClose();
  };

  const handleQuickLogin = (targetUser: AppUser) => {
    if (targetUser.status === 'MENUNGGU_PERSETUJUAN') {
      alert(`Akun "${targetUser.namaLengkap}" masih menunggu persetujuan Administrator.`);
      return;
    }
    storage.setCurrentUser(targetUser);
    onLoginSuccess(targetUser);
    onClose();
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regNama || !regUsername || !regPassword) {
      setErrorMsg('Lengkapi Nama, Username, dan Password!');
      return;
    }

    // Check existing
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
      status: 'MENUNGGU_PERSETUJUAN', // Requires Admin Approval
      tanggalDibuat: new Date().toISOString().split('T')[0],
    };

    storage.saveUser(newUser);
    setRegSuccess(
      `Pendaftaran berhasil! Akun "${newUser.namaLengkap}" telah dibuat dan saat ini berstatus MENUNGGU PERSETUJUAN dari Administrator Sistem YPWI Konawe.`
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-emerald-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-900/50 rounded-2xl border border-emerald-600/40 text-emerald-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black leading-tight">
                Autentikasi Akun Sistem SPP
              </h2>
              <p className="text-xs text-emerald-200">
                Yayasan Pendidikan Wahdah Islamiyah Konawe
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => { setActiveTab('LOGIN'); setErrorMsg(null); setRegSuccess(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'LOGIN'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Masuk / Login Akun
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('REGISTER'); setErrorMsg(null); }}
            className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
              activeTab === 'REGISTER'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Daftar Akun Baru (Menunggu Approval)
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          
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
                <span>Permintaan Terkirim!</span>
              </div>
              <p className="text-[11px] leading-relaxed text-emerald-900/90">{regSuccess}</p>
            </div>
          )}

          {/* TAB 1: FORM LOGIN */}
          {activeTab === 'LOGIN' && (
            <div className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username atau Email</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: admin atau bendahara"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      placeholder="Masukkan kata sandi..."
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Masuk ke Aplikasi</span>
                </button>
              </form>

              {/* Quick Login Switcher for Demonstration & Testing */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                    Pilih Cepat Akun Peran (Demo Langsung):
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    1-Click Login
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {users.filter(u => u.status === 'AKTIF').map((u) => {
                    const isCurrent = currentUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleQuickLogin(u)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500'
                            : 'bg-slate-50 hover:bg-emerald-50/50 border-slate-200'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-900 text-xs truncate">
                            {u.namaLengkap}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            Username: <strong>{u.username}</strong> • Peran: <span className="font-semibold text-emerald-700">{u.role}</span>
                          </p>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'BENDAHARA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : u.role === 'KASIR'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isCurrent ? '✓ Aktif' : 'Masuk'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER AKUN BARU */}
          {activeTab === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>Catatan Keamanan:</strong> Setiap pendaftaran akun baru harus melalui verifikasi dan <strong>disetujui (approval) oleh Administrator Sistem</strong> sebelum dapat digunakan login.
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
                    placeholder="Contoh: fauzan_kasir"
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
                    <option value="KASIR">Kasir Penerima SPP Seluruh Sekolah</option>
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
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Ajukan Pendaftaran Akun ke Administrator</span>
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
