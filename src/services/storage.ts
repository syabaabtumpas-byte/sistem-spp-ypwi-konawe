import { Siswa, Pembayaran, WhatsAppLog, FoundationSettings, ItemTagihanBulan, BulanNama, AppUser } from '../types';
import { INITIAL_SISWA, INITIAL_PEMBAYARAN, INITIAL_SETTINGS, INITIAL_WA_LOGS, LIST_BULAN, INITIAL_USERS } from '../data/initialData';
import type { CloudDataKey } from './cloud';

const KEYS = {
  SISWA: 'ypwi_siswa_list_v1',
  PEMBAYARAN: 'ypwi_pembayaran_list_v1',
  SETTINGS: 'ypwi_foundation_settings_v1',
  WA_LOGS: 'ypwi_wa_logs_v1',
  USERS: 'ypwi_users_list_v1',
  CURRENT_USER: 'ypwi_current_user_v1',
};

export const storage = {
  getSettings(): FoundationSettings {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      if (data) {
        const parsed: FoundationSettings = JSON.parse(data);
        if (!parsed.daftarSekolah || parsed.daftarSekolah.length === 0) {
          parsed.daftarSekolah = INITIAL_SETTINGS.daftarSekolah;
        }
        if (!parsed.logoWizUrl) {
          parsed.logoWizUrl = INITIAL_SETTINGS.logoWizUrl;
        }
        if (!parsed.logoPembangunanUrl) {
          parsed.logoPembangunanUrl = INITIAL_SETTINGS.logoPembangunanUrl;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error reading settings from localStorage', e);
    }
    return INITIAL_SETTINGS;
  },

  saveSettings(settings: FoundationSettings): void {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    window.dispatchEvent(new Event('ypwi_data_changed'));
  },

  getUsers(): AppUser[] {
    try {
      const data = localStorage.getItem(KEYS.USERS);
      if (data) return JSON.parse(data) as AppUser[];
    } catch (e) {
      console.error('Error reading users from localStorage', e);
    }
    localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  },

  getCurrentUser(): AppUser | null {
    try {
      const data = localStorage.getItem(KEYS.CURRENT_USER);
      if (data) {
        const parsed: AppUser = JSON.parse(data);
        // Verify user still exists in current user list and is active
        const all = this.getUsers();
        const found = all.find(u => u.id === parsed.id);
        if (found && found.status === 'AKTIF') return found;
      }
    } catch (e) {
      console.error('Error reading current user', e);
    }
    return null;
  },

  setCurrentUser(user: AppUser | null): void {
    if (user) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
    window.dispatchEvent(new Event('ypwi_auth_changed'));
  },

  saveUser(user: AppUser): void {
    const list = this.getUsers();
    const idx = list.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      list[idx] = user;
    } else {
      list.push(user);
    }
    localStorage.setItem(KEYS.USERS, JSON.stringify(list));
    window.dispatchEvent(new Event('ypwi_users_changed'));
  },

  approveUser(userId: string, approvedBy: string): void {
    const list = this.getUsers();
    const target = list.find(u => u.id === userId);
    if (target) {
      target.status = 'AKTIF';
      target.disetujuiOleh = approvedBy;
      localStorage.setItem(KEYS.USERS, JSON.stringify(list));
      window.dispatchEvent(new Event('ypwi_users_changed'));
    }
  },

  deactivateUser(userId: string): void {
    const list = this.getUsers();
    const target = list.find(u => u.id === userId);
    if (target) {
      target.status = 'NONAKTIF';
      localStorage.setItem(KEYS.USERS, JSON.stringify(list));
      window.dispatchEvent(new Event('ypwi_users_changed'));
    }
  },

  deleteUser(userId: string): void {
    const list = this.getUsers().filter(u => u.id !== userId);
    localStorage.setItem(KEYS.USERS, JSON.stringify(list));
    window.dispatchEvent(new Event('ypwi_users_changed'));
  },

  getStudents(): Siswa[] {
    try {
      const data = localStorage.getItem(KEYS.SISWA);
      if (data) return JSON.parse(data) as Siswa[];
    } catch (e) {
      console.error('Error reading students from localStorage', e);
    }
    // Initialize default if empty
    localStorage.setItem(KEYS.SISWA, JSON.stringify(INITIAL_SISWA));
    return INITIAL_SISWA;
  },

  saveStudent(student: Siswa): void {
    const list = this.getStudents();
    const index = list.findIndex(s => s.id === student.id);
    if (index >= 0) {
      list[index] = student;
    } else {
      list.unshift(student);
    }
    localStorage.setItem(KEYS.SISWA, JSON.stringify(list));
    window.dispatchEvent(new Event('ypwi_data_changed'));
  },

  deleteStudent(id: string): void {
    const list = this.getStudents().filter(s => s.id !== id);
    localStorage.setItem(KEYS.SISWA, JSON.stringify(list));
    window.dispatchEvent(new Event('ypwi_data_changed'));
  },

  importStudents(students: Siswa[]): void {
    const current = this.getStudents();
    const map = new Map<string, Siswa>();
    // index existing by NIS or ID
    current.forEach(s => map.set(s.nis || s.id, s));
    students.forEach(s => map.set(s.nis || s.id, s));
    const merged = Array.from(map.values());
    localStorage.setItem(KEYS.SISWA, JSON.stringify(merged));
    window.dispatchEvent(new Event('ypwi_data_changed'));
  },

  getPayments(): Pembayaran[] {
    try {
      const data = localStorage.getItem(KEYS.PEMBAYARAN);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading payments from localStorage', e);
    }
    localStorage.setItem(KEYS.PEMBAYARAN, JSON.stringify(INITIAL_PEMBAYARAN));
    return INITIAL_PEMBAYARAN;
  },

  addPayment(payment: Pembayaran): void {
    const list = this.getPayments();
    list.unshift(payment);
    localStorage.setItem(KEYS.PEMBAYARAN, JSON.stringify(list));
    window.dispatchEvent(new Event('ypwi_data_changed'));
  },

  deletePayment(id: string): void {
    const list = this.getPayments().filter(p => p.id !== id);
    localStorage.setItem(KEYS.PEMBAYARAN, JSON.stringify(list));
    window.dispatchEvent(new Event('ypwi_data_changed'));
  },

  importPayments(payments: Pembayaran[]): void {
    const current = this.getPayments();
    const map = new Map<string, Pembayaran>();
    // Index by noKuitansi or id
    current.forEach(p => map.set(p.noKuitansi || p.id, p));
    payments.forEach(p => map.set(p.noKuitansi || p.id, p));
    const merged = Array.from(map.values());
    localStorage.setItem(KEYS.PEMBAYARAN, JSON.stringify(merged));
    window.dispatchEvent(new Event('ypwi_data_changed'));
  },

  getWhatsAppLogs(): WhatsAppLog[] {
    try {
      const data = localStorage.getItem(KEYS.WA_LOGS);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Error reading wa logs', e);
    }
    localStorage.setItem(KEYS.WA_LOGS, JSON.stringify(INITIAL_WA_LOGS));
    return INITIAL_WA_LOGS;
  },

  addWhatsAppLog(log: WhatsAppLog): void {
    const list = this.getWhatsAppLogs();
    list.unshift(log);
    // keep max 500 logs
    const trimmed = list.slice(0, 500);
    localStorage.setItem(KEYS.WA_LOGS, JSON.stringify(trimmed));
    window.dispatchEvent(new Event('ypwi_data_changed'));
  },

  clearWhatsAppLogs(): void {
    localStorage.setItem(KEYS.WA_LOGS, JSON.stringify([]));
    window.dispatchEvent(new Event('ypwi_data_changed'));
  },

  /**
   * Calculates monthly billing status for a student in a specific academic year (e.g. 2024/2025)
   * Indonesian academic year: Juli (Year 1) to Juni (Year 2)
   */
  getStudentBillingStatus(studentId: string, tahunAjaran: string = '2024/2025'): ItemTagihanBulan[] {
    const student = this.getStudents().find(s => s.id === studentId);
    if (!student) return [];

    const payments = this.getPayments().filter(
      p => p.siswaId === studentId && p.statusKuitansi === 'Resmi' && p.tahunAjaran === tahunAjaran
    );

    const [startYearStr, endYearStr] = tahunAjaran.split('/');
    const startYear = parseInt(startYearStr, 10) || 2024;
    const endYear = parseInt(endYearStr, 10) || (startYear + 1);

    const result: ItemTagihanBulan[] = LIST_BULAN.map(b => {
      // First 6 months (Juli - Des) are in startYear, next 6 (Jan - Jun) are in endYear
      const year = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].includes(b.nama)
        ? startYear
        : endYear;
      const monthLabel = `${b.nama} ${year}`;

      // Check if any payment includes this month
      const matchedPayment = payments.find(p => p.bulanList.includes(monthLabel));

      return {
        bulan: b.nama,
        tahun: year,
        label: monthLabel,
        nominal: student.sppBulanan,
        biayaLain: student.biayaLain || 0,
        status: matchedPayment ? 'LUNAS' : 'BELUM_BAYAR',
        pembayaranId: matchedPayment?.id,
        tanggalBayar: matchedPayment?.tanggalBayar,
      };
    });

    return result;
  },

  resetAll(): void {
    localStorage.setItem(KEYS.SISWA, JSON.stringify(INITIAL_SISWA));
    localStorage.setItem(KEYS.PEMBAYARAN, JSON.stringify(INITIAL_PEMBAYARAN));
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.setItem(KEYS.WA_LOGS, JSON.stringify(INITIAL_WA_LOGS));
    window.dispatchEvent(new Event('ypwi_data_changed'));
  },

  /** Membaca satu kelompok data sesuai nama dokumen cloud. */
  readCloudPayload(key: CloudDataKey): unknown {
    switch (key) {
      case 'students': return this.getStudents();
      case 'payments': return this.getPayments();
      case 'settings': return this.getSettings();
      case 'waLogs': return this.getWhatsAppLogs();
      case 'users': return this.getUsers();
      default: return null;
    }
  },

  /**
   * Menulis data dari cloud ke cache lokal.
   * silent = true bila pemanggil sudah memuat ulang datanya sendiri (menghindari
   * event berulang yang memicu pengiriman balik ke server).
   */
  applyCloudPayload(key: CloudDataKey, payload: unknown, silent = false): void {
    if (payload === null || payload === undefined) return;

    switch (key) {
      case 'students':
        if (Array.isArray(payload)) localStorage.setItem(KEYS.SISWA, JSON.stringify(payload));
        break;
      case 'payments':
        if (Array.isArray(payload)) localStorage.setItem(KEYS.PEMBAYARAN, JSON.stringify(payload));
        break;
      case 'settings':
        if (typeof payload === 'object' && !Array.isArray(payload)) {
          localStorage.setItem(KEYS.SETTINGS, JSON.stringify(payload));
        }
        break;
      case 'waLogs':
        if (Array.isArray(payload)) localStorage.setItem(KEYS.WA_LOGS, JSON.stringify(payload));
        break;
      case 'users':
        if (Array.isArray(payload)) localStorage.setItem(KEYS.USERS, JSON.stringify(payload));
        break;
      default:
        return;
    }

    if (silent) return;
    window.dispatchEvent(new Event('ypwi_data_changed'));
    if (key === 'users') window.dispatchEvent(new Event('ypwi_users_changed'));
  },

  exportDatabase(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: this.getSettings(),
      students: this.getStudents(),
      payments: this.getPayments(),
      waLogs: this.getWhatsAppLogs(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importDatabase(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.students && Array.isArray(data.students)) {
        localStorage.setItem(KEYS.SISWA, JSON.stringify(data.students));
      }
      if (data.payments && Array.isArray(data.payments)) {
        localStorage.setItem(KEYS.PEMBAYARAN, JSON.stringify(data.payments));
      }
      if (data.settings) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.settings));
      }
      if (data.waLogs && Array.isArray(data.waLogs)) {
        localStorage.setItem(KEYS.WA_LOGS, JSON.stringify(data.waLogs));
      }
      window.dispatchEvent(new Event('ypwi_data_changed'));
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }
};
