import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  MessageSquare, 
  TrendingUp, 
  UserCheck, 
  Settings,
  PlusCircle,
  ShieldCheck,
  User,
  LogOut,
  ChevronDown,
  Camera,
  Upload,
  X,
  Check,
  CheckCircle2,
  Phone,
  Mail,
  Trash2,
  Shield
} from 'lucide-react';
import { FoundationSettings, AppUser } from '../types';
import { storage } from '../services/storage';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  settings: FoundationSettings;
  currentUser: AppUser | null;
  pendingApprovalsCount?: number;
  onOpenSettings: () => void;
  onOpenNewPayment: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  currentUser,
  pendingApprovalsCount = 0,
  onOpenSettings,
  onOpenNewPayment,
  onOpenAuth,
  onLogout,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [photoSaveSuccess, setPhotoSaveSuccess] = useState(false);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelfPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
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
    if (!currentUser) return;
    const updated = { ...currentUser, fotoUrl: undefined };
    storage.saveUser(updated);
    storage.setCurrentUser(updated);
    setPhotoSaveSuccess(true);
    setTimeout(() => setPhotoSaveSuccess(false), 3000);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pembayaran', label: 'Pembayaran SPP', icon: CreditCard },
    { id: 'siswa', label: 'Data Siswa & Wali', icon: Users },
    { id: 'whatsapp', label: 'WhatsApp Notifikasi', icon: MessageSquare },
    { id: 'laporan', label: 'Laporan Keuangan', icon: TrendingUp },
    { id: 'portal', label: 'Portal Wali Murid', icon: UserCheck },
  ];

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return { 
          label: 'Administrator', 
          desc: 'Akses Penuh Seluruh Sistem & Konfigurasi', 
          bg: 'bg-purple-100 text-purple-800 border-purple-200' 
        };
      case 'BENDAHARA':
        return { 
          label: 'Bendahara Yayasan', 
          desc: 'Arus Kas SPP & Rekapitulasi Keuangan', 
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' 
        };
      case 'KASIR':
        return { 
          label: 'Kasir SPP', 
          desc: 'Penerimaan Pembayaran SPP Seluruh Sekolah', 
          bg: 'bg-blue-100 text-blue-800 border-blue-200' 
        };
      case 'KETUA_YAYASAN':
        return { 
          label: 'Ketua Yayasan', 
          desc: 'Monitoring Eksekutif & Laporan Penerimaan', 
          bg: 'bg-amber-100 text-amber-800 border-amber-200' 
        };
      case 'PENGAWAS':
        return { 
          label: 'Pengawas Yayasan', 
          desc: 'Audit & Pengawasan Kolektibilitas Kas', 
          bg: 'bg-slate-100 text-slate-800 border-slate-200' 
        };
      default:
        return { 
          label: 'Pengguna', 
          desc: 'Pengguna Terdaftar Sistem YPWI', 
          bg: 'bg-slate-100 text-slate-700 border-slate-200' 
        };
    }
  };

  const roleBadge = getRoleBadge(currentUser?.role);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      {/* Top Brand Bar */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white text-xs py-1.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-emerald-100">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-medium tracking-wide">
              {settings.namaYayasan} — Unit RA/TK, SDIT, SMPIT, SMAIT / Tahfidz Unaaha Konawe
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>WA Center: <strong className="text-white">{settings.nomorWaYayasan}</strong></span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">Rek. BSI: <strong className="text-white">7148892019</strong> a.n YPWI KONAWE</span>
          </div>
        </div>
      </div>

      {/* Main Nav Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo & Brand Identity */}
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0 bg-white p-0.5 rounded-xl border border-emerald-200 shadow-xs group-hover:scale-105 transition-transform duration-200">
              <img 
                src={settings.logoUrl || 'assets/aistudio/LOGO_YAYASAN_d78c341b.png'} 
                alt="Logo YPWI Konawe" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">
                  Sistem SPP {settings.namaSingkat || 'YPWI Konawe'}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Resmi
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {settings.namaYayasan}
              </p>
            </div>
          </div>

          {/* User Account & Quick Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Logged in User Dropdown Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                title="Klik untuk Kelola Profil, Upload Foto, atau Menu Administrator"
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer text-left group ${
                  isDropdownOpen 
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs' 
                    : 'bg-slate-50 hover:bg-emerald-50/70 border-slate-200 hover:border-emerald-300'
                }`}
              >
                {currentUser?.fotoUrl ? (
                  <img 
                    src={currentUser.fotoUrl} 
                    alt={currentUser.namaLengkap} 
                    className="w-8 h-8 rounded-lg object-cover border border-emerald-300 shadow-xs group-hover:scale-105 transition-transform shrink-0" 
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {currentUser?.namaLengkap?.charAt(0) || 'U'}
                  </div>
                )}
                
                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[160px]">
                    {currentUser?.namaLengkap || 'Belum Login'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-extrabold border ${roleBadge.bg}`}>
                      {roleBadge.label}
                    </span>
                    {currentUser?.username && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        @{currentUser.username}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-emerald-700' : ''}`} />
              </button>

              {/* RAPIH DROPDOWN MENU POPOVER */}
              {isDropdownOpen && (
                <>
                  {/* Invisible backdrop to dismiss click outside */}
                  <div 
                    className="fixed inset-0 z-40 bg-transparent" 
                    onClick={() => setIsDropdownOpen(false)} 
                  />
                  
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-84 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden ring-1 ring-slate-900/10 animate-in fade-in slide-in-from-top-2 duration-150">
                    
                    {/* Profil Header Card */}
                    <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white p-4 relative">
                      <div className="flex items-start gap-3">
                        <div className="relative group shrink-0">
                          {currentUser?.fotoUrl ? (
                            <img 
                              src={currentUser.fotoUrl} 
                              alt={currentUser.namaLengkap} 
                              className="w-13 h-13 rounded-xl object-cover border-2 border-emerald-300/80 shadow-md"
                            />
                          ) : (
                            <div className="w-13 h-13 rounded-xl bg-emerald-900/80 text-white flex items-center justify-center font-black text-xl border-2 border-emerald-300/60 shadow-md">
                              {currentUser?.namaLengkap?.charAt(0) || 'A'}
                            </div>
                          )}

                          {/* Quick Camera Trigger */}
                          <label 
                            className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg shadow-sm cursor-pointer transition-transform active:scale-95 border border-white"
                            title="Ganti Foto Profil Anda"
                          >
                            <Camera className="w-3 h-3" />
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleSelfPhotoUpload} 
                              className="hidden" 
                            />
                          </label>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-white/20 text-white border border-white/30">
                              {roleBadge.label}
                            </span>
                            <span className="text-[10px] text-emerald-200 font-mono">
                              @{currentUser?.username}
                            </span>
                          </div>
                          
                          <h4 className="text-sm font-bold text-white mt-1 leading-snug truncate" title={currentUser?.namaLengkap}>
                            {currentUser?.namaLengkap}
                          </h4>
                          
                          <p className="text-[11px] text-emerald-100/90 truncate">
                            {currentUser?.email || (currentUser?.noWa ? `WA: ${currentUser.noWa}` : 'Sistem Keuangan YPWI')}
                          </p>
                        </div>
                      </div>

                      {/* Photo Upload Row inside Header */}
                      <div className="mt-3 pt-2.5 border-t border-emerald-600/60 flex items-center justify-between gap-2">
                        <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-lg text-[11px] font-semibold cursor-pointer transition-all border border-white/20">
                          <Upload className="w-3 h-3" />
                          <span>Ganti Foto Profil</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleSelfPhotoUpload} 
                            className="hidden" 
                          />
                        </label>

                        {photoSaveSuccess ? (
                          <span className="text-[11px] font-bold text-emerald-200 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                            Foto Tersimpan!
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsDropdownOpen(false);
                              setActiveTab('profile');
                            }}
                            className="text-[11px] text-emerald-200 hover:text-white underline cursor-pointer"
                          >
                            Detail Akun
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Navigable Menu Options */}
                    <div className="p-2 space-y-1 text-xs">
                      {currentUser?.role === 'ADMIN' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setIsDropdownOpen(false);
                              onOpenSettings();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-emerald-950 hover:bg-emerald-50/70 font-semibold transition-all cursor-pointer text-left group"
                          >
                            <span className="p-1.5 rounded-lg bg-emerald-100/80 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                              <Settings className="w-3.5 h-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-800 group-hover:text-emerald-950">Pengaturan Yayasan & Sekolah</p>
                              <p className="text-[10px] text-slate-500 font-normal">Nama sekolah, logo, rekening & unit</p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsDropdownOpen(false);
                              onOpenSettings();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-emerald-950 hover:bg-emerald-50/70 font-semibold transition-all cursor-pointer text-left group"
                          >
                            <span className="p-1.5 rounded-lg bg-purple-100/80 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-bold text-slate-800 group-hover:text-emerald-950">Persetujuan & Kelola Akun</p>
                                {pendingApprovalsCount > 0 && (
                                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-white">
                                    {pendingApprovalsCount} Baru
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-normal">Bendahara, Kasir, Pengawas & Ketua</p>
                            </div>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          setActiveTab('profile');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-emerald-950 hover:bg-emerald-50/70 font-semibold transition-all cursor-pointer text-left group"
                      >
                        <span className="p-1.5 rounded-lg bg-blue-100/80 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <User className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 group-hover:text-emerald-950">Lihat Profil Lengkap</p>
                          <p className="text-[10px] text-slate-500 font-normal">Buka halaman profil & rincian akun</p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onOpenAuth();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-emerald-950 hover:bg-emerald-50/70 font-semibold transition-all cursor-pointer text-left group"
                      >
                        <span className="p-1.5 rounded-lg bg-teal-100/80 text-teal-700 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                          <Users className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 group-hover:text-emerald-950">Ganti Akun / Switch User</p>
                          <p className="text-[10px] text-slate-500 font-normal">Masuk dengan akun pengurus yang lain</p>
                        </div>
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-semibold transition-all cursor-pointer text-left group"
                      >
                        <span className="p-1.5 rounded-lg bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                          <LogOut className="w-3.5 h-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-rose-700">Keluar / Logout Akun</p>
                          <p className="text-[10px] text-rose-500 font-normal">Akhiri sesi penggunaan aplikasi ini</p>
                        </div>
                      </button>
                    </div>

                  </div>
                </>
              )}
            </div>

            {/* Quick Catat Bayar Button */}
            <button
              onClick={onOpenNewPayment}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer glow-btn"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden xs:inline">Catat Bayar SPP</span>
              <span className="xs:hidden">Bayar</span>
            </button>

            {/* Settings Button (Only for Admin or authorized staff) */}
            {currentUser?.role === 'ADMIN' && (
              <button
                onClick={onOpenSettings}
                title="Pengaturan Yayasan, Nama/Logo Sekolah & Akun"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200 relative glow-btn-neutral"
              >
                <Settings className="w-4 h-4" />
                {pendingApprovalsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                )}
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={onLogout}
              title="Keluar / Logout Akun"
              className="p-2 text-rose-600 hover:text-white hover:bg-rose-600 rounded-xl transition-all cursor-pointer border border-rose-200 glow-btn-neutral"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="mt-3 flex items-center gap-1 overflow-x-auto no-scrollbar border-t border-slate-100 pt-2 text-xs sm:text-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer glow-tab ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-xs ring-1 ring-emerald-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

    </header>
  );
};


