import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Trash2, 
  Edit, 
  CreditCard, 
  Phone, 
  Send, 
  CheckCircle2, 
  X, 
  UserPlus, 
  FileSpreadsheet, 
  Eye,
  Check,
  AlertCircle,
  FileUp,
  HelpCircle,
  FileText
} from 'lucide-react';
import { Siswa, JenjangPendidikan, StatusSiswa, FoundationSettings } from '../types';
import { storage } from '../services/storage';
import { downloadExcelTemplate, readSpreadsheetAsCsvText, isSpreadsheetFile } from '../services/excelTemplate';
import { formatRupiah, generateBillingReminderMessage, buildDirectWhatsAppUrl } from '../services/whatsapp';

interface StudentManagementProps {
  students: Siswa[];
  settings: FoundationSettings;
  onOpenPaymentForStudent: (studentId: string) => void;
  onViewStudentPortal: (nis: string) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  settings,
  onOpenPaymentForStudent,
  onViewStudentPortal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJenjang, setSelectedJenjang] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Siswa | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Siswa>>({
    nis: '',
    nisn: '',
    nama: '',
    jenisKelamin: 'L',
    jenjang: 'SDIT',
    kelas: 'Kelas 1-A',
    tahunAjaran: '2024/2025',
    namaWali: '',
    hubunganWali: 'Ayah',
    noWa: '',
    alamat: '',
    sppBulanan: 250000,
    biayaLain: 0,
    keteranganBiayaLain: '',
    status: 'Aktif',
    tanggalMasuk: new Date().toISOString().split('T')[0],
  });

  // Import CSV State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [showColumnGuide, setShowColumnGuide] = useState(false);
  const [parsedPreviewList, setParsedPreviewList] = useState<Siswa[]>([]);

  // Month overview modal
  const [viewMonthsStudent, setViewMonthsStudent] = useState<Siswa | null>(null);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchSearch = 
        student.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.nis.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.namaWali.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.kelas.toLowerCase().includes(searchTerm.toLowerCase());

      const matchJenjang = selectedJenjang === 'ALL' || student.jenjang === selectedJenjang;
      const matchStatus = selectedStatus === 'ALL' || student.status === selectedStatus;

      return matchSearch && matchJenjang && matchStatus;
    });
  }, [students, searchTerm, selectedJenjang, selectedStatus]);

  // Open modal for creating new student
  const handleAddNew = () => {
    const nextNis = `${new Date().getFullYear()}${String(students.length + 1).padStart(4, '0')}`;
    setEditingStudent(null);
    setFormData({
      id: `sis-${Date.now()}`,
      nis: nextNis,
      nisn: '',
      nama: '',
      jenisKelamin: 'L',
      jenjang: 'SDIT',
      kelas: 'Kelas 1-A',
      tahunAjaran: '2024/2025',
      namaWali: '',
      hubunganWali: 'Ayah',
      noWa: '08',
      alamat: 'Unaaha, Kab. Konawe',
      sppBulanan: 250000,
      biayaLain: 0,
      keteranganBiayaLain: '',
      status: 'Aktif',
      tanggalMasuk: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  // Open modal for editing student
  const handleEdit = (student: Siswa) => {
    setEditingStudent(student);
    setFormData({ ...student });
    setIsModalOpen(true);
  };

  // Delete student with confirmation
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus data siswa "${name}"?`)) {
      storage.deleteStudent(id);
    }
  };

  // Handle form submit
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama || !formData.nis || !formData.namaWali || !formData.noWa) {
      alert('Mohon lengkapi Nama Siswa, NIS, Nama Wali Murid, dan Nomor WhatsApp!');
      return;
    }

    const newStudent: Siswa = {
      id: formData.id || `sis-${Date.now()}`,
      nis: formData.nis.trim(),
      nisn: formData.nisn || '',
      nama: formData.nama.trim(),
      jenisKelamin: formData.jenisKelamin || 'L',
      jenjang: (formData.jenjang as JenjangPendidikan) || 'SDIT',
      kelas: formData.kelas || 'Kelas 1-A',
      tahunAjaran: formData.tahunAjaran || '2024/2025',
      namaWali: formData.namaWali.trim(),
      hubunganWali: formData.hubunganWali || 'Ayah',
      noWa: formData.noWa.trim(),
      alamat: formData.alamat || '',
      sppBulanan: Number(formData.sppBulanan) || 250000,
      biayaLain: Number(formData.biayaLain) || 0,
      keteranganBiayaLain: formData.keteranganBiayaLain || '',
      status: (formData.status as StatusSiswa) || 'Aktif',
      tanggalMasuk: formData.tanggalMasuk || new Date().toISOString().split('T')[0],
    };

    storage.saveStudent(newStudent);
    setIsModalOpen(false);
  };

  // Auto-fill standard SPP suggestion based on level
  const handleJenjangChange = (jenjang: JenjangPendidikan) => {
    let suggestedSpp = 250000;
    let defaultClass = 'Kelas 1-A';
    if (jenjang === 'RA / TK') {
      suggestedSpp = 180000;
      defaultClass = 'TK-A';
    } else if (jenjang === 'SDIT') {
      suggestedSpp = 250000;
      defaultClass = 'Kelas 1-A';
    } else if (jenjang === 'SMPIT') {
      suggestedSpp = 350000;
      defaultClass = 'Kelas 7-A';
    } else if (jenjang === 'SMAIT / Tahfidz') {
      suggestedSpp = 500000;
      defaultClass = 'Kelas 10 Tahfidz';
    }
    setFormData(prev => ({
      ...prev,
      jenjang,
      kelas: defaultClass,
      sppBulanan: suggestedSpp,
    }));
  };

  // Export students to CSV with matched columns
  const handleExportCSV = () => {
    const headers = [
      'NIS',
      'NISN',
      'Nama Siswa',
      'Jenis Kelamin (L/P)',
      'Jenjang Pendidikan',
      'Kelas',
      'Tahun Ajaran',
      'Nama Wali Murid',
      'Hubungan Wali (Ayah/Ibu/Wali)',
      'No WhatsApp Wali',
      'Tarif SPP Bulanan (Rp)',
      'Biaya Lainnya (Rp)',
      'Alamat Siswa',
      'Status Siswa (Aktif/Cuti/Pindah/Lulus)'
    ];

    const rows = filteredStudents.map(s => [
      `"${s.nis}"`,
      `"${s.nisn || ''}"`,
      `"${s.nama.replace(/"/g, '""')}"`,
      `"${s.jenisKelamin}"`,
      `"${s.jenjang}"`,
      `"${s.kelas}"`,
      `"${s.tahunAjaran}"`,
      `"${s.namaWali.replace(/"/g, '""')}"`,
      `"${s.hubunganWali}"`,
      `"${s.noWa}"`,
      s.sppBulanan,
      s.biayaLain || 0,
      `"${s.alamat.replace(/"/g, '""')}"`,
      `"${s.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Database_Siswa_YPWI_Konawe_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download official sample template CSV with all columns and sample rows for all units
  const handleDownloadTemplate = () => {
    const templateHeaders = [
      'NIS',
      'NISN',
      'Nama Siswa',
      'Jenis Kelamin (L/P)',
      'Jenjang',
      'Kelas',
      'Tahun Ajaran',
      'Nama Wali',
      'Hubungan Wali (Ayah/Ibu/Wali)',
      'No WhatsApp Wali',
      'Tarif SPP Bulanan',
      'Biaya Lainnya',
      'Alamat Siswa',
      'Status Siswa (Aktif/Cuti/Pindah/Lulus)'
    ];

    const sampleRows = [
      ['202403001', '0123456701', 'Aisyah Humaira', 'P', 'RA / TK', 'TK-B Abu Bakar', '2024/2025', 'dr. Hendra Pratama', 'Ayah', '081245678901', '200000', '0', 'Jl. Poros Unaaha No. 12, Konawe', 'Aktif'],
      ['202401011', '0081293841', 'Zaid bin Tsabit', 'L', 'SDIT', 'Kelas 2-A', '2024/2025', 'Fahmi Abdullah', 'Ayah', '081245678999', '250000', '0', 'Kel. Tuoy, Kec. Unaaha, Konawe', 'Aktif'],
      ['202402012', '0071293842', 'Maryam Binti Imron', 'P', 'SMPIT', 'Kelas 7-B', '2024/2025', 'Ibu Hj. Rahmawati', 'Ibu', '085299887711', '350000', '50000', 'Jl. Diponegoro Unaaha', 'Aktif'],
      ['202404015', '0051293845', 'Muhammad Al-Fatih', 'L', 'SMAIT / Tahfidz', 'Kelas 10 Tahfidz', '2024/2025', 'Ustadz Syamsul', 'Ayah', '085344332211', '400000', '0', 'Kompleks Pesantren Wahdah Konawe', 'Aktif']
    ];

    // Kolom tarif ditulis sebagai angka agar Excel mengenalinya sebagai nominal
    const excelRows = sampleRows.map(row =>
      row.map((cell, idx) => (idx === 10 || idx === 11 ? Number(cell) : cell))
    );

    downloadExcelTemplate(
      'Template_Import_Siswa_YPWI_Konawe.xlsx',
      'Data Siswa',
      templateHeaders,
      excelRows
    );
  };

  // Helper: Split CSV line handling quotes and delimiter
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

  // Helper: Parse raw CSV text to Siswa items with smart header matching
  const parseRawCsvToStudents = (rawText: string): Siswa[] => {
    const lines = rawText.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headerCols = parseCsvLine(lines[0], delimiter).map(h => 
      h.toLowerCase().replace(/[^a-z0-9]/g, '')
    );

    const colIdx = {
      nis: headerCols.findIndex(h => h === 'nis' || (h.includes('nis') && !h.includes('nisn'))),
      nisn: headerCols.findIndex(h => h.includes('nisn')),
      nama: headerCols.findIndex(h => (h.includes('nama') || h.includes('siswa') || h.includes('santri')) && !h.includes('wali')),
      jk: headerCols.findIndex(h => h.includes('kelamin') || h === 'jk' || h === 'gender'),
      jenjang: headerCols.findIndex(h => h.includes('jenjang') || h.includes('tingkat') || h.includes('sekolah') || h.includes('unit')),
      kelas: headerCols.findIndex(h => h.includes('kelas') || h.includes('rombel')),
      tahunAjaran: headerCols.findIndex(h => h.includes('tahun') || h.includes('ajaran') || h.includes('ta')),
      namaWali: headerCols.findIndex(h => h.includes('wali') || h.includes('orangtua') || h.includes('ayah') || h.includes('ibu')),
      hubunganWali: headerCols.findIndex(h => h.includes('hubungan')),
      noWa: headerCols.findIndex(h => h.includes('whatsapp') || h.includes('nohp') || h.includes('nomorhp') || h.includes('telp') || h === 'no wa' || h === 'nowa' || h === 'hp' || h === 'wa'),
      sppBulanan: headerCols.findIndex(h => h.includes('spp') || h.includes('tarif') || h.includes('biaya')),
      biayaLain: headerCols.findIndex(h => h.includes('lain') || h.includes('tambahan')),
      alamat: headerCols.findIndex(h => h.includes('alamat') || h.includes('domisili')),
      status: headerCols.findIndex(h => h.includes('status')),
    };

    const parsed: Siswa[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCsvLine(line, delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());

      const getVal = (idx: number, fallbackIdx: number, defaultValue: string = '') => {
        if (idx !== -1 && cols[idx] !== undefined && cols[idx] !== '') return cols[idx];
        if (fallbackIdx < cols.length && cols[fallbackIdx] !== undefined) return cols[fallbackIdx];
        return defaultValue;
      };

      const nama = getVal(colIdx.nama, 2, '');
      if (!nama) continue;

      const nis = getVal(colIdx.nis, 0, `YPWI-${new Date().getFullYear()}-${1000 + i}`);
      const nisn = getVal(colIdx.nisn, 1, '');
      
      const rawJk = getVal(colIdx.jk, 3, 'L').toUpperCase();
      const jenisKelamin: 'L' | 'P' = rawJk.startsWith('P') || rawJk.includes('PEREMPUAN') ? 'P' : 'L';

      const rawJenjang = getVal(colIdx.jenjang, 4, 'SDIT').toUpperCase();
      let jenjang: JenjangPendidikan = 'SDIT';
      if (rawJenjang.includes('RA') || rawJenjang.includes('TK')) jenjang = 'RA / TK';
      else if (rawJenjang.includes('SMP')) jenjang = 'SMPIT';
      else if (rawJenjang.includes('SMA') || rawJenjang.includes('TAHFIDZ')) jenjang = 'SMAIT / Tahfidz';

      const kelas = getVal(colIdx.kelas, 5, 'Kelas 1-A');
      const tahunAjaran = getVal(colIdx.tahunAjaran, 6, '2024/2025');
      const namaWali = getVal(colIdx.namaWali, 7, 'Orang Tua Siswa');
      const hubunganWali = getVal(colIdx.hubunganWali, 8, 'Ayah');
      
      let noWa = getVal(colIdx.noWa, 9, '08').replace(/[^0-9]/g, '');
      if (noWa.startsWith('62')) noWa = '0' + noWa.slice(2);
      if (!noWa.startsWith('08')) noWa = '08' + noWa;

      const rawSpp = getVal(colIdx.sppBulanan, 10, '250000').replace(/[^0-9]/g, '');
      const sppBulanan = parseInt(rawSpp, 10) || 250000;

      const rawBiayaLain = getVal(colIdx.biayaLain, 11, '0').replace(/[^0-9]/g, '');
      const biayaLain = parseInt(rawBiayaLain, 10) || 0;

      const alamat = getVal(colIdx.alamat, 12, 'Unaaha, Kab. Konawe');
      
      const rawStatus = getVal(colIdx.status, 13, 'Aktif');
      let status: StatusSiswa = 'Aktif';
      if (rawStatus.toLowerCase().includes('cuti')) status = 'Cuti';
      else if (rawStatus.toLowerCase().includes('pindah')) status = 'Pindah';
      else if (rawStatus.toLowerCase().includes('lulus')) status = 'Lulus';

      parsed.push({
        id: `sis-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        nis,
        nisn,
        nama,
        jenisKelamin,
        jenjang,
        kelas,
        tahunAjaran,
        namaWali,
        hubunganWali: (hubunganWali === 'Ibu' || hubunganWali === 'Wali') ? hubunganWali : 'Ayah',
        noWa,
        alamat,
        sppBulanan,
        biayaLain,
        status,
        tanggalMasuk: new Date().toISOString().split('T')[0],
      });
    }

    return parsed;
  };

  // Handle direct file upload from PC
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);

    // File Excel dibaca lalu diubah ke teks CSV agar memakai parser yang sama
    if (isSpreadsheetFile(file)) {
      readSpreadsheetAsCsvText(file)
        .then(text => {
          setImportCsvText(text);
          setParsedPreviewList(parseRawCsvToStudents(text));
        })
        .catch(() => {
          setImportError('Gagal membaca file Excel. Pastikan file .xlsx/.xls tidak rusak.');
        });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setImportCsvText(text);
        const parsed = parseRawCsvToStudents(text);
        setParsedPreviewList(parsed);
      }
    };
    reader.onerror = () => {
      setImportError('Gagal membaca file. Pastikan file berformat CSV atau Excel.');
    };
    reader.readAsText(file);
  };

  // Import CSV processor
  const handleProcessImportCsv = () => {
    try {
      setImportError(null);
      if (!importCsvText.trim()) {
        setImportError('Mohon pilih file CSV atau tempelkan teks CSV terlebih dahulu.');
        return;
      }

      const parsedStudents = parseRawCsvToStudents(importCsvText);

      if (parsedStudents.length === 0) {
        setImportError('Tidak ada data siswa yang valid ditemukan dalam CSV. Periksa format kolom dan pastikan Nama Siswa terisi.');
        return;
      }

      storage.importStudents(parsedStudents);
      setImportSuccess(`Alhamdulillah! Berhasil mengimpor ${parsedStudents.length} data murid ke database.`);
      setParsedPreviewList([]);
      setImportFileName('');
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportSuccess(null);
        setImportCsvText('');
      }, 2000);
    } catch (err: any) {
      setImportError('Gagal memproses data CSV: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs glow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Database Siswa & Wali Murid</h2>
            <p className="text-xs text-slate-500 mt-1">
              Kelola direktori nama murid, wali murid, dan nomor WhatsApp orang tua untuk otomatisasi tagihan SPP.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer glow-btn-neutral"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Import CSV</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer glow-btn-neutral"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleAddNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs transition-all cursor-pointer glow-btn"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Siswa Baru</span>
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari Nama Siswa, NIS, Wali Murid, atau Kelas..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Jenjang */}
          <select
            value={selectedJenjang}
            onChange={(e) => setSelectedJenjang(e.target.value)}
            className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 cursor-pointer"
          >
            <option value="ALL">Semua Jenjang Pendidikan</option>
            {settings.daftarSekolah.map(unit => (
              <option key={unit.id} value={unit.id}>{unit.nama}</option>
            ))}
          </select>

          {/* Filter Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 cursor-pointer"
          >
            <option value="ALL">Semua Status Siswa</option>
            <option value="Aktif">Status: Aktif</option>
            <option value="Cuti">Status: Cuti</option>
            <option value="Pindah">Status: Pindah</option>
            <option value="Lulus">Status: Alumni/Lulus</option>
          </select>
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Siswa & NIS</th>
                <th className="py-3.5 px-3">Jenjang & Kelas</th>
                <th className="py-3.5 px-3">Wali Murid</th>
                <th className="py-3.5 px-3">No. WhatsApp</th>
                <th className="py-3.5 px-3">SPP / Bulan</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right sticky right-0 z-20 bg-slate-50 shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.18)]">Aksi & Notifikasi WA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ditemukan data siswa yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const reminderMsg = generateBillingReminderMessage(student, ['Bulan Berjalan'], settings);
                  const waUrl = buildDirectWhatsAppUrl(student.noWa, reminderMsg);

                  return (
                    <tr key={student.id} className="glow-row">
                      {/* Name & NIS */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] ${
                            student.jenisKelamin === 'L' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {student.nama.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-snug">{student.nama}</p>
                            <p className="text-[10px] text-slate-400 font-mono">NIS: {student.nis}</p>
                          </div>
                        </div>
                      </td>

                      {/* Jenjang & Kelas */}
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800">{student.kelas}</span>
                        <p className="text-[10px] text-slate-500">{student.jenjang}</p>
                      </td>

                      {/* Wali Murid */}
                      <td className="py-3.5 px-3">
                        <p className="font-medium text-slate-900">{student.namaWali}</p>
                        <p className="text-[10px] text-slate-400">{student.hubunganWali}</p>
                      </td>

                      {/* No WhatsApp with Direct Link */}
                      <td className="py-3.5 px-3">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Klik untuk chat WhatsApp"
                          className="inline-flex items-center gap-1 font-mono text-emerald-700 hover:text-emerald-800 hover:underline font-semibold"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{student.noWa}</span>
                        </a>
                      </td>

                      {/* SPP Bulanan */}
                      <td className="py-3.5 px-3">
                        <p className="font-bold text-slate-900">Rp {formatRupiah(student.sppBulanan)}</p>
                        {student.biayaLain > 0 && (
                          <p className="text-[10px] text-slate-500">
                            + Biaya Lain: Rp {formatRupiah(student.biayaLain)}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          student.status === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {student.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right sticky right-0 z-10 bg-white shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.18)]">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Bayar SPP Button */}
                          <button
                            onClick={() => onOpenPaymentForStudent(student.id)}
                            title="Catat Pembayaran SPP Siswa"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-semibold transition-all cursor-pointer"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Bayar</span>
                          </button>

                          {/* Kirim WA Tagihan */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Kirim Pesan Tagihan WA ke Orang Tua"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </a>

                          {/* Cek Riwayat 12 Bulan / Portal */}
                          <button
                            onClick={() => setViewMonthsStudent(student)}
                            title="Cek Status Tagihan 12 Bulan"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleEdit(student)}
                            title="Edit Data Siswa"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(student.id, student.nama)}
                            title="Hapus Siswa"
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

        {/* Table footer with count */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>Menampilkan <strong>{filteredStudents.length}</strong> dari <strong>{students.length}</strong> siswa terdaftar</span>
          <span>Yayasan Pendidikan Wahdah Islamiyah Konawe</span>
        </div>
      </div>

      {/* MODAL: Tambah / Edit Siswa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-emerald-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-base">
                  {editingStudent ? 'Edit Data Siswa & Wali Murid' : 'Tambah Siswa Baru YPWI'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              
              {/* Data Siswa Section */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-emerald-800 border-b pb-1">
                  1. Informasi Siswa
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Siswa *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Muhammad Al-Fatih"
                      value={formData.nama || ''}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nomor Induk Siswa (NIS) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 202401001"
                      value={formData.nis || ''}
                      onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={formData.jenisKelamin || 'L'}
                      onChange={(e) => setFormData({ ...formData, jenisKelamin: e.target.value as 'L' | 'P' })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="L">Laki-laki (Ikhwan)</option>
                      <option value="P">Perempuan (Akhwat)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenjang Unit YPWI *</label>
                    <select
                      value={formData.jenjang || 'SDIT'}
                      onChange={(e) => handleJenjangChange(e.target.value as JenjangPendidikan)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                    >
                      {settings.daftarSekolah.map(unit => (
                        <option key={unit.id} value={unit.id}>{unit.nama}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kelas</label>
                    <input
                      type="text"
                      placeholder="Contoh: Kelas 4-A"
                      value={formData.kelas || ''}
                      onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Data Wali & WhatsApp Orang Tua */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-emerald-800 border-b pb-1">
                  2. Data Orang Tua & WhatsApp Notifikasi
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Nama Orang Tua / Wali *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Ahmad Pratama, S.T."
                      value={formData.namaWali || ''}
                      onChange={(e) => setFormData({ ...formData, namaWali: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Hubungan</label>
                    <select
                      value={formData.hubunganWali || 'Ayah'}
                      onChange={(e) => setFormData({ ...formData,  hubunganWali: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white cursor-pointer"
                    >
                      <option value="Ayah">Ayah</option>
                      <option value="Ibu">Ibu</option>
                      <option value="Wali">Wali</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nomor WhatsApp Orang Tua * <span className="text-[10px] text-emerald-700">(Untuk Notifikasi Tagihan & Resi Otomatis)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 081242338890 atau 6281242338890"
                    value={formData.noWa || ''}
                    onChange={(e) => setFormData({ ...formData, noWa: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Gunakan format 08xx atau 628xx. Pesan WA akan otomatis tertuju ke nomor ini.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alamat Tempat Tinggal</label>
                  <textarea
                    rows={2}
                    placeholder="Alamat di Konawe..."
                    value={formData.alamat || ''}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Pengaturan Biaya SPP */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-emerald-800 border-b pb-1">
                  3. Tarif SPP & Biaya Tambahan
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nominal SPP Bulanan (Rp) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      step={5000}
                      value={formData.sppBulanan || 0}
                      onChange={(e) => setFormData({ ...formData, sppBulanan: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Biaya Tambahan Bulanan (Opsional)</label>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      placeholder="0"
                      value={formData.biayaLain || 0}
                      onChange={(e) => setFormData({ ...formData, biayaLain: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Keterangan Biaya Tambahan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Catering makan siang, Asrama, atau Bimbingan Tahfidz"
                    value={formData.keteranganBiayaLain || ''}
                    onChange={(e) => setFormData({ ...formData, keteranganBiayaLain: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Simpan Data Siswa
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Import CSV Data Siswa Masal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-emerald-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="font-bold text-base">Import Data Siswa Masal (Excel / CSV)</h3>
                  <p className="text-[11px] text-emerald-200">Format Kolom Terstandarisasi Sistem SPP YPWI Konawe</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setParsedPreviewList([]);
                  setImportFileName('');
                }}
                className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto">
              {/* Template Download Card */}
              <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 text-emerald-950">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-900">Download Template Resmi Excel (.xlsx)</p>
                    <p className="text-[11px] text-emerald-700">
                      File template sudah dilengkapi 14 kolom terstandar dan contoh data untuk RA/TK, SDIT, SMPIT, dan SMAIT/Tahfidz.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
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
                  onClick={() => setShowColumnGuide(!showColumnGuide)}
                  className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-bold text-slate-800 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    <span>Panduan Penjelasan 14 Kolom Template Excel / CSV</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-semibold">
                    {showColumnGuide ? 'Sembunyikan Panduan ▲' : 'Lihat Rincian Kolom ▼'}
                  </span>
                </button>

                {showColumnGuide && (
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
                          <td className="p-1.5 font-mono font-bold text-emerald-800">1. NIS</td>
                          <td className="p-1.5 text-amber-700 font-semibold">Opsional</td>
                          <td className="p-1.5">Nomor Induk Siswa (jika kosong, sistem auto buatkan)</td>
                          <td className="p-1.5 font-mono">202401011</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">2. NISN</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5">Nomor Induk Siswa Nasional dari Kemdikbud</td>
                          <td className="p-1.5 font-mono">0081293841</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">3. Nama Siswa</td>
                          <td className="p-1.5 text-rose-600 font-bold">Wajib</td>
                          <td className="p-1.5">Nama lengkap murid / santri</td>
                          <td className="p-1.5">Zaid bin Tsabit</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">4. Jenis Kelamin</td>
                          <td className="p-1.5 text-rose-600 font-bold">Wajib</td>
                          <td className="p-1.5"><code className="bg-slate-100 px-1 rounded">L</code> (Laki-laki) atau <code className="bg-slate-100 px-1 rounded">P</code> (Perempuan)</td>
                          <td className="p-1.5 font-bold">L</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">5. Jenjang</td>
                          <td className="p-1.5 text-rose-600 font-bold">Wajib</td>
                          <td className="p-1.5">Salah satu dari: <code className="bg-slate-100 px-1 rounded">RA / TK</code>, <code className="bg-slate-100 px-1 rounded">SDIT</code>, <code className="bg-slate-100 px-1 rounded">SMPIT</code>, <code className="bg-slate-100 px-1 rounded">SMAIT / Tahfidz</code></td>
                          <td className="p-1.5 font-semibold text-emerald-700">SDIT</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">6. Kelas</td>
                          <td className="p-1.5 text-rose-600 font-bold">Wajib</td>
                          <td className="p-1.5">Nama kelas / rombel</td>
                          <td className="p-1.5">Kelas 2-A</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">7. Tahun Ajaran</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5">Periode tahun ajaran aktif</td>
                          <td className="p-1.5">2024/2025</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">8. Nama Wali</td>
                          <td className="p-1.5 text-rose-600 font-bold">Wajib</td>
                          <td className="p-1.5">Nama orang tua / wali yang bertanggung jawab</td>
                          <td className="p-1.5">Fahmi Abdullah</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">9. Hubungan Wali</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5"><code className="bg-slate-100 px-1 rounded">Ayah</code>, <code className="bg-slate-100 px-1 rounded">Ibu</code>, atau <code className="bg-slate-100 px-1 rounded">Wali</code></td>
                          <td className="p-1.5">Ayah</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">10. No WhatsApp Wali</td>
                          <td className="p-1.5 text-rose-600 font-bold">Wajib</td>
                          <td className="p-1.5">Nomor WA aktif untuk notifikasi kuitansi & tagihan</td>
                          <td className="p-1.5 font-mono">081245678999</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">11. Tarif SPP Bulanan</td>
                          <td className="p-1.5 text-rose-600 font-bold">Wajib</td>
                          <td className="p-1.5">Angka murni tanpa titik/koma/Rp</td>
                          <td className="p-1.5 font-mono">250000</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">12. Biaya Lainnya</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5">Biaya rutin bulanan lain bila ada (atau 0)</td>
                          <td className="p-1.5 font-mono">0</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">13. Alamat Siswa</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5">Alamat tempat tinggal siswa di Konawe/sekitarnya</td>
                          <td className="p-1.5">Unaaha, Konawe</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-mono font-bold text-emerald-800">14. Status Siswa</td>
                          <td className="p-1.5 text-slate-500">Opsional</td>
                          <td className="p-1.5"><code className="bg-slate-100 px-1 rounded">Aktif</code>, <code className="bg-slate-100 px-1 rounded">Cuti</code>, <code className="bg-slate-100 px-1 rounded">Pindah</code>, <code className="bg-slate-100 px-1 rounded">Lulus</code></td>
                          <td className="p-1.5 font-bold text-emerald-700">Aktif</td>
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
                    id="csvStudentFileInput"
                    accept=".csv,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label 
                    htmlFor="csvStudentFileInput"
                    className="flex flex-col items-center justify-center cursor-pointer gap-2"
                  >
                    <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs">
                        {importFileName ? `File Terpilih: ${importFileName}` : 'Klik untuk Pilih File CSV (.csv)'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Mendukung file CSV hasil ekspor dari Microsoft Excel, Google Sheets, atau Spreadsheet.
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
                  placeholder={`"NIS","NISN","Nama Siswa","Jenis Kelamin (L/P)","Jenjang","Kelas","Tahun Ajaran","Nama Wali","Hubungan Wali (Ayah/Ibu/Wali)","No WhatsApp Wali","Tarif SPP Bulanan","Biaya Lainnya","Alamat Siswa","Status Siswa (Aktif/Cuti/Pindah/Lulus)"
"202401011","0081293841","Zaid bin Tsabit","L","SDIT","Kelas 2-A","2024/2025","Fahmi Abdullah","Ayah","081245678999",250000,0,"Kel. Tuoy, Kec. Unaaha, Konawe","Aktif"`}
                  value={importCsvText}
                  onChange={(e) => {
                    const txt = e.target.value;
                    setImportCsvText(txt);
                    const parsed = parseRawCsvToStudents(txt);
                    setParsedPreviewList(parsed);
                  }}
                  className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Parsed Preview Table */}
              {parsedPreviewList.length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-emerald-900 font-bold">
                    <span>✓ Siap Diimpor: {parsedPreviewList.length} Murid / Santri</span>
                    <span className="text-[11px] text-emerald-700">Pratinjau Data:</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto overflow-x-auto bg-white rounded-lg border border-emerald-200 text-[10px]">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-emerald-100/70 text-emerald-900 border-b border-emerald-200">
                          <th className="p-1.5 text-left">Nama Murid</th>
                          <th className="p-1.5 text-left">NIS</th>
                          <th className="p-1.5 text-left">Jenjang & Kelas</th>
                          <th className="p-1.5 text-left">Wali Murid</th>
                          <th className="p-1.5 text-left">No WhatsApp</th>
                          <th className="p-1.5 text-right">SPP (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedPreviewList.slice(0, 5).map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-1.5 font-bold text-slate-800">{p.nama} ({p.jenisKelamin})</td>
                            <td className="p-1.5 font-mono text-slate-600">{p.nis}</td>
                            <td className="p-1.5">{p.jenjang} - {p.kelas}</td>
                            <td className="p-1.5">{p.namaWali}</td>
                            <td className="p-1.5 font-mono text-emerald-700">{p.noWa}</td>
                            <td className="p-1.5 text-right font-semibold">Rp {formatRupiah(p.sppBulanan)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedPreviewList.length > 5 && (
                    <p className="text-[10px] text-emerald-700 text-center font-medium">
                      ... dan {parsedPreviewList.length - 5} data siswa lainnya siap disimpan ke database.
                    </p>
                  )}
                </div>
              )}

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500">
                {parsedPreviewList.length > 0 ? `${parsedPreviewList.length} data murid siap dimasukkan` : 'Belum ada data terpilih'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setParsedPreviewList([]);
                    setImportFileName('');
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer font-semibold text-xs"
                >
                  Batal / Tutup
                </button>
                <button
                  type="button"
                  onClick={handleProcessImportCsv}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer shadow-xs transition-all active:scale-95 text-xs flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Mulai Import ke Database</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Status 12 Bulan Siswa */}
      {viewMonthsStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-emerald-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">{viewMonthsStudent.nama}</h3>
                <p className="text-xs text-emerald-200">
                  NIS: {viewMonthsStudent.nis} • {viewMonthsStudent.kelas} ({viewMonthsStudent.jenjang})
                </p>
              </div>
              <button 
                onClick={() => setViewMonthsStudent(null)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500">Wali Murid:</span>
                  <p className="font-bold text-slate-900">{viewMonthsStudent.namaWali} ({viewMonthsStudent.noWa})</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">SPP Bulanan:</span>
                  <p className="font-black text-emerald-700">Rp {formatRupiah(viewMonthsStudent.sppBulanan)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Status Pembayaran Tahun Ajaran {viewMonthsStudent.tahunAjaran}:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {storage.getStudentBillingStatus(viewMonthsStudent.id, viewMonthsStudent.tahunAjaran).map((m) => (
                    <div 
                      key={m.label}
                      className={`p-2.5 rounded-xl border text-center ${
                        m.status === 'LUNAS'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50/70 border-rose-200 text-rose-900'
                      }`}
                    >
                      <p className="font-bold text-xs">{m.label}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.status === 'LUNAS'
                          ? 'bg-emerald-200/60 text-emerald-800'
                          : 'bg-rose-200/60 text-rose-800'
                      }`}>
                        {m.status === 'LUNAS' ? '✓ LUNAS' : 'BELUM BAYAR'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => onViewStudentPortal(viewMonthsStudent.nis)}
                  className="text-emerald-700 font-semibold hover:underline"
                >
                  Buka Portal Publik Siswa →
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const sid = viewMonthsStudent.id;
                      setViewMonthsStudent(null);
                      onOpenPaymentForStudent(sid);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Bayar SPP Sekarang
                  </button>
                  <button
                    onClick={() => setViewMonthsStudent(null)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
