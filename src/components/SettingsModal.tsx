import React, { useEffect, useState } from 'react';
import { 
  X, 
  Building2, 
  CreditCard, 
  Save, 
  Database, 
  Cloud,
  RefreshCw,
  Download, 
  Upload, 
  Plus, 
  Trash2,
  CheckCircle2,
  AlertTriangle,
  School,
  Image as ImageIcon,
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  KeyRound,
  RotateCcw,
  Camera,
  Sparkles
} from 'lucide-react';
import { FoundationSettings, RekeningBank, UnitSekolahConfig, AppUser, UserRole } from '../types';
import { storage } from '../services/storage';
import { getSyncStatus, syncNow } from '../services/cloud';
import { DEFAULT_WIZ_LOGO, DEFAULT_PEMBANGUNAN_LOGO } from '../data/initialData';

interface SettingsModalProps {
  settings: FoundationSettings;
  currentUser: AppUser | null;
  onClose: () => void;
  onSave: (settings: FoundationSettings) => void;
  onOpenAuthModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  currentUser,
  onClose,
  onSave,
  onOpenAuthModal,
}) => {
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'SCHOOLS' | 'USERS' | 'BANKS' | 'DATABASE'>('SCHOOLS');
  const [formData, setFormData] = useState<FoundationSettings>({ ...settings });
  const [syncInfo, setSyncInfo] = useState(getSyncStatus());

  useEffect(() => {
    const handleSyncStatus = () => setSyncInfo(getSyncStatus());
    window.addEventListener('ypwi_sync_status', handleSyncStatus);
    return () => window.removeEventListener('ypwi_sync_status', handleSyncStatus);
  }, []);
  const [daftarSekolah, setDaftarSekolah] = useState<UnitSekolahConfig[]>([...(settings.daftarSekolah || [])]);
  const [rekeningList, setRekeningList] = useState<RekeningBank[]>([...settings.rekeningList]);
  const [successToast, setSuccessToast] = useState(false);

  // Users State
  const [usersList, setUsersList] = useState<AppUser[]>(storage.getUsers());
  const [newUserModal, setNewUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState<Partial<AppUser>>({
    namaLengkap: '',
    username: '',
    email: '',
    noWa: '',
    password: '123',
    role: 'KASIR',
    status: 'AKTIF',
  });

  // Handle Logo Upload File (converts image file to Base64 dataURL)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Pilih file gambar yang valid (PNG, JPG, atau WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData(prev => ({ ...prev, logoUrl: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Reset to default official logo
  const handleResetDefaultLogo = () => {
    setFormData(prev => ({ ...prev, logoUrl: 'assets/aistudio/LOGO_YAYASAN_d78c341b.png' }));
  };

  // Handle Logo Wahdah Inspirasi Zakat (WIZ) Upload
  const handleWizLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Pilih file gambar valid untuk Logo WIZ.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData(prev => ({ ...prev, logoWizUrl: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetWizLogo = () => {
    setFormData(prev => ({ ...prev, logoWizUrl: DEFAULT_WIZ_LOGO }));
  };

  // Handle Logo Infaq Pembangunan Upload
  const handlePembangunanLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Pilih file gambar valid untuk Logo Infaq Pembangunan.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData(prev => ({ ...prev, logoPembangunanUrl: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetPembangunanLogo = () => {
    setFormData(prev => ({ ...prev, logoPembangunanUrl: DEFAULT_PEMBANGUNAN_LOGO }));
  };

  // Handle User Profile Photo Upload by Admin
  const handleUserPhotoUpload = (userId: string, e: React.ChangeEvent<HTMLInputElement>) => {
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
        const targetUser = usersList.find(u => u.id === userId);
        if (targetUser) {
          const updated = { ...targetUser, fotoUrl: dataUrl };
          storage.saveUser(updated);
          setUsersList(storage.getUsers());
          // If current logged in user was modified, update their session
          if (currentUser && currentUser.id === userId) {
            storage.setCurrentUser(updated);
          }
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Update specific school unit
  const handleUpdateSchool = (idx: number, field: keyof UnitSekolahConfig, value: any) => {
    const updated = [...daftarSekolah];
    updated[idx] = { ...updated[idx], [field]: value };
    setDaftarSekolah(updated);
  };

  // Bank handlers
  const handleAddRekening = () => {
    const newRek: RekeningBank = {
      id: `rek-${Date.now()}`,
      bank: 'Bank Syariah Indonesia (BSI)',
      nomorRekening: '',
      atasNama: formData.namaYayasan,
      isUtama: rekeningList.length === 0,
    };
    setRekeningList([...rekeningList, newRek]);
  };

  const handleUpdateRekening = (id: string, field: keyof RekeningBank, value: any) => {
    setRekeningList(rekeningList.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      if (field === 'isUtama' && value === true) {
        return { ...r, isUtama: false };
      }
      return r;
    }));
  };

  const handleDeleteRekening = (id: string) => {
    setRekeningList(rekeningList.filter(r => r.id !== id));
  };

  // User Approval & Management Handlers
  const handleApproveUser = (userId: string) => {
    storage.approveUser(userId, currentUser?.namaLengkap || 'Administrator');
    setUsersList(storage.getUsers());
  };

  const handleDeactivateUser = (userId: string) => {
    storage.deactivateUser(userId);
    setUsersList(storage.getUsers());
  };

  const handleDeleteUser = (userId: string, name: string) => {
    if (window.confirm(`Hapus akun pengguna "${name}"?`)) {
      storage.deleteUser(userId);
      setUsersList(storage.getUsers());
    }
  };

  const handleCreateDirectUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserData.namaLengkap || !newUserData.username) {
      alert('Nama dan Username wajib diisi!');
      return;
    }

    const created: AppUser = {
      id: `usr-${Date.now()}`,
      namaLengkap: newUserData.namaLengkap.trim(),
      username: newUserData.username.trim(),
      email: newUserData.email?.trim() || `${newUserData.username.trim()}@ypwi.org`,
      noWa: newUserData.noWa?.trim() || '',
      password: newUserData.password || '123',
      role: (newUserData.role as UserRole) || 'KASIR',
      status: 'AKTIF', // Directly active since created by Admin
      disetujuiOleh: currentUser?.namaLengkap || 'Administrator',
      tanggalDibuat: new Date().toISOString().split('T')[0],
    };

    storage.saveUser(created);
    setUsersList(storage.getUsers());
    setNewUserModal(false);
    setNewUserData({
      namaLengkap: '',
      username: '',
      email: '',
      noWa: '',
      password: '123',
      role: 'KASIR',
      status: 'AKTIF',
    });
  };

  // Submit all settings
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: FoundationSettings = {
      ...formData,
      daftarSekolah,
      rekeningList,
    };
    onSave(updated);
    storage.saveSettings(updated);
    setSuccessToast(true);
    setTimeout(() => {
      setSuccessToast(false);
      onClose();
    }, 1200);
  };

  // Backup DB
  const handleBackup = () => {
    const jsonStr = storage.exportDatabase();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_SPP_YPWI_Konawe_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // Restore DB
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = storage.importDatabase(content);
        if (ok) {
          alert('Alhamdulillah! Database berhasil dipulihkan.');
          window.location.reload();
        } else {
          alert('Gagal memulihkan database. Format JSON tidak sesuai.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (window.confirm('PERINGATAN: Apakah Anda yakin ingin mengembalikan seluruh data ke data bawaan awal YPWI Konawe?')) {
      storage.resetAll();
      window.location.reload();
    }
  };

  const pendingUsersCount = usersList.filter(u => u.status === 'MENUNGGU_PERSETUJUAN').length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-emerald-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-900/50 rounded-xl border border-emerald-600/40 text-emerald-200">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Pengaturan Sistem & Hak Akses Akun</h3>
              <p className="text-xs text-emerald-200">
                {formData.namaYayasan}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar text-xs">
          
          {/* TAB: NAMA & LOGO SEKOLAH */}
          <button
            onClick={() => setActiveTab('SCHOOLS')}
            className={`py-3 px-3 font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'SCHOOLS'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <School className="w-4 h-4 text-emerald-600" />
            <span>Nama & Logo Sekolah</span>
          </button>

          {/* TAB: AKUN & PERSETUJUAN ADMINISTRATOR */}
          <button
            onClick={() => setActiveTab('USERS')}
            className={`py-3 px-3 font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'USERS'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Akun & Persetujuan Admin</span>
            {pendingUsersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                {pendingUsersCount}
              </span>
            )}
          </button>

          {/* TAB: IDENTITAS */}
          <button
            onClick={() => setActiveTab('IDENTITY')}
            className={`py-3 px-3 font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'IDENTITY'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-slate-500" />
            <span>Identitas Yayasan</span>
          </button>

          {/* TAB: REKENING */}
          <button
            onClick={() => setActiveTab('BANKS')}
            className={`py-3 px-3 font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'BANKS'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4 text-slate-500" />
            <span>Rekening Bank</span>
          </button>

          {/* TAB: DATABASE */}
          <button
            onClick={() => setActiveTab('DATABASE')}
            className={`py-3 px-3 font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'DATABASE'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-slate-500" />
            <span>Backup / Restore</span>
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          
          {/* TAB 1: NAMA & LOGO SEKOLAH (Permintaan User) */}
          {activeTab === 'SCHOOLS' && (
            <div className="space-y-5">
              
              {/* Bagian 1: Logo Sekolah & Yayasan */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                      Logo Resmi Yayasan & Sekolah
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Tampil pada kuitansi, kop surat, dan navbar
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Current Logo Preview */}
                  <div className="w-24 h-24 rounded-2xl bg-white p-2 border-2 border-emerald-500/30 shadow-xs flex items-center justify-center shrink-0">
                    <img
                      src={formData.logoUrl || 'assets/aistudio/LOGO_YAYASAN_d78c341b.png'}
                      alt="Logo Sekolah"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Actions for Logo */}
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold text-slate-800">
                      Ubah atau Upload Logo Baru:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer shadow-xs transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih File Logo (PNG / JPG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleResetDefaultLogo}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-xl cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Logo YPWI Asli</span>
                      </button>
                    </div>

                    <div className="pt-1">
                      <label className="block text-[10px] text-slate-500 mb-0.5">Atau Masukkan URL Gambar Logo:</label>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={formData.logoUrl}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bagian 1B: Logo Wahdah Inspirasi Zakat (WIZ) & Logo Infaq Pembangunan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* WIZ LOGO CARD */}
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                      <h4 className="font-extrabold text-xs text-emerald-950 uppercase tracking-wide">
                        Logo Wahdah Inspirasi Zakat (WIZ)
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Laznas WIZ
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-white p-1.5 border border-emerald-300 shadow-xs flex items-center justify-center shrink-0">
                      <img 
                        src={formData.logoWizUrl || DEFAULT_WIZ_LOGO} 
                        alt="Logo WIZ" 
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg cursor-pointer text-[11px] shadow-xs">
                          <Upload className="w-3 h-3" />
                          <span>Upload Logo WIZ</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleWizLogoUpload}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={handleResetWizLogo}
                          className="px-2 py-1 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg text-[10px] cursor-pointer"
                        >
                          Reset Default
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="URL Logo WIZ..."
                        value={formData.logoWizUrl || ''}
                        onChange={(e) => setFormData({ ...formData, logoWizUrl: e.target.value })}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* INFAQ PEMBANGUNAN LOGO CARD */}
                <div className="p-4 bg-sky-50/50 rounded-2xl border border-sky-200/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-sky-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-sky-700" />
                      <h4 className="font-extrabold text-xs text-sky-950 uppercase tracking-wide">
                        Logo Infaq Pembangunan Sekolah
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                      Sarana YPWI
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-white p-1.5 border border-sky-300 shadow-xs flex items-center justify-center shrink-0">
                      <img 
                        src={formData.logoPembangunanUrl || DEFAULT_PEMBANGUNAN_LOGO} 
                        alt="Logo Infaq Pembangunan" 
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap gap-1.5">
                        <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg cursor-pointer text-[11px] shadow-xs">
                          <Upload className="w-3 h-3" />
                          <span>Upload Logo Sarana</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePembangunanLogoUpload}
                            className="hidden"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={handleResetPembangunanLogo}
                          className="px-2 py-1 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg text-[10px] cursor-pointer"
                        >
                          Reset Default
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="URL Logo Infaq Pembangunan..."
                        value={formData.logoPembangunanUrl || ''}
                        onChange={(e) => setFormData({ ...formData, logoPembangunanUrl: e.target.value })}
                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-mono"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Bagian 2: Pengaturan Daftar Nama Sekolah */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                      Daftar Nama Sekolah / Unit Pendidikan YPWI
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Ubah nama sekolah, nama kepala sekolah, dan tarif SPP standar per unit.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {daftarSekolah.map((sch, idx) => (
                    <div key={sch.id} className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-emerald-900 uppercase">
                          Unit #{idx + 1}: {sch.id}
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          Aktif
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-0.5">Nama Singkat Unit Sekolah</label>
                          <input
                            type="text"
                            value={sch.nama}
                            onChange={(e) => handleUpdateSchool(idx, 'nama', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-0.5">Nama Lengkap Resmi Sekolah</label>
                          <input
                            type="text"
                            value={sch.namaLengkap}
                            onChange={(e) => handleUpdateSchool(idx, 'namaLengkap', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-0.5">Kepala Sekolah / Pimpinan Unit</label>
                          <input
                            type="text"
                            value={sch.kepalaSekolah || ''}
                            onChange={(e) => handleUpdateSchool(idx, 'kepalaSekolah', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-0.5">Tarif Standar SPP Bulanan (Rp)</label>
                          <input
                            type="number"
                            step={5000}
                            value={sch.sppStandar || 0}
                            onChange={(e) => handleUpdateSchool(idx, 'sppStandar', parseInt(e.target.value, 10) || 0)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: AKUN PENGGUNA & PERSETUJUAN ADMINISTRATOR */}
          {activeTab === 'USERS' && (
            <div className="space-y-4">
              
              {/* Administrator Role Guidance */}
              <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <p className="font-bold text-xs text-purple-950">
                    Pusat Otoritas & Persetujuan Akun Administrator
                  </p>
                  <p className="text-purple-900/90 mt-0.5">
                    Sebagai Administrator, Anda memegang seluruh sistem: menyetujui akun kasir seluruh sekolah, bendahara yayasan, ketua yayasan, dan pengawas yayasan. Akun baru tidak dapat login sebelum Anda klik <strong>"Setujui Akun"</strong>.
                  </p>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Daftar Akun Pengguna Terdaftar ({usersList.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {pendingUsersCount} akun menunggu persetujuan Anda
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewUserModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Akun Langsung</span>
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Nama & Username</th>
                      <th className="py-2.5 px-3">Peran (Role)</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Password Demo</th>
                      <th className="py-2.5 px-3 text-right">Aksi Administrator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {usersList.map((u) => {
                      const isPending = u.status === 'MENUNGGU_PERSETUJUAN';
                      const isCurrent = currentUser?.id === u.id;

                      return (
                        <tr key={u.id} className={isPending ? 'bg-amber-50/60' : 'hover:bg-slate-50'}>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              {/* Avatar & Photo Upload Overlay */}
                              <div className="relative group shrink-0">
                                {u.fotoUrl ? (
                                  <img 
                                    src={u.fotoUrl} 
                                    alt={u.namaLengkap} 
                                    className="w-9 h-9 rounded-full object-cover border-2 border-emerald-500/40 shadow-xs" 
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                    {u.namaLengkap.charAt(0)}
                                  </div>
                                )}
                                <label 
                                  className="absolute inset-0 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity" 
                                  title="Upload / Ubah Foto Profil Pengguna"
                                >
                                  <Camera className="w-3.5 h-3.5 text-white" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleUserPhotoUpload(u.id, e)}
                                    className="hidden"
                                  />
                                </label>
                              </div>

                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 leading-tight flex items-center gap-1.5">
                                  <span>{u.namaLengkap}</span>
                                  {isCurrent && (
                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded">Anda</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">@{u.username} • {u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'BENDAHARA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : u.role === 'KASIR'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {isPending ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                                Menunggu Persetujuan
                              </span>
                            ) : u.status === 'AKTIF' ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                ✓ Aktif
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                                Nonaktif
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                            {u.password || '123'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Upload Foto Icon Button */}
                              <label 
                                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer inline-flex items-center gap-1 text-[10px]"
                                title="Upload / Ganti Foto Profil Akun Ini"
                              >
                                <Camera className="w-3 h-3 text-emerald-700" />
                                <span className="hidden sm:inline">Foto</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleUserPhotoUpload(u.id, e)}
                                  className="hidden"
                                />
                              </label>

                              {isPending ? (
                                <button
                                  type="button"
                                  onClick={() => handleApproveUser(u.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[10px] shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  <span>Setujui Akun</span>
                                </button>
                              ) : (
                                <>
                                  {u.status === 'AKTIF' && u.role !== 'ADMIN' && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeactivateUser(u.id)}
                                      title="Nonaktifkan Akun"
                                      className="p-1 text-slate-400 hover:text-amber-600 rounded cursor-pointer"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {u.role !== 'ADMIN' && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u.id, u.namaLengkap)}
                                      title="Hapus Akun"
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Modal Tambah Akun Langsung */}
              {newUserModal && (
                <div className="p-4 bg-slate-100 rounded-2xl border border-slate-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-slate-900 text-xs">Tambah Akun Pengguna Baru Langsung (Disetujui Otomatis)</h5>
                    <button
                      type="button"
                      onClick={() => setNewUserModal(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Nama Lengkap</label>
                      <input
                        type="text"
                        placeholder="Contoh: Ust. Ahmad Fauzan, S.Pd.I."
                        value={newUserData.namaLengkap}
                        onChange={(e) => setNewUserData({ ...newUserData, namaLengkap: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Username Login</label>
                      <input
                        type="text"
                        placeholder="Contoh: kasir_unaaha"
                        value={newUserData.username}
                        onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Peran / Hak Akses</label>
                      <select
                        value={newUserData.role}
                        onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as UserRole })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs cursor-pointer"
                      >
                        <option value="KASIR">Kasir Penerima Pembayaran SPP</option>
                        <option value="BENDAHARA">Bendahara Yayasan</option>
                        <option value="KETUA_YAYASAN">Ketua Yayasan</option>
                        <option value="PENGAWAS">Pengawas Yayasan</option>
                        <option value="ADMIN">Administrator Sistem</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Password</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={newUserData.password}
                        onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setNewUserModal(false)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-700"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateDirectUser}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                    >
                      Simpan & Aktifkan Akun
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: IDENTITAS YAYASAN */}
          {activeTab === 'IDENTITY' && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Yayasan</label>
                <input
                  type="text"
                  required
                  value={formData.namaYayasan}
                  onChange={(e) => setFormData({ ...formData, namaYayasan: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Singkatan / Brand</label>
                  <input
                    type="text"
                    value={formData.namaSingkat}
                    onChange={(e) => setFormData({ ...formData, namaSingkat: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tanggal Jatuh Tempo Bulanan</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Setiap Tanggal</span>
                    <input
                      type="number"
                      min={1}
                      max={28}
                      value={formData.tglJatuhTempoSetiapBulan}
                      onChange={(e) => setFormData({ ...formData, tglJatuhTempoSetiapBulan: parseInt(e.target.value, 10) || 10 })}
                      className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Lengkap Kantor Yayasan</label>
                <input
                  type="text"
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kabupaten / Kota</label>
                  <input
                    type="text"
                    value={formData.kabupaten}
                    onChange={(e) => setFormData({ ...formData, kabupaten: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Provinsi</label>
                  <input
                    type="text"
                    value={formData.provinsi}
                    onChange={(e) => setFormData({ ...formData, provinsi: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp Yayasan</label>
                  <input
                    type="text"
                    value={formData.nomorWaYayasan}
                    onChange={(e) => setFormData({ ...formData, nomorWaYayasan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Ketua Yayasan</label>
                  <input
                    type="text"
                    value={formData.namaKetuaYayasan}
                    onChange={(e) => setFormData({ ...formData, namaKetuaYayasan: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Bendahara Yayasan (Kasir Utama)</label>
                  <input
                    type="text"
                    value={formData.namaBendahara}
                    onChange={(e) => setFormData({ ...formData, namaBendahara: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REKENING */}
          {activeTab === 'BANKS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Daftar Rekening Bank Penerima SPP</h4>
                  <p className="text-[11px] text-slate-500">Rekening ini dicantumkan pada notifikasi WhatsApp tagihan dan kuitansi.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddRekening}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Rekening</span>
                </button>
              </div>

              <div className="space-y-3">
                {rekeningList.map((rek, idx) => (
                  <div key={rek.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">Rekening #{idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 cursor-pointer text-[11px] text-slate-600">
                          <input
                            type="radio"
                            name="rekUtama"
                            checked={rek.isUtama}
                            onChange={() => handleUpdateRekening(rek.id, 'isUtama', true)}
                          />
                          <span>Rekening Utama</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteRekening(rek.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <input
                          type="text"
                          placeholder="Nama Bank (misal: Bank Syariah Indonesia)"
                          value={rek.bank}
                          onChange={(e) => handleUpdateRekening(rek.id, 'bank', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Nomor Rekening"
                          value={rek.nomorRekening}
                          onChange={(e) => handleUpdateRekening(rek.id, 'nomorRekening', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Atas Nama"
                          value={rek.atasNama}
                          onChange={(e) => handleUpdateRekening(rek.id, 'atasNama', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: DATABASE */}
          {activeTab === 'DATABASE' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>Cadangkan & Pulihkan Seluruh Data (JSON Backup)</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Semua data siswa, catatan pembayaran, log pesan WhatsApp, akun pengguna, dan pengaturan tersimpan secara aman di browser Anda. Anda dapat mengunduh file cadangan sewaktu-waktu.
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleBackup}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Backup Database (.json)</span>
                  </button>

                  <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>Restore File JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Sinkronisasi data bersama (opsional) */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                    <Cloud className="w-4 h-4 text-emerald-600" />
                    <span>Penyimpanan Data Bersama (Cloud)</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    syncInfo.mode === 'cloud'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {syncInfo.mode === 'cloud' ? 'MODE CLOUD' : 'MODE LOKAL'}
                  </span>
                </div>

                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {syncInfo.mode === 'cloud'
                    ? 'Data tersimpan di database bersama, sehingga semua pengurus yang login melihat data yang sama dari perangkat mana pun.'
                    : 'Aplikasi berjalan tanpa database online: data hanya ada di browser ini. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY lalu build ulang untuk mengaktifkan mode cloud.'}
                </p>

                {syncInfo.mode === 'cloud' && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { void syncNow(); }}
                        disabled={syncInfo.state === 'syncing'}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncInfo.state === 'syncing' ? 'animate-spin' : ''}`} />
                        <span>{syncInfo.state === 'syncing' ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                      </button>
                      <span className="text-[11px] text-slate-500">
                        Sinkron terakhir: {syncInfo.lastSyncAt ? new Date(syncInfo.lastSyncAt).toLocaleTimeString('id-ID') : 'belum'}
                      </span>
                    </div>
                    {syncInfo.lastError && (
                      <p className="text-[11px] text-rose-700">Gagal sinkron: {syncInfo.lastError}</p>
                    )}
                  </>
                )}
              </div>

              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-800 text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Reset ke Data Awal Demo YPWI</span>
                </div>
                <p className="text-rose-700 text-[11px]">
                  Mengembalikan semua data siswa, pengguna, dan transaksi ke data awal percontohan Yayasan Wahdah Islamiyah Konawe.
                </p>
                <button
                  type="button"
                  onClick={handleResetData}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                >
                  Reset Semua Data
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Sistem SPP {formData.namaYayasan}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan</span>
              </button>
            </div>
          </div>

          {successToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Pengaturan berhasil disimpan!</span>
            </div>
          )}

        </form>

      </div>
    </div>
  );
};
