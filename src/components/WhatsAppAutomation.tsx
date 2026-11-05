import React, { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Settings2, 
  FileText, 
  Calendar, 
  Smartphone, 
  RefreshCw, 
  ExternalLink,
  Trash2,
  Sliders,
  Check,
  Play,
  Download,
  FileSpreadsheet,
  Copy
} from 'lucide-react';
import { Siswa, Pembayaran, FoundationSettings, WhatsAppLog } from '../types';
import { storage } from '../services/storage';
import { 
  generateBillingReminderMessage, 
  generatePaymentConfirmationMessage, 
  buildDirectWhatsAppUrl, 
  sendWhatsAppMessage,
  formatRupiah 
} from '../services/whatsapp';

interface WhatsAppAutomationProps {
  students: Siswa[];
  payments: Pembayaran[];
  settings: FoundationSettings;
  waLogs: WhatsAppLog[];
  onUpdateSettings: (settings: FoundationSettings) => void;
}

export const WhatsAppAutomation: React.FC<WhatsAppAutomationProps> = ({
  students,
  payments,
  settings,
  waLogs,
  onUpdateSettings,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'SCHEDULED' | 'TEMPLATES' | 'GATEWAY' | 'LOGS'>('SCHEDULED');

  // Month for reminder targeting
  const [targetMonth, setTargetMonth] = useState<string>('Agustus 2024');
  const [filterJenjang, setFilterJenjang] = useState<string>('ALL');

  // Batch Blast State
  const [isBlasting, setIsBlasting] = useState(false);
  const [blastProgress, setBlastProgress] = useState<{ current: number; total: number } | null>(null);
  const [blastResult, setBlastResult] = useState<string | null>(null);

  // Template Editor State
  const [tempBillingTemplate, setTempBillingTemplate] = useState(settings.templatePesanTagihan);
  const [tempLunasTemplate, setTempLunasTemplate] = useState(settings.templatePesanLunas);
  const [selectedTemplateTab, setSelectedTemplateTab] = useState<'TAGIHAN' | 'LUNAS'>('TAGIHAN');
  const [templateSavedToast, setTemplateSavedToast] = useState(false);

  // Gateway Config State
  const [gatewayConfig, setGatewayConfig] = useState(settings.waGatewayConfig);
  const [gatewaySavedToast, setGatewaySavedToast] = useState(false);

  // Log filter
  const [logFilter, setLogFilter] = useState<'ALL' | 'TAGIHAN_PENGINGAT' | 'KONFIRMASI_PEMBAYARAN'>('ALL');

  // Find students who have NOT paid for targetMonth
  const unpaidStudents = useMemo(() => {
    return students.filter(s => {
      if (s.status !== 'Aktif') return false;
      if (filterJenjang !== 'ALL' && s.jenjang !== filterJenjang) return false;

      // Check if student has payment for this target month
      const studentPayments = payments.filter(
        p => p.siswaId === s.id && p.statusKuitansi === 'Resmi'
      );
      const hasPaid = studentPayments.some(p => p.bulanList.includes(targetMonth));
      return !hasPaid;
    });
  }, [students, payments, targetMonth, filterJenjang]);

  // Handle Mass Batch Send
  const handleStartBatchBlast = async () => {
    if (unpaidStudents.length === 0) {
      alert(`Tidak ada siswa yang belum membayar untuk bulan ${targetMonth}!`);
      return;
    }

    const confirmRun = window.confirm(
      `Jalankan pengiriman notifikasi WhatsApp otomatis ke ${unpaidStudents.length} orang tua murid untuk periode "${targetMonth}"?`
    );
    if (!confirmRun) return;

    setIsBlasting(true);
    setBlastProgress({ current: 0, total: unpaidStudents.length });

    let sent = 0;
    for (let i = 0; i < unpaidStudents.length; i++) {
      const student = unpaidStudents[i];
      const msg = generateBillingReminderMessage(student, [targetMonth], settings);
      
      await sendWhatsAppMessage(
        student.noWa,
        msg,
        student.namaWali,
        student.id,
        student.nama,
        'TAGIHAN_PENGINGAT'
      );

      sent++;
      setBlastProgress({ current: sent, total: unpaidStudents.length });
      // Small throttle
      await new Promise(r => setTimeout(r, 120));
    }

    setIsBlasting(false);
    setBlastResult(`Alhamdulillah! Berhasil mengirimkan ${sent} pesan notifikasi tagihan.`);
    setTimeout(() => setBlastResult(null), 6000);
  };

  // Save Templates
  const handleSaveTemplates = () => {
    const updated = {
      ...settings,
      templatePesanTagihan: tempBillingTemplate,
      templatePesanLunas: tempLunasTemplate,
    };
    onUpdateSettings(updated);
    storage.saveSettings(updated);
    setTemplateSavedToast(true);
    setTimeout(() => setTemplateSavedToast(false), 3000);
  };

  // Export WhatsApp logs to CSV
  const handleExportWaLogsCSV = () => {
    const headers = [
      'Waktu Pengiriman',
      'Tipe Pesan',
      'Nama Penerima / Wali',
      'Nama Siswa',
      'Nomor WhatsApp',
      'Metode Pengiriman',
      'Status Pengiriman',
      'Isi Pesan WhatsApp'
    ];

    const rows = filteredLogs.map(log => [
      `"${log.timestamp}"`,
      `"${log.tipe === 'TAGIHAN_PENGINGAT' ? 'Pengingat Tagihan SPP' : 'Konfirmasi Resi Lunas'}"`,
      `"${log.namaPenerima.replace(/"/g, '""')}"`,
      `"${(log.siswaNama || '-').replace(/"/g, '""')}"`,
      `"${log.noWaTujuan}"`,
      `"${log.metodePengiriman || 'Direct WhatsApp'}"`,
      `"${log.status}"`,
      `"${log.pesan.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Log_Pengiriman_WhatsApp_SPP_YPWI_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download active WhatsApp template text file
  const handleDownloadActiveTemplate = () => {
    const isTagihan = selectedTemplateTab === 'TAGIHAN';
    const text = isTagihan ? tempBillingTemplate : tempLunasTemplate;
    const filename = isTagihan 
      ? 'Template_WhatsApp_Tagihan_SPP_YPWI.txt' 
      : 'Template_WhatsApp_Kuitansi_Lunas_YPWI.txt';

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  // Save Gateway Config
  const handleSaveGateway = () => {
    const updated = {
      ...settings,
      waGatewayConfig: gatewayConfig,
    };
    onUpdateSettings(updated);
    storage.saveSettings(updated);
    setGatewaySavedToast(true);
    setTimeout(() => setGatewaySavedToast(false), 3000);
  };

  // Preview message with sample student
  const sampleStudent = students[0] || {
    id: 's1',
    nama: 'Muhammad Al-Fatih',
    nis: '202401001',
    kelas: 'Kelas 4-A',
    jenjang: 'SDIT',
    namaWali: 'Ahmad Pratama, S.T.',
    noWa: '081242338890',
    sppBulanan: 250000,
    biayaLain: 50000,
    tahunAjaran: '2024/2025'
  };

  const previewBillingMessage = generateBillingReminderMessage(
    sampleStudent as any,
    [targetMonth],
    settings
  );

  const samplePayment = payments[0] || {
    id: 'pay-001',
    noKuitansi: 'KWT/YPWI/2024/08/001',
    siswaNama: sampleStudent.nama,
    nis: sampleStudent.nis,
    kelas: sampleStudent.kelas,
    jenjang: sampleStudent.jenjang,
    namaWali: sampleStudent.namaWali,
    noWa: sampleStudent.noWa,
    bulanList: ['Agustus 2024'],
    totalBayar: 300000,
    tanggalBayar: '2024-08-08',
    waktuBayar: '10:00',
    metodePembayaran: 'Transfer BSI',
    statusKuitansi: 'Resmi',
    waStatus: 'Terkirim'
  };

  const previewLunasMessage = generatePaymentConfirmationMessage(
    samplePayment as any,
    settings
  );

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    if (logFilter === 'ALL') return waLogs;
    return waLogs.filter(l => l.tipe === logFilter);
  }, [waLogs, logFilter]);

  return (
    <div className="space-y-6">
      
      {/* Sub-tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSubTab('SCHEDULED')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer glow-tab ${
              activeSubTab === 'SCHEDULED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pengingat Tagihan Terjadwal</span>
          </button>

          <button
            onClick={() => setActiveSubTab('TEMPLATES')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer glow-tab ${
              activeSubTab === 'TEMPLATES'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Format Pesan & Template</span>
          </button>

          <button
            onClick={() => setActiveSubTab('GATEWAY')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer glow-tab ${
              activeSubTab === 'GATEWAY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Pengaturan WhatsApp Gateway</span>
          </button>

          <button
            onClick={() => setActiveSubTab('LOGS')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer glow-tab ${
              activeSubTab === 'LOGS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Riwayat Pesan Terkirim ({waLogs.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold px-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>WhatsApp Engine Aktif</span>
        </div>
      </div>

      {/* 1. SCHEDULED REMINDERS TAB */}
      {activeSubTab === 'SCHEDULED' && (
        <div className="space-y-6">
          
          {/* Main Action Banner */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-900 rounded-3xl p-6 sm:p-7 text-white shadow-lg space-y-4 glow-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800 text-emerald-200 text-xs font-medium border border-emerald-700 mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Jatuh Tempo: Tanggal {settings.tglJatuhTempoSetiapBulan} Setiap Bulan</span>
                </span>
                <h3 className="text-xl font-extrabold text-white">
                  Otomatisasi Notifikasi Tagihan SPP ke Orang Tua
                </h3>
                <p className="text-xs text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
                  Sistem mendeteksi siswa yang belum membayar pada bulan yang dipilih dan menyiapkan pesan penagihan personal resmi beserta nomor rekening BSI yayasan untuk dikirimkan ke nomor WhatsApp masing-masing wali murid.
                </p>
              </div>

              {/* Action Trigger */}
              <button
                onClick={handleStartBatchBlast}
                disabled={isBlasting || unpaidStudents.length === 0}
                className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-emerald-950 font-extrabold text-xs sm:text-sm shadow-md hover:bg-emerald-50 active:scale-95 transition-all shrink-0 cursor-pointer ${
                  isBlasting || unpaidStudents.length === 0 ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {isBlasting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
                ) : (
                  <Play className="w-4 h-4 text-emerald-700" />
                )}
                <span>
                  {isBlasting
                    ? `Mengirim (${blastProgress?.current}/${blastProgress?.total})...`
                    : `Kirim Pengingat Masal (${unpaidStudents.length} Siswa)`}
                </span>
              </button>
            </div>

            {/* Progress Bar during blast */}
            {isBlasting && blastProgress && (
              <div className="space-y-1.5 pt-2 border-t border-emerald-800/80">
                <div className="flex justify-between text-xs text-emerald-200">
                  <span>Proses pengiriman pesan notifikasi WhatsApp...</span>
                  <span className="font-bold">{Math.round((blastProgress.current / blastProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-emerald-950 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-400 h-full rounded-full transition-all duration-200"
                    style={{ width: `${(blastProgress.current / blastProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Result Message */}
            {blastResult && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-xs text-emerald-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>{blastResult}</span>
              </div>
            )}
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="font-semibold text-slate-700 mr-2">Target Bulan SPP:</label>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-bold cursor-pointer"
                >
                  <option value="Juli 2024">Juli 2024</option>
                  <option value="Agustus 2024">Agustus 2024</option>
                  <option value="September 2024">September 2024</option>
                  <option value="Oktober 2024">Oktober 2024</option>
                  <option value="November 2024">November 2024</option>
                  <option value="Desember 2024">Desember 2024</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mr-2">Jenjang:</label>
                <select
                  value={filterJenjang}
                  onChange={(e) => setFilterJenjang(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 cursor-pointer"
                >
                  <option value="ALL">Semua Jenjang</option>
                  <option value="RA / TK">RA / TK</option>
                  <option value="SDIT">SDIT</option>
                  <option value="SMPIT">SMPIT</option>
                  <option value="SMAIT / Tahfidz">SMAIT / Tahfidz</option>
                </select>
              </div>
            </div>

            <div className="text-slate-600 font-medium">
              Siswa Belum Membayar: <strong className="text-rose-600 font-bold">{unpaidStudents.length}</strong> orang
            </div>
          </div>

          {/* Unpaid Students Table with 1-Click WhatsApp Trigger */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200/80 bg-slate-50/60 flex items-center justify-between">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                Daftar Penagihan SPP Periode {targetMonth}
              </h4>
              <span className="text-[11px] text-slate-500">
                Klik "Kirim Pesan" untuk mengirimkan reminder personal langsung ke WA
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-3">Kelas & Jenjang</th>
                    <th className="py-3 px-3">Wali Murid</th>
                    <th className="py-3 px-3">No. WhatsApp</th>
                    <th className="py-3 px-3 text-right">Tagihan</th>
                    <th className="py-3 px-4 text-right sticky right-0 z-20 bg-slate-50 shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.18)]">Aksi WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {unpaidStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">Alhamdulillah!</p>
                        <p className="text-xs text-slate-500">Semua siswa telah melunasi SPP untuk bulan {targetMonth}.</p>
                      </td>
                    </tr>
                  ) : (
                    unpaidStudents.map((student) => {
                      const msg = generateBillingReminderMessage(student, [targetMonth], settings);
                      const waUrl = buildDirectWhatsAppUrl(student.noWa, msg);

                      return (
                        <tr key={student.id} className="glow-row">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{student.nama}</p>
                            <p className="text-[10px] text-slate-400 font-mono">NIS: {student.nis}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-800">{student.kelas}</span>
                            <p className="text-[10px] text-slate-500">{student.jenjang}</p>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-medium text-slate-900">{student.namaWali}</p>
                            <p className="text-[10px] text-slate-400">{student.hubunganWali}</p>
                          </td>
                          <td className="py-3 px-3 font-mono text-emerald-800 font-semibold">
                            {student.noWa}
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                            Rp {formatRupiah(student.sppBulanan + (student.biayaLain || 0))}
                          </td>
                          <td className="py-3 px-4 text-right sticky right-0 z-10 bg-white shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.18)]">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-semibold transition-all shadow-xs cursor-pointer glow-btn"
                              >
                                <Send className="w-3 h-3" />
                                <span>Kirim via WA</span>
                              </a>
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
        </div>
      )}

      {/* 2. TEMPLATES TAB */}
      {activeSubTab === 'TEMPLATES' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Template Editor Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Editor Template Pesan WhatsApp</h3>
                <p className="text-xs text-slate-500">Sesuaikan kalimat pembuka, rekening, dan format penagihan yayasan.</p>
              </div>

              {/* Switcher */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setSelectedTemplateTab('TAGIHAN')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedTemplateTab === 'TAGIHAN'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Tagihan Bulanan
                </button>
                <button
                  onClick={() => setSelectedTemplateTab('LUNAS')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedTemplateTab === 'LUNAS'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600'
                  }`}
                >
                  Resi Lunas
                </button>
              </div>
            </div>

            {selectedTemplateTab === 'TAGIHAN' ? (
              <div className="space-y-3">
                <div className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-600">
                  <p className="font-bold text-slate-700 mb-1">Variabel yang dapat digunakan:</p>
                  <p className="font-mono text-[10px] text-emerald-800 leading-relaxed">
                    {`{nama_wali}`}, {`{nama_siswa}`}, {`{nis}`}, {`{kelas}`}, {`{jenjang}`}, {`{bulan}`}, {`{nominal_spp}`}, {`{biaya_lain}`}, {`{total_tagihan}`}, {`{bank_utama}`}, {`{no_rekening}`}, {`{atas_nama}`}, {`{tgl_jatuh_tempo}`}, {`{link_portal}`}
                  </p>
                </div>

                <textarea
                  rows={14}
                  value={tempBillingTemplate}
                  onChange={(e) => setTempBillingTemplate(e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-600">
                  <p className="font-bold text-slate-700 mb-1">Variabel yang dapat digunakan:</p>
                  <p className="font-mono text-[10px] text-emerald-800 leading-relaxed">
                    {`{nama_wali}`}, {`{nama_siswa}`}, {`{nis}`}, {`{kelas}`}, {`{jenjang}`}, {`{no_kuitansi}`}, {`{tanggal_bayar}`}, {`{waktu_bayar}`}, {`{bulan_dibayar}`}, {`{metode_pembayaran}`}, {`{total_bayar}`}, {`{link_kuitansi}`}
                  </p>
                </div>

                <textarea
                  rows={14}
                  value={tempLunasTemplate}
                  onChange={(e) => setTempLunasTemplate(e.target.value)}
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 leading-relaxed"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Perubahan langsung berlaku ke seluruh pengiriman WA
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadActiveTemplate}
                  className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  title="Unduh file teks format template ini"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Unduh Template (.txt)</span>
                </button>
                <button
                  onClick={handleSaveTemplates}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Template</span>
                </button>
              </div>
            </div>

            {templateSavedToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Template pesan WhatsApp berhasil disimpan!</span>
              </div>
            )}
          </div>

          {/* Live Preview Box (WhatsApp Chat Bubble Simulation) */}
          <div className="bg-slate-100/80 rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm">Pratinjau Tampilan Pesan WhatsApp</h3>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Live Preview
              </span>
            </div>

            {/* WhatsApp Chat Simulation UI */}
            <div className="bg-[#efeae2] p-4 rounded-xl border border-slate-300 shadow-inner min-h-[400px] flex flex-col justify-end">
              <div className="bg-[#dcf8c6] text-slate-900 p-3.5 rounded-xl rounded-tr-xs shadow-xs max-w-sm ml-auto text-xs space-y-1.5 border border-emerald-200/50">
                <p className="whitespace-pre-wrap font-sans leading-relaxed text-[11px]">
                  {selectedTemplateTab === 'TAGIHAN' ? previewBillingMessage : previewLunasMessage}
                </p>
                <div className="text-[9px] text-slate-400 text-right flex items-center justify-end gap-1 pt-1">
                  <span>10:15</span>
                  <span className="text-sky-500 font-bold">✓✓</span>
                </div>
              </div>
            </div>
            
            <p className="text-[11px] text-slate-500 text-center">
              Pesan di atas adalah simulasi persis tampilan yang diterima di layar ponsel wali murid.
            </p>
          </div>

        </div>
      )}

      {/* 3. GATEWAY CONFIG TAB */}
      {activeSubTab === 'GATEWAY' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs max-w-2xl space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-base">Konfigurasi Pengiriman WhatsApp</h3>
            <p className="text-xs text-slate-500">
              Pilih apakah ingin menggunakan WhatsApp Web langsung (gratis & aman) atau menghubungkan API Gateway.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-800 mb-1">Mode Pengiriman WhatsApp</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                
                {/* Option 1: Direct WhatsApp Web / Mobile */}
                <div 
                  onClick={() => setGatewayConfig({ ...gatewayConfig, provider: 'DIRECT' })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    gatewayConfig.provider === 'DIRECT'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">Direct WhatsApp (Rekomendasi)</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Gratis
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Membuka WhatsApp Web / Desktop otomatis dengan pesan yang sudah terisi rapi. 100% aman tanpa perlu sewa API pihak ketiga.
                  </p>
                </div>

                {/* Option 2: Fonnte / Wablas API */}
                <div 
                  onClick={() => setGatewayConfig({ ...gatewayConfig, provider: 'FONNTE' })}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    gatewayConfig.provider === 'FONNTE'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900">Fonnte / Wablas Gateway</span>
                    <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold">
                      API Server
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Pengiriman otomatis di latar belakang (background) menggunakan token API Fonnte atau gateway WhatsApp mandiri.
                  </p>
                </div>

              </div>
            </div>

            {/* API Key configuration if not DIRECT */}
            {gatewayConfig.provider !== 'DIRECT' && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">API Token / Secret Key</label>
                  <input
                    type="password"
                    placeholder="Contoh: v8kQ9812903xxx"
                    value={gatewayConfig.apiKey}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, apiKey: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Pengirim (Sender Number)</label>
                  <input
                    type="text"
                    placeholder="081242338890"
                    value={gatewayConfig.senderNumber}
                    onChange={(e) => setGatewayConfig({ ...gatewayConfig, senderNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white font-mono"
                  />
                </div>
              </div>
            )}

            {/* Checkbox Options */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gatewayConfig.autoSendOnPayment}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, autoSendOnPayment: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="font-semibold text-slate-800">
                  Otomatis picu resi WhatsApp segera setelah pembayaran disimpan di kasir
                </span>
              </label>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={handleSaveGateway}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Simpan Konfigurasi
              </button>
            </div>

            {gatewaySavedToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Pengaturan WhatsApp Gateway berhasil diperbarui!</span>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 4. LOGS TAB */}
      {activeSubTab === 'LOGS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Riwayat & Log Pesan WhatsApp</h3>
              <p className="text-xs text-slate-500">Catatan pengiriman notifikasi tagihan dan resi pembayaran.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
              >
                <option value="ALL">Semua Tipe Pesan</option>
                <option value="TAGIHAN_PENGINGAT">Hanya Tagihan</option>
                <option value="KONFIRMASI_PEMBAYARAN">Hanya Resi Pembayaran</option>
              </select>

              <button
                type="button"
                onClick={handleExportWaLogsCSV}
                title="Export Log Pengiriman WA ke Excel / CSV"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Log CSV</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Bersihkan seluruh riwayat log pesan?')) {
                    storage.clearWhatsAppLogs();
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                title="Bersihkan Log"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-3">Tipe</th>
                  <th className="py-3 px-3">Penerima & Siswa</th>
                  <th className="py-3 px-3">No. WhatsApp</th>
                  <th className="py-3 px-3">Metode</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4">Cuplikan Pesan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Belum ada log pengiriman pesan WhatsApp yang tercatat.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.tipe === 'KONFIRMASI_PEMBAYARAN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {log.tipe === 'KONFIRMASI_PEMBAYARAN' ? 'Resi Sah' : 'Tagihan'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{log.namaPenerima}</p>
                        <p className="text-[10px] text-slate-400">Siswa: {log.siswaNama}</p>
                      </td>
                      <td className="py-3 px-3 font-mono text-emerald-800">
                        {log.noWaTujuan}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-500">
                        {log.metodePengiriman}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                          <Check className="w-3.5 h-3.5" />
                          <span>{log.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-500">
                        {log.pesan}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
