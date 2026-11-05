import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { StudentManagement } from './components/StudentManagement';
import { PaymentManagement } from './components/PaymentManagement';
import { WhatsAppAutomation } from './components/WhatsAppAutomation';
import { FinancialReports } from './components/FinancialReports';
import { ParentPortal } from './components/ParentPortal';
import { ReceiptModal } from './components/ReceiptModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { UserProfilePage } from './components/UserProfilePage';
import { storage } from './services/storage';
import { Siswa, Pembayaran, FoundationSettings, WhatsAppLog, AppUser } from './types';
import { LogIn, ArrowLeft, Shield } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [students, setStudents] = useState<Siswa[]>([]);
  const [payments, setPayments] = useState<Pembayaran[]>([]);
  const [settings, setSettings] = useState<FoundationSettings>(storage.getSettings());
  const [waLogs, setWaLogs] = useState<WhatsAppLog[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(storage.getCurrentUser());
  const [usersList, setUsersList] = useState<AppUser[]>(storage.getUsers());

  // Public Parent Portal mode (when parent accesses link without staff login)
  const [isParentPortalPublicMode, setIsParentPortalPublicMode] = useState<boolean>(false);

  // Modals state
  const [viewingReceipt, setViewingReceipt] = useState<Pembayaran | null>(null);
  const [isNewReceiptCelebration, setIsNewReceiptCelebration] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [targetStudentForPayment, setTargetStudentForPayment] = useState<string | null>(null);
  const [portalInitialNis, setPortalInitialNis] = useState<string>('');

  // Load and subscribe to storage changes
  const loadData = () => {
    setStudents(storage.getStudents());
    setPayments(storage.getPayments());
    setSettings(storage.getSettings());
    setWaLogs(storage.getWhatsAppLogs());
    setCurrentUser(storage.getCurrentUser());
    setUsersList(storage.getUsers());
  };

  useEffect(() => {
    loadData();

    // Listen to reactive updates across components
    const handleDataChanged = () => {
      loadData();
    };
    const handleAuthChanged = () => {
      setCurrentUser(storage.getCurrentUser());
    };
    const handleUsersChanged = () => {
      setUsersList(storage.getUsers());
    };

    window.addEventListener('ypwi_data_changed', handleDataChanged);
    window.addEventListener('ypwi_auth_changed', handleAuthChanged);
    window.addEventListener('ypwi_users_changed', handleUsersChanged);

    // Handle hash links if opened from WhatsApp link (e.g. #resi?id=... or #portal?nis=...)
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#resi')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const id = params.get('id');
        if (id) {
          const allPays = storage.getPayments();
          const target = allPays.find(p => p.id === id);
          if (target) {
            setViewingReceipt(target);
          }
        }
      } else if (hash.startsWith('#portal')) {
        const params = new URLSearchParams(hash.split('?')[1]);
        const nis = params.get('nis');
        if (nis) {
          setPortalInitialNis(nis);
          setIsParentPortalPublicMode(true);
          setActiveTab('portal');
        }
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);

    return () => {
      window.removeEventListener('ypwi_data_changed', handleDataChanged);
      window.removeEventListener('ypwi_auth_changed', handleAuthChanged);
      window.removeEventListener('ypwi_users_changed', handleUsersChanged);
      window.removeEventListener('hashchange', handleHash);
    };
  }, []);

  // Action handlers
  const handleOpenNewPayment = (studentId?: string) => {
    if (studentId) {
      setTargetStudentForPayment(studentId);
    }
    setActiveTab('pembayaran');
  };

  const handleViewReceipt = (payment: Pembayaran, isNew: boolean = false) => {
    setViewingReceipt(payment);
    setIsNewReceiptCelebration(isNew);
  };

  const handleOpenStudentPortal = (nis: string) => {
    setPortalInitialNis(nis);
    setActiveTab('portal');
  };

  const handleLogout = () => {
    if (window.confirm('Apakah Anda yakin ingin keluar (logout) dari sistem YPWI Konawe?')) {
      storage.setCurrentUser(null);
      setCurrentUser(null);
      setIsParentPortalPublicMode(false);
    }
  };

  const pendingApprovalsCount = usersList.filter(u => u.status === 'MENUNGGU_PERSETUJUAN').length;

  // 1. IF NOT LOGGED IN AND NOT IN PUBLIC PARENT PORTAL -> SHOW MANDATORY LOGIN SCREEN!
  if (!currentUser && !isParentPortalPublicMode) {
    return (
      <LoginPage
        settings={settings}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsParentPortalPublicMode(false);
          // Default landing tab based on role
          if (user.role === 'KASIR') {
            setActiveTab('pembayaran');
          } else {
            setActiveTab('dashboard');
          }
        }}
        onOpenParentPortal={() => {
          setIsParentPortalPublicMode(true);
          setActiveTab('portal');
        }}
      />
    );
  }

  // 2. IF PUBLIC PARENT PORTAL ACCESS (Without Login)
  if (!currentUser && isParentPortalPublicMode) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {/* Top Header for Parents */}
        <header className="sticky top-0 z-40 bg-white border-b border-emerald-100 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white p-0.5 rounded-xl border border-emerald-200">
                <img
                  src={settings.logoUrl || 'assets/aistudio/LOGO_YAYASAN_d78c341b.png'}
                  alt="Logo YPWI"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                  Portal Cek Tagihan SPP Siswa
                </h1>
                <p className="text-[11px] text-slate-500">
                  {settings.namaYayasan}
                </p>
              </div>
            </div>

            {/* Back to Staff Login */}
            <button
              onClick={() => setIsParentPortalPublicMode(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-all shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login Pengurus / Kasir</span>
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <ParentPortal
            students={students}
            payments={payments}
            settings={settings}
            initialNis={portalInitialNis}
            onViewReceipt={handleViewReceipt}
          />
        </main>

        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {settings.namaYayasan} • Kabupaten Konawe</p>
        </footer>

        {viewingReceipt && (
          <ReceiptModal
            payment={viewingReceipt}
            settings={settings}
            onClose={() => setViewingReceipt(null)}
          />
        )}
      </div>
    );
  }

  // 3. LOGGED-IN APPLICATION INTERFACE (Protected)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settings={settings}
        currentUser={currentUser}
        pendingApprovalsCount={currentUser?.role === 'ADMIN' ? pendingApprovalsCount : 0}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNewPayment={() => handleOpenNewPayment()}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {activeTab === 'dashboard' && (
          <Dashboard
            students={students}
            payments={payments}
            settings={settings}
            onNavigate={setActiveTab}
            onOpenNewPaymentWithStudent={(sid) => handleOpenNewPayment(sid)}
            onViewReceipt={handleViewReceipt}
          />
        )}

        {activeTab === 'pembayaran' && (
          <PaymentManagement
            students={students}
            payments={payments}
            settings={settings}
            selectedStudentId={targetStudentForPayment}
            onViewReceipt={handleViewReceipt}
          />
        )}

        {activeTab === 'siswa' && (
          <StudentManagement
            students={students}
            settings={settings}
            onOpenPaymentForStudent={(sid) => handleOpenNewPayment(sid)}
            onViewStudentPortal={handleOpenStudentPortal}
          />
        )}

        {activeTab === 'whatsapp' && (
          <WhatsAppAutomation
            students={students}
            payments={payments}
            settings={settings}
            waLogs={waLogs}
            onUpdateSettings={setSettings}
          />
        )}

        {activeTab === 'laporan' && (
          <FinancialReports
            students={students}
            payments={payments}
            settings={settings}
          />
        )}

        {activeTab === 'portal' && (
          <ParentPortal
            students={students}
            payments={payments}
            settings={settings}
            initialNis={portalInitialNis}
            onViewReceipt={handleViewReceipt}
          />
        )}

        {activeTab === 'profile' && (
          <UserProfilePage
            currentUser={currentUser}
            settings={settings}
            onBack={() => setActiveTab('dashboard')}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onLogout={handleLogout}
          />
        )}

      </main>

      {/* App Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img 
              src={settings.logoUrl || 'assets/aistudio/LOGO_YAYASAN_d78c341b.png'} 
              alt="Logo" 
              className="w-5 h-5 object-contain"
            />
            <span className="font-semibold text-slate-700">
              {settings.namaYayasan}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Sistem SPP YPWI Konawe</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">Terotentikasi: {currentUser?.namaLengkap} ({currentUser?.role})</span>
          </div>
        </div>
      </footer>

      {/* MODAL: View / Print / Send Receipt */}
      {viewingReceipt && (
        <ReceiptModal
          payment={viewingReceipt}
          settings={settings}
          onClose={() => setViewingReceipt(null)}
          isNewPaymentCelebration={isNewReceiptCelebration}
        />
      )}

      {/* MODAL: Foundation, School Name, Logo & User Management Settings */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          currentUser={currentUser}
          onClose={() => setIsSettingsOpen(false)}
          onSave={setSettings}
          onOpenAuthModal={() => {
            setIsSettingsOpen(false);
            setIsAuthOpen(true);
          }}
        />
      )}

      {/* MODAL: Authentication & Role Switcher */}
      {isAuthOpen && (
        <AuthModal
          currentUser={currentUser}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
          }}
        />
      )}

    </div>
  );
}
