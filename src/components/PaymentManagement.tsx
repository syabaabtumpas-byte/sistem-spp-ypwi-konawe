import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  CreditCard, 
  Search, 
  CheckCircle2, 
  FileText, 
  Download, 
  Send, 
  Calendar, 
  Check, 
  Trash2, 
  Building2,
  GraduationCap,
  School,
  Sparkles,
  BookOpen,
  ArrowRight,
  Phone,
  Clock,
  ChevronRight,
  Filter,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  FileSpreadsheet,
  FileUp,
  HelpCircle,
  X,
  AlertCircle,
  Upload
} from 'lucide-react';
import { Siswa, Pembayaran, MetodePembayaran, FoundationSettings, ItemTagihanBulan, JenjangPendidikan } from '../types';
import { storage } from '../services/storage';
import { downloadExcelTemplate, readSpreadsheetAsCsvText, isSpreadsheetFile } from '../services/excelTemplate';
import { formatRupiah, generatePaymentConfirmationMessage, generateBillingReminderMessage, buildDirectWhatsAppUrl, sendWhatsAppMessage } from '../services/whatsapp';
import { generateReceiptPDF } from '../services/pdfGenerator';

interface PaymentManagementProps {
  students: Siswa[];
  payments: Pembayaran[];
  settings: FoundationSettings;
  selectedStudentId?: string | null;
  onViewReceipt: (payment: Pembayaran, isNew?: boolean) => void;
}

