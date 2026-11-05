import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Download, 
  Printer, 
  Filter, 
  Calendar, 
  Building, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle,
  FileSpreadsheet,
  PieChart,
  UserCheck
} from 'lucide-react';
import { Siswa, Pembayaran, FoundationSettings } from '../types';
import { formatRupiah } from '../services/whatsapp';

interface FinancialReportsProps {
  students: Siswa[];
  payments: Pembayaran[];
  settings: FoundationSettings;
}

export const FinancialReports: React.FC<FinancialReportsProps> = ({
  students,
  payments,
  settings,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('Agustus 2024');
  const [selectedJenjang, setSelectedJenjang] = useState<string>('ALL');
  const [activeReportTab, setActiveReportTab] = useState<'KAS_MASUK' | 'TUNGGAKAN' | 'REKAP_UNIT'>('KAS_MASUK');

  // Filtered payments for chosen period and level
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (p.statusKuitansi !== 'Resmi') return false;
      const matchMonth = selectedMonth === 'ALL' || p.bulanList.some(b => b.includes(selectedMonth.split(' ')[0]));
      const matchJenjang = selectedJenjang === 'ALL' || p.jenjang === selectedJenjang;
      return matchMonth && matchJenjang;
    });
  }, [payments, selectedMonth, selectedJenjang]);

  // Financial aggregates
  const totalKasMasuk = filteredPayments.reduce((sum, p) => sum + p.totalBayar, 0);
  const totalSppMurni = filteredPayments.reduce((sum, p) => sum + p.totalSpp, 0);
  const totalBiayaLain = filteredPayments.reduce((sum, p) => sum + p.nominalBiayaLain, 0);
  const totalInfaqPembangunan = filteredPayments.reduce((sum, p) => sum + (p.nominalInfaqPembangunan || 0), 0);
  const totalInfaqWiz = filteredPayments.reduce((sum, p) => sum + (p.nominalInfaqWiz || 0), 0);

  // Method breakdown (BSI, Tunai, etc.)
  const methods = ['Transfer BSI', 'Tunai Kasir', 'Transfer BRI', 'QRIS Yayasan', 'Bank Muamalat'] as const;
  const methodBreakdown = methods.map(m => {
    const list = filteredPayments.filter(p => p.metodePembayaran === m);
    const amount = list.reduce((sum, p) => sum + p.totalBayar, 0);
    return { method: m, count: list.length, amount };
  });

  // Calculate Arrears (Tunggakan Siswa) for this month
  const targetMonthName = selectedMonth === 'ALL' ? 'Agustus' : selectedMonth.split(' ')[0];
  const activeStudents = students.filter(s => {
    if (s.status !== 'Aktif') return false;
    if (selectedJenjang !== 'ALL' && s.jenjang !== selectedJenjang) return false;
    return true;
  });

  const unpaidStudents = activeStudents.filter(s => {
    const sPayments = payments.filter(p => p.siswaId === s.id && p.statusKuitansi === 'Resmi');
    return !sPayments.some(p => p.bulanList.some(b => b.includes(targetMonthName)));
  });

  const totalTunggakan = unpaidStudents.reduce((sum, s) => sum + s.sppBulanan + (s.biayaLain || 0), 0);
  const targetPotensi = totalKasMasuk + totalTunggakan;
  const persentaseKolektibilitas = targetPotensi > 0 ? Math.round((totalKasMasuk / targetPotensi) * 100) : 0;

  // Export Buku Kas Masuk to CSV
  const handleExportKasMasukCSV = () => {
    const headers = [
      'No Kuitansi',
      'Tanggal Bayar',
      'NIS Siswa',
      'Nama Siswa',
      'Jenjang Pendidikan',
      'Kelas',
      'Bulan SPP Dibayar',
      'Metode Pembayaran',
      'Nominal SPP Murni (Rp)',
      'Biaya Lainnya (Rp)',
      'Infaq Pembangunan Gedung (Rp)',
      'Infaq Wahdah Inspirasi Zakat / WIZ (Rp)',
      'Total Kas Masuk (Rp)',
      'Petugas Kasir / Penerima',
      'Status Kuitansi'
    ];

    const rows = filteredPayments.map(p => [
      `"${p.noKuitansi}"`,
      `"${p.tanggalBayar}"`,
      `"${p.nis}"`,
      `"${p.siswaNama.replace(/"/g, '""')}"`,
      `"${p.jenjang}"`,
      `"${p.kelas}"`,
      `"${p.bulanList.join('; ')}"`,
      `"${p.metodePembayaran}"`,
      p.totalSpp,
      p.nominalBiayaLain,
      p.nominalInfaqPembangunan || 0,
      p.nominalInfaqWiz || 0,
      p.totalBayar,
      `"${p.namaPenerima.replace(/"/g, '""')}"`,
      `"${p.statusKuitansi}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Buku_Kas_Masuk_YPWI_${selectedMonth.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Daftar Tunggakan Siswa to CSV
  const handleExportTunggakanCSV = () => {
    const headers = [
      'NIS',
      'NISN',
      'Nama Siswa',
      'Jenis Kelamin (L/P)',
      'Jenjang Pendidikan',
      'Kelas',
      'Tahun Ajaran',
      'Nama Wali Murid',
      'Hubungan Wali',
      'No WhatsApp Wali',
      'Bulan Tertunggak',
      'Tarif SPP Bulanan (Rp)',
      'Biaya Lainnya (Rp)',
      'Total Tunggakan (Rp)',
      'Status Siswa'
    ];

    const rows = unpaidStudents.map(s => [
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
      `"${selectedMonth}"`,
      s.sppBulanan,
      s.biayaLain || 0,
      s.sppBulanan + (s.biayaLain || 0),
      `"${s.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Daftar_Tunggakan_Siswa_YPWI_${selectedMonth.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Rekapitulasi Metode & Bank to CSV
  const handleExportRekapBankCSV = () => {
    const headers = [
      'Metode Pembayaran / Rekening Bank',
      'Jumlah Transaksi',
      'Total Nominal Masuk (Rp)',
      'Persentase Kontribusi (%)'
    ];

    const rows = methodBreakdown.map(m => {
      const pct = totalKasMasuk > 0 ? ((m.amount / totalKasMasuk) * 100).toFixed(1) : '0';
      return [
        `"${m.method}"`,
        m.count,
        m.amount,
        `"${pct}%"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Rekap_Metode_Bayar_YPWI_${selectedMonth.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Smart export based on currently open tab
  const handleExportActiveReportCSV = () => {
    if (activeReportTab === 'TUNGGAKAN') {
      handleExportTunggakanCSV();
    } else if (activeReportTab === 'REKAP_UNIT') {
      handleExportRekapBankCSV();
    } else {
      handleExportKasMasukCSV();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold mb-1.5">
              <span>Laporan Resmi Pengurus Yayasan</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Laporan Keuangan & Rekapitulasi SPP
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {settings.namaYayasan} — Laporan arus kas, kolektibilitas SPP, dan piutang.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportActiveReportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              title="Export Laporan yang Sedang Dibuka ke File Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>
                Export {activeReportTab === 'TUNGGAKAN' ? 'Daftar Tunggakan' : activeReportTab === 'REKAP_UNIT' ? 'Rekap Metode' : 'Buku Kas Masuk'} (CSV)
              </span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Cetak PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Periode Bulan:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-pointer"
            >
              <option value="Juli 2024">Juli 2024</option>
              <option value="Agustus 2024">Agustus 2024</option>
              <option value="September 2024">September 2024</option>
              <option value="Oktober 2024">Oktober 2024</option>
              <option value="November 2024">November 2024</option>
              <option value="Desember 2024">Desember 2024</option>
              <option value="ALL">Semua Periode (Akumulasi)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Jenjang Unit Pendidikan:</label>
            <select
              value={selectedJenjang}
              onChange={(e) => setSelectedJenjang(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 cursor-pointer"
            >
              <option value="ALL">Semua Unit (RA/TK, SDIT, SMPIT, SMAIT)</option>
              {settings.daftarSekolah.map(unit => (
                <option key={unit.id} value={unit.id}>{unit.nama}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="w-full bg-emerald-50 rounded-xl p-2.5 border border-emerald-200 text-[11px] text-emerald-900 flex justify-between items-center">
              <span>Efektivitas Kolektibilitas:</span>
              <strong className="text-emerald-700 text-sm">{persentaseKolektibilitas}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs glow-card-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500">Total Kas Masuk Sah</span>
          <p className="mt-1.5 text-xl font-black text-emerald-700">
            Rp {formatRupiah(totalKasMasuk)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {filteredPayments.length} transaksi sah
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs glow-card-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500">SPP Murni</span>
          <p className="mt-1.5 text-xl font-black text-slate-900">
            Rp {formatRupiah(totalSppMurni)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Operasional pendidikan
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs glow-card-sm">
          <span className="text-[10px] uppercase font-bold text-slate-500">Biaya Tambahan</span>
          <p className="mt-1.5 text-xl font-black text-slate-900">
            Rp {formatRupiah(totalBiayaLain)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Catering & Asrama
          </p>
        </div>

        <div className="bg-sky-50/60 p-4 rounded-2xl border border-sky-200 shadow-xs glow-card-sm">
          <span className="text-[10px] uppercase font-bold text-sky-800">Infaq Pembangunan</span>
          <p className="mt-1.5 text-xl font-black text-sky-700">
            Rp {formatRupiah(totalInfaqPembangunan)}
          </p>
          <p className="mt-0.5 text-[10px] text-sky-700 font-medium">
            Sarana & Gedung YPWI
          </p>
        </div>

        <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-200 shadow-xs glow-card-sm">
          <span className="text-[10px] uppercase font-bold text-teal-800">Infaq Laznas WIZ</span>
          <p className="mt-1.5 text-xl font-black text-teal-700">
            Rp {formatRupiah(totalInfaqWiz)}
          </p>
          <p className="mt-0.5 text-[10px] text-teal-700 font-medium">
            Wahdah Inspirasi Zakat
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs glow-card-sm">
          <span className="text-[10px] uppercase font-bold text-rose-600">Piutang Tertunggak</span>
          <p className="mt-1.5 text-xl font-black text-rose-600">
            Rp {formatRupiah(totalTunggakan)}
          </p>
          <p className="mt-0.5 text-[10px] text-rose-700 font-medium">
            {unpaidStudents.length} siswa belum bayar
          </p>
        </div>

      </div>

      {/* Report Section Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveReportTab('KAS_MASUK')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer glow-tab ${
                activeReportTab === 'KAS_MASUK'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              1. Buku Kas Masuk Terinci
            </button>

            <button
              onClick={() => setActiveReportTab('TUNGGAKAN')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer glow-tab ${
                activeReportTab === 'TUNGGAKAN'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              2. Daftar Tunggakan Piutang ({unpaidStudents.length})
            </button>

            <button
              onClick={() => setActiveReportTab('REKAP_UNIT')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer glow-tab ${
                activeReportTab === 'REKAP_UNIT'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              3. Rekapitulasi Metode & Bank
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Periode: <strong>{selectedMonth}</strong>
          </span>
        </div>

        {/* 1. BUKU KAS MASUK TABLE */}
        {activeReportTab === 'KAS_MASUK' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">No. Kuitansi</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Nama Siswa / NIS</th>
                  <th className="py-3 px-3">Jenjang & Kelas</th>
                  <th className="py-3 px-3">Bulan SPP</th>
                  <th className="py-3 px-3">Metode Bayar</th>
                  <th className="py-3 px-3 text-right">SPP</th>
                  <th className="py-3 px-3 text-right">Lainnya</th>
                  <th className="py-3 px-3 text-right text-sky-800">Infaq Gedung</th>
                  <th className="py-3 px-3 text-right text-teal-800">Infaq WIZ</th>
                  <th className="py-3 px-4 text-right">Total Kas Masuk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      Tidak ada transaksi pembayaran pada periode dan jenjang ini.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="glow-row">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                        {p.noKuitansi}
                      </td>
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {p.tanggalBayar}
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{p.siswaNama}</p>
                        <p className="text-[10px] text-slate-400 font-mono">NIS: {p.nis}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800">{p.kelas}</span>
                        <p className="text-[10px] text-slate-500">{p.jenjang}</p>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">
                        {p.bulanList.join(', ')}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {p.metodePembayaran}
                      </td>
                      <td className="py-3 px-3 text-right">
                        Rp {formatRupiah(p.totalSpp)}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-500">
                        {p.nominalBiayaLain > 0 ? `Rp ${formatRupiah(p.nominalBiayaLain)}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right text-sky-700 font-medium">
                        {p.nominalInfaqPembangunan && p.nominalInfaqPembangunan > 0 ? `Rp ${formatRupiah(p.nominalInfaqPembangunan)}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right text-teal-700 font-medium">
                        {p.nominalInfaqWiz && p.nominalInfaqWiz > 0 ? `Rp ${formatRupiah(p.nominalInfaqWiz)}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                        Rp {formatRupiah(p.totalBayar)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50/70 border-t-2 border-emerald-600 font-bold text-xs text-emerald-950">
                  <td colSpan={6} className="py-3.5 px-4 text-right uppercase tracking-wider">
                    TOTAL KAS MASUK TERVERIFIKASI:
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    Rp {formatRupiah(totalSppMurni)}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    Rp {formatRupiah(totalBiayaLain)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-sky-800">
                    Rp {formatRupiah(totalInfaqPembangunan)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-teal-800">
                    Rp {formatRupiah(totalInfaqWiz)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm text-emerald-800 font-black">
                    Rp {formatRupiah(totalKasMasuk)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* 2. DAFTAR TUNGGAKAN PIUTANG */}
        {activeReportTab === 'TUNGGAKAN' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-3">NIS</th>
                  <th className="py-3 px-3">Jenjang & Kelas</th>
                  <th className="py-3 px-3">Orang Tua / Wali</th>
                  <th className="py-3 px-3">Nomor WhatsApp</th>
                  <th className="py-3 px-3">Bulan Tertunggak</th>
                  <th className="py-3 px-4 text-right">Nominal Tertunggak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {unpaidStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <p className="font-semibold text-slate-700">Kolektibilitas 100%!</p>
                      <p>Tidak ada siswa menunggak untuk periode ini.</p>
                    </td>
                  </tr>
                ) : (
                  unpaidStudents.map((s) => (
                    <tr key={s.id} className="glow-row">
                      <td className="py-3 px-4 font-bold text-slate-900">{s.nama}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{s.nis}</td>
                      <td className="py-3 px-3">
                        <span className="font-medium">{s.kelas}</span> ({s.jenjang})
                      </td>
                      <td className="py-3 px-3">{s.namaWali} ({s.hubunganWali})</td>
                      <td className="py-3 px-3 font-mono text-emerald-800 font-semibold">
                        {s.noWa}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                          {selectedMonth}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
                        Rp {formatRupiah(s.sppBulanan + (s.biayaLain || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-rose-50 border-t-2 border-rose-300 font-bold text-xs text-rose-950">
                  <td colSpan={6} className="py-3.5 px-4 text-right uppercase tracking-wider">
                    TOTAL ESTIMASI PIUTANG TERTUNGGAK:
                  </td>
                  <td className="py-3.5 px-4 text-right text-sm text-rose-700 font-black">
                    Rp {formatRupiah(totalTunggakan)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* 3. REKAPITULASI METODE & BANK */}
        {activeReportTab === 'REKAP_UNIT' && (
          <div className="p-6 space-y-6">
            <h4 className="font-bold text-slate-900 text-sm">
              Rekapitulasi Penerimaan Berdasarkan Rekening & Metode Bayar
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {methodBreakdown.map((m) => (
                <div key={m.method} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{m.method}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{m.count} Transaksi</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-700 text-sm">Rp {formatRupiah(m.amount)}</p>
                    <p className="text-[10px] text-slate-400">
                      {totalKasMasuk > 0 ? Math.round((m.amount / totalKasMasuk) * 100) : 0}% dari total
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Official Foundation Signatures for Printouts */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700">
              <div className="text-center">
                <p className="font-medium text-slate-500">Mengetahui,</p>
                <p className="font-bold text-slate-900 mt-0.5">Ketua Yayasan YPWI Konawe</p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-900 border-t border-slate-300 pt-1 px-4">
                  {settings.namaKetuaYayasan}
                </p>
              </div>

              <div className="text-center">
                <p className="font-medium text-slate-500">Unaaha, {new Date().toLocaleDateString('id-ID')}</p>
                <p className="font-bold text-slate-900 mt-0.5">Bendahara Yayasan</p>
                <div className="h-16"></div>
                <p className="font-bold text-slate-900 border-t border-slate-300 pt-1 px-4">
                  {settings.namaBendahara}
                </p>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