export const PaymentManagement: React.FC<PaymentManagementProps> = ({
  students,
  payments,
  settings,
  selectedStudentId,
  onViewReceipt,
}) => {
  // Navigation / Tabs
  const [activeMainTab, setActiveMainTab] = useState<'RECORD' | 'HISTORY'>('RECORD');

  // School & Class Selection State
  const [selectedSchool, setSelectedSchool] = useState<JenjangPendidikan>('SDIT');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Chosen student for payment checkout
  const [chosenStudentId, setChosenStudentId] = useState<string>(selectedStudentId || '');

  // If selectedStudentId changes from prop (e.g. from Dashboard or Student list)
  useEffect(() => {
    if (selectedStudentId) {
      setChosenStudentId(selectedStudentId);
      const target = students.find(s => s.id === selectedStudentId);
      if (target) {
        setSelectedSchool(target.jenjang);
        setSelectedClass(target.kelas);
        setActiveMainTab('RECORD');
      }
    }
  }, [selectedStudentId, students]);

  // Multi-month selection for checkout
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

  // Infaq Pembangunan & Infaq WIZ states
  const [includeInfaqPembangunan, setIncludeInfaqPembangunan] = useState(false);
  const [nominalInfaqPembangunan, setNominalInfaqPembangunan] = useState<number>(50000);
  const [keteranganInfaqPembangunan, setKeteranganInfaqPembangunan] = useState('Infaq Gedung & Sarana Sekolah');

  const [includeInfaqWiz, setIncludeInfaqWiz] = useState(false);
  const [nominalInfaqWiz, setNominalInfaqWiz] = useState<number>(25000);

  const [metodeBayar, setMetodeBayar] = useState<MetodePembayaran>('Transfer BSI');
  const [referensiBank, setReferensiBank] = useState('');
  const [catatan, setCatatan] = useState('');
  const [tanggalBayar, setTanggalBayar] = useState(new Date().toISOString().split('T')[0]);
  const [namaPenerima, setNamaPenerima] = useState(settings.namaBendahara);

  // History Filter State
  const [historySearch, setHistorySearch] = useState('');
  const [historySchool, setHistorySchool] = useState<string>('ALL');
  const [historyMethod, setHistoryMethod] = useState<string>('ALL');
  const [historyDatePreset, setHistoryDatePreset] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST7' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [historyDateStart, setHistoryDateStart] = useState<string>('');
  const [historyDateEnd, setHistoryDateEnd] = useState<string>('');

  // Payment CSV Import State
  const [isImportPaymentModalOpen, setIsImportPaymentModalOpen] = useState(false);
  const [importPaymentCsvText, setImportPaymentCsvText] = useState('');
  const [importPaymentFileName, setImportPaymentFileName] = useState('');
  const [importPaymentError, setImportPaymentError] = useState<string | null>(null);
  const [importPaymentSuccess, setImportPaymentSuccess] = useState<string | null>(null);
  const [showPaymentColumnGuide, setShowPaymentColumnGuide] = useState(false);
  const [parsedPaymentPreviewList, setParsedPaymentPreviewList] = useState<Pembayaran[]>([]);

  // Metadata visual unit sekolah (ikon & warna). Nama serta tarif selalu
  // diambil dari pengaturan Admin agar perubahan langsung terlihat di aplikasi.
  const schoolMeta: {
    id: JenjangPendidikan;
    badgeColor: string;
    icon: any;
    defaultSpp: number;
  }[] = [
    {
      id: 'SDIT',
      badgeColor: 'bg-emerald-600 text-white',
      icon: School,
      defaultSpp: 250000,
    },
    {
      id: 'SMPIT',
      badgeColor: 'bg-teal-600 text-white',
      icon: GraduationCap,
      defaultSpp: 350000,
    },
    {
      id: 'SMAIT / Tahfidz',
      badgeColor: 'bg-sky-700 text-white',
      icon: BookOpen,
      defaultSpp: 500000,
    },
    {
      id: 'RA / TK',
      badgeColor: 'bg-amber-600 text-white',
      icon: Sparkles,
      defaultSpp: 180000,
    },
  ];

  const schoolDefinitions = schoolMeta.map(meta => {
    const unit = settings.daftarSekolah?.find(s => s.id === meta.id);
    return {
      ...meta,
      name: unit?.nama || meta.id,
      fullName: unit?.namaLengkap || unit?.nama || meta.id,
      defaultSpp: unit?.sppStandar ?? meta.defaultSpp,
    };
  });

  // Distinct classes for the currently selected school
  const schoolClasses = useMemo(() => {
    const list = students.filter(s => s.jenjang === selectedSchool);
    const classes = Array.from(new Set(list.map(s => s.kelas))).sort();
    return classes;
  }, [students, selectedSchool]);

  // When school changes, reset class if it doesn't belong to new school
  const handleSchoolChange = (schoolId: JenjangPendidikan) => {
    setSelectedSchool(schoolId);
    setSelectedClass('ALL');
  };

  // Filter students by selected school & class, or global search
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase();
        return (
          s.nama.toLowerCase().includes(q) ||
          s.nis.toLowerCase().includes(q) ||
          s.namaWali.toLowerCase().includes(q) ||
          s.kelas.toLowerCase().includes(q)
        );
      }

      const matchSchool = s.jenjang === selectedSchool;
      const matchClass = selectedClass === 'ALL' || s.kelas === selectedClass;
      return matchSchool && matchClass;
    });
  }, [students, selectedSchool, selectedClass, globalSearch]);

  // Auto-select first student if none selected or if filtered changes
  useEffect(() => {
    if (!chosenStudentId && filteredStudents.length > 0) {
      setChosenStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, chosenStudentId]);

  // Currently chosen student object
  const currentStudent = useMemo(() => {
    return students.find(s => s.id === chosenStudentId) || filteredStudents[0] || null;
  }, [students, chosenStudentId, filteredStudents]);

  // 12-Month Billing Status for chosen student
  const billingStatus: ItemTagihanBulan[] = useMemo(() => {
    if (!currentStudent) return [];
    return storage.getStudentBillingStatus(currentStudent.id, currentStudent.tahunAjaran);
  }, [currentStudent, payments]);

  // Multi-month toggler
  const toggleMonth = (monthLabel: string, isAlreadyPaid: boolean) => {
    if (isAlreadyPaid) return;
    if (selectedMonths.includes(monthLabel)) {
      setSelectedMonths(selectedMonths.filter(m => m !== monthLabel));
    } else {
      setSelectedMonths([...selectedMonths, monthLabel]);
    }
  };

  const selectAllUnpaid = () => {
    const unpaid = billingStatus.filter(b => b.status !== 'LUNAS').map(b => b.label);
    setSelectedMonths(unpaid);
  };

  const clearSelectedMonths = () => {
    setSelectedMonths([]);
  };

  // Financial calculations
  const sppAmountPerMonth = currentStudent?.sppBulanan || 0;
  const totalSpp = selectedMonths.length * sppAmountPerMonth;
  const biayaLainTotal = 0;
  const infaqPembangunanTotal = includeInfaqPembangunan ? Number(nominalInfaqPembangunan || 0) : 0;
  const infaqWizTotal = includeInfaqWiz ? Number(nominalInfaqWiz || 0) : 0;
  const grandTotal = totalSpp + infaqPembangunanTotal + infaqWizTotal;

  // Save payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) {
      alert('Pilih siswa terlebih dahulu!');
      return;
    }
    if (selectedMonths.length === 0) {
      alert('Pilih minimal satu bulan SPP yang akan dibayar!');
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const receiptNum = `KWT/YPWI/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(payments.length + 1).padStart(3, '0')}`;

    const newPayment: Pembayaran = {
      id: `pay-${Date.now()}`,
      noKuitansi: receiptNum,
      siswaId: currentStudent.id,
      siswaNama: currentStudent.nama,
      nis: currentStudent.nis,
      jenjang: currentStudent.jenjang,
      kelas: currentStudent.kelas,
      namaWali: currentStudent.namaWali,
      noWa: currentStudent.noWa,
      tahunAjaran: currentStudent.tahunAjaran,
      bulanList: selectedMonths,
      nominalSppPerBulan: sppAmountPerMonth,
      totalSpp: totalSpp,
      nominalBiayaLain: biayaLainTotal,
      nominalInfaqPembangunan: infaqPembangunanTotal > 0 ? infaqPembangunanTotal : undefined,
      nominalInfaqWiz: infaqWizTotal > 0 ? infaqWizTotal : undefined,
      keteranganInfaqPembangunan: infaqPembangunanTotal > 0 ? keteranganInfaqPembangunan.trim() : undefined,
      totalBayar: grandTotal,
      tanggalBayar: tanggalBayar,
      waktuBayar: timeStr,
      metodePembayaran: metodeBayar,
      referensiBank: referensiBank.trim(),
      namaPenerima: namaPenerima || settings.namaBendahara,
      catatan: catatan.trim(),
      statusKuitansi: 'Resmi',
      waStatus: 'Terkirim',
      waSentAt: `${tanggalBayar} ${timeStr}`,
    };

    // Save to storage
    storage.addPayment(newPayment);

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }

    // Auto-send WhatsApp if enabled
    const confMsg = generatePaymentConfirmationMessage(newPayment, settings);
    await sendWhatsAppMessage(
      newPayment.noWa,
      confMsg,
      newPayment.namaWali,
      newPayment.siswaId,
      newPayment.siswaNama,
      'KONFIRMASI_PEMBAYARAN',
      newPayment.id
    );

    // Reset selection for this student
    setSelectedMonths([]);
    setCatatan('');
    setReferensiBank('');
    setIncludeInfaqPembangunan(false);
    setIncludeInfaqWiz(false);

    // Open receipt modal
    onViewReceipt(newPayment, true);
  };

  // Helper to check if a student has paid current active month
  const checkStudentCurrentMonthPaid = (studentId: string): boolean => {
    const studentPays = payments.filter(p => p.siswaId === studentId && p.statusKuitansi === 'Resmi');
    return studentPays.some(p => p.bulanList.some(b => b.includes('Agustus')));
  };

  // Date Filter evaluation helper
  const isDateInFilter = (dateStr: string) => {
    if (historyDatePreset === 'ALL') return true;
    if (!dateStr) return false;

    const todayObj = new Date();
    const todayStr = todayObj.toISOString().split('T')[0];

    if (historyDatePreset === 'TODAY') {
      return dateStr === todayStr;
    }

    if (historyDatePreset === 'YESTERDAY') {
      const yest = new Date(todayObj);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];
      return dateStr === yestStr;
    }

    if (historyDatePreset === 'LAST7') {
      const past7 = new Date(todayObj);
      past7.setDate(past7.getDate() - 7);
      const past7Str = past7.toISOString().split('T')[0];
      return dateStr >= past7Str && dateStr <= todayStr;
    }

    if (historyDatePreset === 'THIS_MONTH') {
      const currentYearMonth = todayStr.substring(0, 7);
      return dateStr.startsWith(currentYearMonth);
    }

    if (historyDatePreset === 'CUSTOM') {
      if (historyDateStart && historyDateEnd) {
        return dateStr >= historyDateStart && dateStr <= historyDateEnd;
      } else if (historyDateStart) {
        return dateStr >= historyDateStart;
      } else if (historyDateEnd) {
        return dateStr <= historyDateEnd;
      }
      return true;
    }

    return true;
  };

  // History Filtered List
  const filteredHistory = useMemo(() => {
    return payments.filter(pay => {
      const matchSearch = 
        pay.siswaNama.toLowerCase().includes(historySearch.toLowerCase()) ||
        pay.nis.toLowerCase().includes(historySearch.toLowerCase()) ||
        pay.noKuitansi.toLowerCase().includes(historySearch.toLowerCase()) ||
        pay.kelas.toLowerCase().includes(historySearch.toLowerCase());

      const matchSchool = historySchool === 'ALL' || pay.jenjang === historySchool;
      const matchMethod = historyMethod === 'ALL' || pay.metodePembayaran === historyMethod;
      const matchDate = isDateInFilter(pay.tanggalBayar);

      return matchSearch && matchSchool && matchMethod && matchDate;
    });
  }, [payments, historySearch, historySchool, historyMethod, historyDatePreset, historyDateStart, historyDateEnd]);

  // Aggregates for the current filtered history view
  const historySummary = useMemo(() => {
    const totalTransactions = filteredHistory.length;
    const totalNominal = filteredHistory.reduce((sum, p) => sum + p.totalBayar, 0);
    const totalInfaqPembangunan = filteredHistory.reduce((sum, p) => sum + (p.nominalInfaqPembangunan || 0), 0);
    const totalInfaqWiz = filteredHistory.reduce((sum, p) => sum + (p.nominalInfaqWiz || 0), 0);
    return { totalTransactions, totalNominal, totalInfaqPembangunan, totalInfaqWiz };
  }, [filteredHistory]);

  // Helper to split CSV line respecting quotes and custom delimiter
  const parseCsvLine = (line: string, delimiter: string = ','): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        if (inQuotes && line[i + 1] === char) {
          current += char;
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Export filtered payment history to CSV
  const handleExportHistoryCSV = () => {
    const headers = [
      'No Kuitansi',
      'Tanggal Bayar',
      'NIS Siswa',
      'Nama Siswa',
      'Jenjang Sekolah',
      'Kelas',
      'Bulan SPP Dibayar',
      'Metode Pembayaran',
      'Referensi Transaksi Bank',
      'Nominal SPP (Rp)',
      'Biaya Lainnya (Rp)',
      'Infaq Pembangunan / Gedung (Rp)',
      'Keterangan Infaq Pembangunan',
      'Infaq Wahdah Inspirasi Zakat / WIZ (Rp)',
      'Total Kas Masuk (Rp)',
      'Petugas Kasir / Bendahara',
      'Status Kuitansi',
      'Catatan Transaksi'
    ];

    const rows = filteredHistory.map(p => [
      `"${p.noKuitansi}"`,
      `"${p.tanggalBayar}"`,
      `"${p.nis}"`,
      `"${p.siswaNama.replace(/"/g, '""')}"`,
      `"${p.jenjang}"`,
      `"${p.kelas}"`,
      `"${p.bulanList.join('; ')}"`,
      `"${p.metodePembayaran}"`,
      `"${p.referensiBank ? p.referensiBank.replace(/"/g, '""') : '-'}"`,
      p.totalSpp,
      p.nominalBiayaLain || 0,
      p.nominalInfaqPembangunan || 0,
      `"${(p.keteranganInfaqPembangunan || 'Infaq Gedung & Sarana').replace(/"/g, '""')}"`,
      p.nominalInfaqWiz || 0,
      p.totalBayar,
      `"${p.namaPenerima.replace(/"/g, '""')}"`,
      `"${p.statusKuitansi}"`,
      `"${(p.catatan || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateTag = historyDatePreset !== 'ALL' ? `_${historyDatePreset}` : '';
    link.setAttribute('download', `Riwayat_Kas_Masuk_SPP_YPWI${dateTag}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download official sample template CSV for payment records
  const handleDownloadPaymentTemplate = () => {
    const templateHeaders = [
      'No Kuitansi',
      'Tanggal Bayar (YYYY-MM-DD)',
      'NIS Siswa',
      'Nama Siswa',
      'Jenjang',
      'Kelas',
      'Bulan SPP (Pisahkan titik koma jika jamak)',
      'Nominal SPP (Rp)',
      'Biaya Lainnya (Rp)',
      'Infaq Pembangunan (Rp)',
      'Infaq WIZ (Rp)',
      'Total Kas Masuk (Rp)',
      'Metode Pembayaran',
      'Referensi Transaksi Bank',
      'Nama Petugas Kasir',
      'Catatan Pembayaran'
    ];

    const sampleRows = [
      ['KW-2024-001', '2024-08-10', '202401011', 'Zaid bin Tsabit', 'SDIT', 'Kelas 2-A', 'Agustus 2024', '250000', '0', '50000', '25000', '325000', 'Transfer BSI', 'BSI-REF-99212', 'Ikhwan Syahrir', 'Lunas tepat waktu'],
      ['KW-2024-002', '2024-08-11', '202402012', 'Maryam Binti Imron', 'SMPIT', 'Kelas 7-B', 'Agustus 2024; September 2024', '700000', '100000', '50000', '0', '850000', 'Tunai Kasir', '-', 'Ikhwan Syahrir', 'Pembayaran SPP 2 Bulan']
    ];

    // Kolom nominal ditulis sebagai angka agar Excel mengenalinya sebagai rupiah
    const excelRows = sampleRows.map(row =>
      row.map((cell, idx) => (idx >= 7 && idx <= 11 ? Number(cell) : cell))
    );

    downloadExcelTemplate(
      'Template_Import_Pembayaran_SPP_YPWI.xlsx',
      'Pembayaran SPP',
      templateHeaders,
      excelRows
    );
  };

  // Parse raw CSV text to Pembayaran objects
  const parseRawCsvToPayments = (rawText: string): Pembayaran[] => {
    const lines = rawText.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headerCols = parseCsvLine(lines[0], delimiter).map(h => 
      h.toLowerCase().replace(/[^a-z0-9]/g, '')
    );

    const colIdx = {
      noKuitansi: headerCols.findIndex(h => h.includes('kuitansi') || h.includes('resi') || h.includes('kwitansi')),
      tanggal: headerCols.findIndex(h => h.includes('tanggal') || h.includes('tgl')),
      nis: headerCols.findIndex(h => h === 'nis' || (h.includes('nis') && !h.includes('nisn'))),
      nama: headerCols.findIndex(h => (h.includes('nama') || h.includes('siswa')) && !h.includes('nis') && !h.includes('kuitansi') && !h.includes('petugas') && !h.includes('kasir') && !h.includes('penerima') && !h.includes('wali')),
      jenjang: headerCols.findIndex(h => h.includes('jenjang') || h.includes('tingkat') || h.includes('unit')),
      kelas: headerCols.findIndex(h => h.includes('kelas')),
      bulan: headerCols.findIndex(h => h.includes('bulan')),
      spp: headerCols.findIndex(h => (h.includes('spp') || h.includes('tarif')) && !h.includes('bulan')),
      biayaLain: headerCols.findIndex(h => h.includes('lain')),
      infaqPembangunan: headerCols.findIndex(h => h.includes('pembangunan') || h.includes('gedung')),
      infaqWiz: headerCols.findIndex(h => h.includes('wiz') || h.includes('zakat')),
      total: headerCols.findIndex(h => h.includes('total')),
      metode: headerCols.findIndex(h => h.includes('metode') || h.includes('carabayar')),
      referensi: headerCols.findIndex(h => h.includes('ref') || h.includes('rekening')),
      penerima: headerCols.findIndex(h => h.includes('kasir') || h.includes('penerima') || h.includes('bendahara')),
      catatan: headerCols.findIndex(h => h.includes('catatan') || h.includes('keterangan')),
    };

    const parsed: Pembayaran[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCsvLine(line, delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());

      const getVal = (idx: number, fallbackIdx: number, defaultValue: string = '') => {
        if (idx !== -1 && cols[idx] !== undefined && cols[idx] !== '') return cols[idx];
        if (fallbackIdx < cols.length && cols[fallbackIdx] !== undefined) return cols[fallbackIdx];
        return defaultValue;
      };

      const nama = getVal(colIdx.nama, 3, '');
      const nis = getVal(colIdx.nis, 2, '');
      if (!nama && !nis) continue;

      // Match student from DB if possible
      const matchedStudent = students.find(s => 
        (nis && s.nis === nis) || (nama && s.nama.toLowerCase() === nama.toLowerCase())
      );

      const noKuitansi = getVal(colIdx.noKuitansi, 0, `KW-${new Date().getFullYear()}-${1000 + i}`);
      const tanggalBayar = getVal(colIdx.tanggal, 1, new Date().toISOString().split('T')[0]);
      
      const rawJenjang = getVal(colIdx.jenjang, 4, matchedStudent?.jenjang || 'SDIT').toUpperCase();
      let jenjang: JenjangPendidikan = 'SDIT';
      if (rawJenjang.includes('RA') || rawJenjang.includes('TK')) jenjang = 'RA / TK';
      else if (rawJenjang.includes('SMP')) jenjang = 'SMPIT';
      else if (rawJenjang.includes('SMA') || rawJenjang.includes('TAHFIDZ')) jenjang = 'SMAIT / Tahfidz';

      const kelas = getVal(colIdx.kelas, 5, matchedStudent?.kelas || 'Kelas 1-A');
      
      const rawBulan = getVal(colIdx.bulan, 6, 'Agustus 2024');
      const bulanList = rawBulan.split(/[,;]/).map(b => b.trim() as any).filter(b => b.length > 0);

      const totalSpp = parseInt(getVal(colIdx.spp, 7, '250000').replace(/[^0-9]/g, ''), 10) || 250000;
      const nominalBiayaLain = parseInt(getVal(colIdx.biayaLain, 8, '0').replace(/[^0-9]/g, ''), 10) || 0;
      const nominalInfaqPembangunan = parseInt(getVal(colIdx.infaqPembangunan, 9, '0').replace(/[^0-9]/g, ''), 10) || 0;
      const nominalInfaqWiz = parseInt(getVal(colIdx.infaqWiz, 10, '0').replace(/[^0-9]/g, ''), 10) || 0;

      const calculatedTotal = totalSpp + nominalBiayaLain + nominalInfaqPembangunan + nominalInfaqWiz;
      const totalBayar = parseInt(getVal(colIdx.total, 11, `${calculatedTotal}`).replace(/[^0-9]/g, ''), 10) || calculatedTotal;

      const rawMetode = getVal(colIdx.metode, 12, 'Transfer BSI');
      let metodePembayaran: MetodePembayaran = 'Transfer BSI';
      if (rawMetode.toLowerCase().includes('tunai') || rawMetode.toLowerCase().includes('kasir')) metodePembayaran = 'Tunai Kasir';
      else if (rawMetode.toLowerCase().includes('bri')) metodePembayaran = 'Transfer BRI';
      else if (rawMetode.toLowerCase().includes('qris')) metodePembayaran = 'QRIS Yayasan';
      else if (rawMetode.toLowerCase().includes('muamalat')) metodePembayaran = 'Bank Muamalat';

      const referensiBank = getVal(colIdx.referensi, 13, '');
      const namaPenerima = getVal(colIdx.penerima, 14, settings.namaBendahara);
      const catatan = getVal(colIdx.catatan, 15, 'Import batch Excel/CSV');

      parsed.push({
        id: `pay-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        noKuitansi,
        tanggalBayar,
        waktuBayar: new Date().toTimeString().substring(0, 5) || '10:00',
        siswaId: matchedStudent ? matchedStudent.id : `sis-${nis || Date.now()}`,
        siswaNama: matchedStudent ? matchedStudent.nama : (nama || 'Siswa YPWI'),
        nis: matchedStudent ? matchedStudent.nis : (nis || '000000'),
        namaWali: matchedStudent ? matchedStudent.namaWali : 'Orang Tua Siswa',
        noWa: matchedStudent ? matchedStudent.noWa : '08123456789',
        tahunAjaran: matchedStudent ? matchedStudent.tahunAjaran : '2024/2025',
        jenjang,
        kelas,
        bulanList: bulanList.length > 0 ? bulanList : ['Agustus 2024'],
        nominalSppPerBulan: matchedStudent ? matchedStudent.sppBulanan : totalSpp,
        totalSpp,
        nominalBiayaLain,
        nominalInfaqPembangunan,
        keteranganInfaqPembangunan: nominalInfaqPembangunan > 0 ? 'Infaq Pembangunan Gedung Sekolah' : undefined,
        nominalInfaqWiz,
        totalBayar,
        metodePembayaran,
        namaPenerima,
        statusKuitansi: 'Resmi',
        waStatus: 'Belum Dikirim',
        referensiBank: referensiBank || undefined,
        catatan: catatan || undefined,
      });
    }

    return parsed;
  };

  // Payment file upload handler
  const handlePaymentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportPaymentFileName(file.name);
    setImportPaymentError(null);

    // File Excel dibaca lalu diubah ke teks CSV agar memakai parser yang sama
    if (isSpreadsheetFile(file)) {
      readSpreadsheetAsCsvText(file)
        .then(text => {
          setImportPaymentCsvText(text);
          setParsedPaymentPreviewList(parseRawCsvToPayments(text));
        })
        .catch(() => {
          setImportPaymentError('Gagal membaca file Excel. Pastikan file .xlsx/.xls tidak rusak.');
        });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setImportPaymentCsvText(text);
        const parsed = parseRawCsvToPayments(text);
        setParsedPaymentPreviewList(parsed);
      }
    };
    reader.onerror = () => {
      setImportPaymentError('Gagal membaca file. Pastikan file berformat CSV atau Excel.');
    };
    reader.readAsText(file);
  };

  // Process payment CSV import
  const handleProcessImportPaymentCsv = () => {
    try {
      setImportPaymentError(null);
      if (!importPaymentCsvText.trim()) {
        setImportPaymentError('Mohon pilih file CSV atau tempelkan teks CSV terlebih dahulu.');
        return;
      }

      const parsed = parseRawCsvToPayments(importPaymentCsvText);
      if (parsed.length === 0) {
        setImportPaymentError('Tidak ada data transaksi pembayaran yang valid ditemukan.');
        return;
      }

      storage.importPayments(parsed);
      setImportPaymentSuccess(`Alhamdulillah! Berhasil mengimpor ${parsed.length} transaksi kas masuk ke database.`);
      setParsedPaymentPreviewList([]);
      setImportPaymentFileName('');
      setTimeout(() => {
        setIsImportPaymentModalOpen(false);
        setImportPaymentSuccess(null);
        setImportPaymentCsvText('');
      }, 2000);
    } catch (err: any) {
      setImportPaymentError('Gagal memproses data CSV: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header: Title, Global Search & Tab Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold mb-1">
              <span>Kasir & Pembukuan SPP Terpadu</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Proses Pembayaran SPP YPWI Konawe
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih database sekolah di bawah, pilih kelas, lalu tentukan bulan SPP yang dibayarkan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveMainTab('RECORD')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'RECORD'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Database Sekolah & Kelas</span>
            </button>

            <button
              onClick={() => setActiveMainTab('HISTORY')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeMainTab === 'HISTORY'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Riwayat Kas Masuk ({payments.length})</span>
            </button>
          </div>
        </div>

        {/* Global Fast Student Search Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Pencarian Cepat: Ketik Nama Siswa, NIS, atau Nama Orang Tua di seluruh unit..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Bersihkan
            </button>
          )}
        </div>
      </div>

      {activeMainTab === 'RECORD' ? (
        <div className="space-y-6">
          
          {/* 1. DATABASE PER SEKOLAH (School Level Cards) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Langkah 1: Pilih Database Sekolah / Unit Pendidikan</span>
              </h3>
              <span className="text-[11px] text-slate-400">{schoolDefinitions.length} Unit Pendidikan {settings.namaSingkat || 'YPWI Konawe'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {schoolDefinitions.map((sch) => {
                const Icon = sch.icon;
                const isSelected = selectedSchool === sch.id && !globalSearch;
                const studentCount = students.filter(s => s.jenjang === sch.id).length;
                const classCount = new Set(students.filter(s => s.jenjang === sch.id).map(s => s.kelas)).size;

                return (
                  <div
                    key={sch.id}
                    onClick={() => {
                      setGlobalSearch('');
                      handleSchoolChange(sch.id);
                    }}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden select-none glow-card ${
                      isSelected
                        ? 'bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {studentCount} Siswa
                      </span>
                    </div>

                    <div className="mt-3">
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight">
                        {sch.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {classCount} Kelas Aktif
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Tarif Standar:</span>
                      <strong className="text-emerald-700 font-bold">Rp {formatRupiah(sch.defaultSpp)}</strong>
                    </div>

                    {isSelected && (
                      <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-600 rounded-bl-lg"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. DIBAGI LAGI PER KELAS (Class Filter Pills) */}
          {!globalSearch && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 text-emerald-800">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Langkah 2: Pilih Kelas di {selectedSchool}</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  Klik kelas untuk memfilter siswa
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* All Classes in this School Button */}
                <button
                  type="button"
                  onClick={() => setSelectedClass('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedClass === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Semua Kelas ({students.filter(s => s.jenjang === selectedSchool).length} Siswa)
                </button>

                {/* Individual Classes */}
                {schoolClasses.map((cls) => {
                  const countInClass = students.filter(s => s.jenjang === selectedSchool && s.kelas === cls).length;
                  const isSelected = selectedClass === cls;

                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSelectedClass(cls)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white font-bold shadow-xs ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-700'
                      }`}
                    >
                      <span>{cls}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {countInClass}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. DUA KOLOM: DAFTAR SISWA KELAS & KASIR CHECKOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT: ROSTER SISWA KELAS (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Daftar Murid: {globalSearch ? `Hasil Pencarian (${filteredStudents.length})` : `${selectedSchool} — ${selectedClass === 'ALL' ? 'Semua Kelas' : selectedClass}`}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Klik salah satu murid untuk memproses tagihan
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                    {filteredStudents.length} Murid
                  </span>
                </div>

                {/* List of Students in this Class */}
                <div className="mt-3 space-y-2 max-h-[580px] overflow-y-auto pr-1">
                  {filteredStudents.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Tidak ada data siswa di kelas ini.
                    </div>
                  ) : (
                    filteredStudents.map((s) => {
                      const isChosen = currentStudent?.id === s.id;
                      const isPaidActive = checkStudentCurrentMonthPaid(s.id);
                      const reminderMsg = generateBillingReminderMessage(s, ['Agustus 2024'], settings);
                      const waUrl = buildDirectWhatsAppUrl(s.noWa, reminderMsg);

                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setChosenStudentId(s.id);
                            setSelectedMonths([]);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer select-none relative ${
                            isChosen
                              ? 'bg-emerald-50/70 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                              : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-emerald-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                s.jenisKelamin === 'L' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {s.nama.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 text-xs truncate leading-snug">
                                  {s.nama}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  NIS: {s.nis} • {s.kelas}
                                </p>
                              </div>
                            </div>

                            {/* Status Bulan Ini */}
                            <div className="shrink-0 text-right">
                              {isPaidActive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3" /> Lunas
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                  Belum Bayar
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                            <div>
                              <span>Wali: <strong className="text-slate-700">{s.namaWali}</strong></span>
                            </div>

                            <div className="flex items-center gap-2">
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Chat / Kirim Tagihan WA"
                                className="text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1 text-[10px]"
                              >
                                <Send className="w-2.5 h-2.5" />
                                <span>WA</span>
                              </a>

                              <button
                                type="button"
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                  isChosen
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white border border-slate-300 text-slate-700'
                                }`}
                              >
                                {isChosen ? 'Sedang Diproses' : 'Pilih'}
                              </button>
                            </div>
                          </div>

                          {isChosen && (
                            <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-600 rounded-r-md"></div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: KASIR CHECKOUT PEMBAYARAN (7 Cols) */}
            <div className="lg:col-span-7 space-y-5">
              {currentStudent ? (
                <div className="bg-white rounded-2xl border border-emerald-100 p-5 sm:p-6 shadow-xs space-y-5">
                  
                  {/* Selected Student Banner */}
                  <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-emerald-200 mb-1">
                        <span>{currentStudent.jenjang}</span>
                        <span>•</span>
                        <span>{currentStudent.kelas}</span>
                        <span>•</span>
                        <span>TA {currentStudent.tahunAjaran}</span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white">
                        {currentStudent.nama}
                      </h3>
                      <p className="text-xs text-emerald-100 font-mono mt-0.5">
                        NIS: {currentStudent.nis} • Wali: {currentStudent.namaWali} ({currentStudent.noWa})
                      </p>
                    </div>

                    <div className="text-left sm:text-right bg-white/10 p-2.5 rounded-xl border border-white/15">
                      <span className="text-[10px] uppercase font-bold text-emerald-200">Tarif SPP Bulanan</span>
                      <p className="text-base font-black text-white">
                        Rp {formatRupiah(currentStudent.sppBulanan)}
                      </p>
                    </div>
                  </div>

                  {/* Payment Form */}
                  <form onSubmit={handleSavePayment} className="space-y-4 text-xs">
                    
                    {/* Month Picker */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="block font-bold text-slate-800 uppercase text-[11px] tracking-wide text-emerald-800">
                            Pilih Bulan SPP Yang Dibayarkan
                          </label>
                          <p className="text-[11px] text-slate-500">
                            Centang satu atau beberapa bulan sekaligus untuk pembayaran
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={selectAllUnpaid}
                            className="font-semibold text-emerald-700 hover:underline cursor-pointer"
                          >
                            Pilih Semua Belum Bayar
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={clearSelectedMonths}
                            className="text-slate-500 hover:underline cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      </div>

                      {/* 12 Months Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {billingStatus.map((item) => {
                          const isPaid = item.status === 'LUNAS';
                          const isSelected = selectedMonths.includes(item.label);

                          return (
                            <div
                              key={item.label}
                              onClick={() => toggleMonth(item.label, isPaid)}
                              className={`p-2.5 rounded-xl border transition-all text-center select-none ${
                                isPaid
                                  ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed opacity-75'
                                  : isSelected
                                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs font-bold ring-2 ring-emerald-400 cursor-pointer'
                                  : 'bg-slate-50 border-slate-200 hover:bg-white hover:border-emerald-300 text-slate-700 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-bold text-xs">{item.bulan}</span>
                                <span className="text-[10px] opacity-75">{item.tahun}</span>
                              </div>
                              <div className="text-[10px]">
                                {isPaid ? (
                                  <span className="text-emerald-700 font-semibold flex items-center justify-center gap-0.5">
                                    <Check className="w-3 h-3" /> Lunas
                                  </span>
                                ) : isSelected ? (
                                  <span className="text-emerald-100 font-medium">✓ Terpilih</span>
                                ) : (
                                  <span className="text-slate-500">Rp {formatRupiah(item.nominal)}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* INFAQ & SEDEKAH SUKARELA SECTION */}
                    <div className="bg-gradient-to-br from-emerald-50/60 via-teal-50/40 to-sky-50/50 rounded-2xl border border-emerald-200/80 p-4 space-y-3.5">
                      <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                            <Sparkles className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide text-emerald-950">
                              Tambahan Infaq & Sedekah (Opsional)
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Dapat ditambahkan langsung pada saat pembayaran SPP
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Amal Jariyah
                        </span>
                      </div>

                      {/* 1. Infaq Sedekah Pembangunan Sekolah */}
                      <div className={`p-3 rounded-xl border transition-all ${
                        includeInfaqPembangunan 
                          ? 'bg-white border-sky-400 shadow-xs ring-1 ring-sky-300' 
                          : 'bg-white/80 border-slate-200 hover:border-slate-300'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                            <img 
                              src={settings.logoPembangunanUrl || 'assets/aistudio/LOGO_YAYASAN_d78c341b.png'} 
                              alt="Infaq Pembangunan" 
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={includeInfaqPembangunan}
                                  onChange={(e) => setIncludeInfaqPembangunan(e.target.checked)}
                                  className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500 cursor-pointer"
                                />
                                <span className="font-bold text-xs text-slate-900">
                                  Infaq / Sedekah Pembangunan Sekolah
                                </span>
                              </label>

                              {includeInfaqPembangunan && (
                                <span className="font-bold text-xs text-sky-700">
                                  + Rp {formatRupiah(nominalInfaqPembangunan)}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Untuk pembangunan gedung kelas baru, masjid, asrama santri, dan fasilitas sekolah.
                            </p>

                            {includeInfaqPembangunan && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] text-slate-500 font-semibold mr-1">Pilih Nominal:</span>
                                  {[20000, 50000, 100000, 200000].map((nom) => (
                                    <button
                                      key={nom}
                                      type="button"
                                      onClick={() => setNominalInfaqPembangunan(nom)}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                        nominalInfaqPembangunan === nom
                                          ? 'bg-sky-600 text-white shadow-xs'
                                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                      }`}
                                    >
                                      Rp {formatRupiah(nom)}
                                    </button>
                                  ))}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                      Nominal Lainnya (Rp):
                                    </label>
                                    <input
                                      type="number"
                                      min={1000}
                                      step={5000}
                                      value={nominalInfaqPembangunan}
                                      onChange={(e) => setNominalInfaqPembangunan(Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-sky-800"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                      Peruntukan / Keterangan:
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Pembangunan Gedung & Sarana"
                                      value={keteranganInfaqPembangunan}
                                      onChange={(e) => setKeteranganInfaqPembangunan(e.target.value)}
                                      className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 2. Infaq Wahdah Inspirasi Zakat (WIZ) */}
                      <div className={`p-3 rounded-xl border transition-all ${
                        includeInfaqWiz 
                          ? 'bg-white border-emerald-500 shadow-xs ring-1 ring-emerald-300' 
                          : 'bg-white/80 border-slate-200 hover:border-slate-300'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                            <img 
                              src={settings.logoWizUrl || 'assets/aistudio/LOGO_YAYASAN_d78c341b.png'} 
                              alt="Logo Wahdah Inspirasi Zakat" 
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={includeInfaqWiz}
                                  onChange={(e) => setIncludeInfaqWiz(e.target.checked)}
                                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className="font-bold text-xs text-slate-900">
                                  Infaq ke Wahdah Inspirasi Zakat (WIZ)
                                </span>
                              </label>

                              {includeInfaqWiz && (
                                <span className="font-bold text-xs text-emerald-700">
                                  + Rp {formatRupiah(nominalInfaqWiz)}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Lembaga Amil Zakat Wahdah Inspirasi Zakat — Penyaluran program sedekah dhuafa, beasiswa da'i & kemanusiaan.
                            </p>

                            {includeInfaqWiz && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] text-slate-500 font-semibold mr-1">Pilih Nominal:</span>
                                  {[10000, 20000, 50000, 100000].map((nom) => (
                                    <button
                                      key={nom}
                                      type="button"
                                      onClick={() => setNominalInfaqWiz(nom)}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                        nominalInfaqWiz === nom
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                      }`}
                                    >
                                      Rp {formatRupiah(nom)}
                                    </button>
                                  ))}
                                </div>

                                <div className="max-w-xs">
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                                    Nominal Infaq WIZ Lainnya (Rp):
                                  </label>
                                  <input
                                    type="number"
                                    min={1000}
                                    step={5000}
                                    value={nominalInfaqWiz}
                                    onChange={(e) => setNominalInfaqWiz(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-emerald-800"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Metode Bayar & Tanggal */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Metode Pembayaran</label>
                        <select
                          value={metodeBayar}
                          onChange={(e) => setMetodeBayar(e.target.value as MetodePembayaran)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white cursor-pointer"
                        >
                          <option value="Transfer BSI">Transfer Bank Syariah Indonesia (BSI)</option>
                          <option value="Tunai Kasir">Tunai Kasir Yayasan</option>
                          <option value="Transfer BRI">Transfer BRI</option>
                          <option value="QRIS Yayasan">QRIS Resmi Yayasan</option>
                          <option value="Bank Muamalat">Transfer Bank Muamalat</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Tanggal Transaksi</label>
                        <input
                          type="date"
                          value={tanggalBayar}
                          onChange={(e) => setTanggalBayar(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">No. Referensi Transfer / Ref Bank (Opsional)</label>
                        <input
                          type="text"
                          placeholder="Contoh: BSI-REF991827"
                          value={referensiBank}
                          onChange={(e) => setReferensiBank(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Kasir / Bendahara Penerima</label>
                        <input
                          type="text"
                          value={namaPenerima}
                          onChange={(e) => setNamaPenerima(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                      <input
                        type="text"
                        placeholder="Contoh: Pembayaran dititipkan langsung oleh wali murid"
                        value={catatan}
                        onChange={(e) => setCatatan(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                      />
                    </div>

                    {/* Total Summary & Breakdown */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-slate-500 text-[11px]">Bulan Terpilih:</span>
                          <p className="font-bold text-slate-900">
                            {selectedMonths.length > 0 ? selectedMonths.join(', ') : 'Belum ada bulan yang dipilih'}
                          </p>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Total Kas Masuk Sah</span>
                          <p className="text-xl font-black text-emerald-700">
                            Rp {formatRupiah(grandTotal)}
                          </p>
                        </div>
                      </div>

                      {/* Itemized Mini Breakdown */}
                      {(includeInfaqPembangunan || includeInfaqWiz) && selectedMonths.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                          <span>SPP: <strong>Rp {formatRupiah(totalSpp)}</strong></span>
                          {includeInfaqPembangunan && (
                            <span className="text-sky-700 font-medium">Infaq Pembangunan: <strong>Rp {formatRupiah(infaqPembangunanTotal)}</strong></span>
                          )}
                          {includeInfaqWiz && (
                            <span className="text-emerald-700 font-medium">Infaq WIZ: <strong>Rp {formatRupiah(infaqWizTotal)}</strong></span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div>
                      <button
                        type="submit"
                        disabled={selectedMonths.length === 0}
                        className={`w-full py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                          selectedMonths.length > 0
                            ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-emerald-700/25'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        <span>
                          Simpan Pembayaran & Kirim Resi WhatsApp (Rp {formatRupiah(grandTotal)})
                        </span>
                      </button>
                    </div>

                  </form>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                  Pilih salah satu siswa di sebelah kiri untuk memulai proses pembayaran.
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        /* HISTORY TAB (Filterable by Date/Day, School, Class & Method) */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-0">
          <div className="p-5 border-b border-slate-200/80 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold mb-1">
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  <span>Buku Kas Masuk Digital</span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg">Riwayat Transaksi Kas Masuk</h3>
                <p className="text-xs text-slate-500">
                  Gunakan filter tanggal atau hari untuk memeriksa transaksi kas harian secara akurat.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari Siswa / Kuitansi..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-xs"
                  />
                </div>

                <select
                  value={historySchool}
                  onChange={(e) => setHistorySchool(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer text-xs"
                >
                  <option value="ALL">Semua Unit Sekolah</option>
                  <option value="SDIT">SDIT</option>
                  <option value="SMPIT">SMPIT</option>
                  <option value="SMAIT / Tahfidz">SMAIT / Tahfidz</option>
                  <option value="RA / TK">RA / TK</option>
                </select>

                <select
                  value={historyMethod}
                  onChange={(e) => setHistoryMethod(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 cursor-pointer text-xs"
                >
                  <option value="ALL">Semua Metode</option>
                  <option value="Transfer BSI">Transfer BSI</option>
                  <option value="Tunai Kasir">Tunai Kasir</option>
                  <option value="Transfer BRI">Transfer BRI</option>
                  <option value="QRIS Yayasan">QRIS</option>
                  <option value="Bank Muamalat">Bank Muamalat</option>
                </select>

                {/* Export & Import CSV Action Buttons */}
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={handleExportHistoryCSV}
                    title="Export Transaksi Kas Masuk ke File Excel / CSV"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl transition-all cursor-pointer shadow-xs text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsImportPaymentModalOpen(true)}
                    title="Import Transaksi Pembayaran Masal (CSV)"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer text-xs border border-slate-200"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>Import CSV</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Date Filtering Bar (Filter Tanggal / Hari) */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Filter Tanggal:</span>
                </span>
                
                {[
                  { id: 'ALL', label: 'Semua Waktu' },
                  { id: 'TODAY', label: 'Hari Ini' },
                  { id: 'YESTERDAY', label: 'Kemarin' },
                  { id: 'LAST7', label: '7 Hari Terakhir' },
                  { id: 'THIS_MONTH', label: 'Bulan Ini' },
                  { id: 'CUSTOM', label: 'Pilih Tanggal / Rentang' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setHistoryDatePreset(preset.id as any);
                      if (preset.id === 'TODAY') {
                        const todayStr = new Date().toISOString().split('T')[0];
                        setHistoryDateStart(todayStr);
                        setHistoryDateEnd(todayStr);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      historyDatePreset === preset.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Pickers if CUSTOM selected */}
              {historyDatePreset === 'CUSTOM' && (
                <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 animate-in fade-in duration-150">
                  <input
                    type="date"
                    value={historyDateStart}
                    onChange={(e) => setHistoryDateStart(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    title="Tanggal Mulai"
                  />
                  <span className="text-slate-400 text-xs">s/d</span>
                  <input
                    type="date"
                    value={historyDateEnd}
                    onChange={(e) => setHistoryDateEnd(e.target.value)}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    title="Tanggal Selesai"
                  />
                  {(historyDateStart || historyDateEnd) && (
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryDateStart('');
                        setHistoryDateEnd('');
                      }}
                      className="text-[10px] text-rose-600 hover:underline px-1 cursor-pointer font-bold"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Quick Metrics of the filtered results */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Transaksi</span>
                <p className="text-base font-black text-slate-900 mt-0.5">
                  {historySummary.totalTransactions} Kuitansi
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200/80 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-emerald-800">Total Kas Masuk Sah</span>
                <p className="text-base font-black text-emerald-700 mt-0.5">
                  Rp {formatRupiah(historySummary.totalNominal)}
                </p>
              </div>

              <div className="bg-sky-50 border border-sky-200/80 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-sky-800">Infaq Pembangunan</span>
                <p className="text-base font-black text-sky-700 mt-0.5">
                  Rp {formatRupiah(historySummary.totalInfaqPembangunan)}
                </p>
              </div>

              <div className="bg-teal-50 border border-teal-200/80 p-2.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-teal-800">Infaq WIZ</span>
                <p className="text-base font-black text-teal-700 mt-0.5">
                  Rp {formatRupiah(historySummary.totalInfaqWiz)}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">No. Kuitansi</th>
                  <th className="py-3 px-3">Tanggal & Hari</th>
                  <th className="py-3 px-3">Siswa & Kelas</th>
                  <th className="py-3 px-3">Sekolah / Unit</th>
                  <th className="py-3 px-3">Bulan SPP</th>
                  <th className="py-3 px-3">Metode Bayar</th>
                  <th className="py-3 px-3 text-right">Total Kas Masuk</th>
                  <th className="py-3 px-4 text-center sticky right-0 z-20 bg-slate-50 shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.18)]">Aksi Kuitansi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Tidak ada riwayat pembayaran yang cocok dengan filter tanggal & unit.
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((p) => {
                    const waConfirmMsg = generatePaymentConfirmationMessage(p, settings);
                    const directWaUrl = buildDirectWhatsAppUrl(p.noWa, waConfirmMsg);

                    return (
                      <tr key={p.id} className="glow-row">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                          {p.noKuitansi}
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          <p className="font-semibold text-slate-900">{p.tanggalBayar}</p>
                          <p className="text-[10px] text-slate-400">{p.waktuBayar ? `${p.waktuBayar} WITA` : ''}</p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{p.siswaNama}</p>
                          <p className="text-[10px] text-slate-500">{p.kelas}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            {p.jenjang}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">
                          {p.bulanList.join(', ')}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {p.metodePembayaran}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <p className="font-extrabold text-emerald-700">
                            Rp {formatRupiah(p.totalBayar)}
                          </p>
                          {Boolean(p.nominalInfaqPembangunan && p.nominalInfaqPembangunan > 0) && (
                            <span className="inline-block text-[9px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200 mt-0.5 mr-1">
                              +Infaq Gedung: {formatRupiah(p.nominalInfaqPembangunan!)}
                            </span>
                          )}
                          {Boolean(p.nominalInfaqWiz && p.nominalInfaqWiz > 0) && (
                            <span className="inline-block text-[9px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 mt-0.5">
                              +WIZ: {formatRupiah(p.nominalInfaqWiz!)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center sticky right-0 z-10 bg-white shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.18)]">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onViewReceipt(p)}
                              title="Lihat Kuitansi Resmi"
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => generateReceiptPDF(p, settings)}
                              title="Unduh PDF Kuitansi"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <a
                              href={directWaUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Kirim Resi via WhatsApp"
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </a>

                            <button
                              onClick={() => {
                                if (window.confirm(`Hapus kuitansi ${p.noKuitansi} untuk ${p.siswaNama}?`)) {
                                  storage.deletePayment(p.id);
                                }
                              }}
                              title="Hapus Transaksi"
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Import CSV Riwayat Transaksi Pembayaran */}
      {isImportPaymentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-emerald-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col text-xs">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="font-bold text-base">Import Transaksi Pembayaran SPP Masal (Excel / CSV)</h3>
                  <p className="text-[11px] text-emerald-200">Format Kolom Terstandarisasi Sistem Kas Masuk YPWI Konawe</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsImportPaymentModalOpen(false);
                  setParsedPaymentPreviewList([]);
                  setImportPaymentFileName('');
                }}
                className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              {/* Template Download Card */}
              <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 text-emerald-950">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-900">Download Template Transaksi Pembayaran (.xlsx)</p>
                    <p className="text-[11px] text-emerald-700">
                      Format kolom terstruktur mencakup nomor kuitansi, tanggal, siswa, infaq pembangunan gedung, infaq WIZ, dan rincian bayar.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadPaymentTemplate}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-bold shrink-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template Excel</span>
                </button>
              </div>

              {/* Column Reference Guide Toggle */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPaymentColumnGuide(!showPaymentColumnGuide)}
                  className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-bold text-slate-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    <span>Panduan Penjelasan Kolom Transaksi Pembayaran</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    {showPaymentColumnGuide ? 'Sembunyikan Panduan ▲' : 'Lihat Rincian Kolom ▼'}
                  </span>
                </button>

                {showPaymentColumnGuide && (
                  <div className="p-3 bg-white border-t border-slate-200 overflow-x-auto text-[11px]">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-1.5 text-left">Nama Kolom</th>
                          <th className="p-1.5 text-left">Sifat</th>
                          <th className="p-1.5 text-left">Format & Ketentuan</th>
                          <th className="p-1.5 text-left">Contoh Isi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">1. No Kuitansi</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5">Nomor tanda bukti bayar unik (jika kosong dibuatkan otomatis)</td>
                          <td className="p-1.5 font-mono">KW-2024-001</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">2. Tanggal Bayar</td>
                          <td className="p-1.5 text-rose-600 font-bold">Wajib</td>
                          <td className="p-1.5">Format tahun-bulan-hari: <code className="bg-slate-100 px-1 rounded">YYYY-MM-DD</code></td>
                          <td className="p-1.5 font-mono">2024-08-10</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">3. NIS Siswa</td>
                          <td className="p-1.5 text-rose-600 font-bold">Wajib</td>
                          <td className="p-1.5">Nomor Induk Siswa yang terdaftar di sistem</td>
                          <td className="p-1.5 font-mono">202401011</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">4. Nama Siswa</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5">Nama lengkap siswa (otomatis dicek silang dengan NIS)</td>
                          <td className="p-1.5">Zaid bin Tsabit</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">5. Jenjang</td>
                          <td className="p-1.5 text-rose-600 font-bold">Wajib</td>
                          <td className="p-1.5"><code className="bg-slate-100 px-1 rounded">RA / TK</code>, <code className="bg-slate-100 px-1 rounded">SDIT</code>, <code className="bg-slate-100 px-1 rounded">SMPIT</code>, <code className="bg-slate-100 px-1 rounded">SMAIT / Tahfidz</code></td>
                          <td className="p-1.5 font-semibold text-emerald-700">SDIT</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">6. Kelas</td>
                          <td className="p-1.5 text-rose-600 font-bold">Wajib</td>
                          <td className="p-1.5">Rombel / kelas siswa</td>
                          <td className="p-1.5">Kelas 2-A</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">7. Bulan SPP</td>
                          <td className="p-1.5 text-rose-600 font-bold">Wajib</td>
                          <td className="p-1.5">Nama bulan pembayaran SPP (pisahkan dengan titik koma jika jamak)</td>
                          <td className="p-1.5 font-semibold">Agustus 2024</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">8. Nominal SPP</td>
                          <td className="p-1.5 text-rose-600 font-bold">Wajib</td>
                          <td className="p-1.5">Besaran SPP pokok (angka tanpa titik)</td>
                          <td className="p-1.5 font-mono">250000</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">9. Biaya Lainnya</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5">Biaya tambahan lain jika ada (atau 0)</td>
                          <td className="p-1.5 font-mono">0</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">10. Infaq Pembangunan</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5">Infaq sukarela pembangunan sarana sekolah</td>
                          <td className="p-1.5 font-mono text-sky-800">50000</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">11. Infaq WIZ</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5">Infaq Wahdah Inspirasi Zakat</td>
                          <td className="p-1.5 font-mono text-teal-800">25000</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">12. Total Kas Masuk</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5">Total uang disetor (jika kosong, auto dihitung dari jumlah rincian)</td>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">325000</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">13. Metode Bayar</td>
                          <td className="p-1.5 text-rose-600 font-bold">Wajib</td>
                          <td className="p-1.5"><code className="bg-slate-100 px-1 rounded">Transfer BSI</code>, <code className="bg-slate-100 px-1 rounded">Tunai Kasir</code>, <code className="bg-slate-100 px-1 rounded">Transfer BRI</code>, <code className="bg-slate-100 px-1 rounded">QRIS Yayasan</code></td>
                          <td className="p-1.5">Transfer BSI</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">14. Referensi Bank</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5">Nomor referensi mutasi bank atau rekening</td>
                          <td className="p-1.5 font-mono">BSI-9921</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">15. Petugas Kasir</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5">Nama kasir / bendahara yang mencatat</td>
                          <td className="p-1.5">Ikhwan Syahrir</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">16. Catatan</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5">Keterangan tambahan transaksi</td>
                          <td className="p-1.5">Lunas via BSI Mobile</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Upload File Box */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  1. Pilih File CSV dari Komputer / Laptop:
                </label>
                <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-4 text-center bg-emerald-50/30 hover:bg-emerald-50/60 transition-colors">
                  <input
                    type="file"
                    id="csvPaymentFileInput"
                    accept=".csv,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handlePaymentFileUpload}
                    className="hidden"
                  />
                  <label 
                    htmlFor="csvPaymentFileInput"
                    className="flex flex-col items-center justify-center cursor-pointer gap-2"
                  >
                    <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs">
                        {importPaymentFileName ? `File Terpilih: ${importPaymentFileName}` : 'Klik untuk Pilih File CSV Pembayaran (.csv)'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Mendukung file CSV hasil ekspor spreadsheet riwayat kas offline.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Or Paste CSV text */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  2. Atau Tempelkan (Paste) Teks CSV di bawah ini:
                </label>
                <textarea
                  rows={5}
                  placeholder={`"No Kuitansi","Tanggal Bayar (YYYY-MM-DD)","NIS Siswa","Nama Siswa","Jenjang","Kelas","Bulan SPP (Pisahkan titik koma jika jamak)","Nominal SPP (Rp)","Biaya Lainnya (Rp)","Infaq Pembangunan (Rp)","Infaq WIZ (Rp)","Total Kas Masuk (Rp)","Metode Pembayaran","Referensi Transaksi Bank","Nama Petugas Kasir","Catatan Pembayaran"
"KW-2024-001","2024-08-10","202401011","Zaid bin Tsabit","SDIT","Kelas 2-A","Agustus 2024",250000,0,50000,25000,325000,"Transfer BSI","BSI-REF-99212","Ikhwan Syahrir","Lunas tepat waktu"`}
                  value={importPaymentCsvText}
                  onChange={(e) => {
                    const txt = e.target.value;
                    setImportPaymentCsvText(txt);
                    const parsed = parseRawCsvToPayments(txt);
                    setParsedPaymentPreviewList(parsed);
                  }}
                  className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Parsed Preview Table */}
              {parsedPaymentPreviewList.length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-emerald-900 font-bold">
                    <span>✓ Siap Diimpor: {parsedPaymentPreviewList.length} Transaksi Kas Masuk</span>
                    <span className="text-[11px] text-emerald-700">Pratinjau Data:</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto overflow-x-auto bg-white rounded-lg border border-emerald-200 text-[10px]">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-emerald-100/70 text-emerald-900 border-b border-emerald-200">
                          <th className="p-1.5 text-left">No. Resi</th>
                          <th className="p-1.5 text-left">Tanggal</th>
                          <th className="p-1.5 text-left">Nama Siswa</th>
                          <th className="p-1.5 text-left">Bulan</th>
                          <th className="p-1.5 text-left">Metode</th>
                          <th className="p-1.5 text-right">Infaq Gedung</th>
                          <th className="p-1.5 text-right">Infaq WIZ</th>
                          <th className="p-1.5 text-right">Total Bayar (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedPaymentPreviewList.slice(0, 5).map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-1.5 font-mono font-bold text-emerald-800">{p.noKuitansi}</td>
                            <td className="p-1.5">{p.tanggalBayar}</td>
                            <td className="p-1.5 font-bold text-slate-800">{p.siswaNama}</td>
                            <td className="p-1.5">{p.bulanList.join(', ')}</td>
                            <td className="p-1.5">{p.metodePembayaran}</td>
                            <td className="p-1.5 text-right text-sky-800">Rp {formatRupiah(p.nominalInfaqPembangunan || 0)}</td>
                            <td className="p-1.5 text-right text-teal-800">Rp {formatRupiah(p.nominalInfaqWiz || 0)}</td>
                            <td className="p-1.5 text-right font-black text-emerald-700">Rp {formatRupiah(p.totalBayar)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedPaymentPreviewList.length > 5 && (
                    <p className="text-[10px] text-emerald-700 text-center font-medium">
                      ... dan {parsedPaymentPreviewList.length - 5} transaksi kas lainnya siap disimpan ke database.
                    </p>
                  )}
                </div>
              )}

              {importPaymentError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importPaymentError}</span>
                </div>
              )}

              {importPaymentSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importPaymentSuccess}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500">
                {parsedPaymentPreviewList.length > 0 ? `${parsedPaymentPreviewList.length} transaksi kas siap dimasukkan` : 'Belum ada data transaksi terpilih'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportPaymentModalOpen(false);
                    setParsedPaymentPreviewList([]);
                    setImportPaymentFileName('');
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer font-semibold text-xs"
                >
                  Batal / Tutup
                </button>
                <button
                  type="button"
                  onClick={handleProcessImportPaymentCsv}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer shadow-xs transition-all active:scale-95 text-xs flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Mulai Import Transaksi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
