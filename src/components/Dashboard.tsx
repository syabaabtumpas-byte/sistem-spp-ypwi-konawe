import React, { useState } from 'react';
import { 
  DollarSign, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  ArrowUpRight, 
  Send, 
  FileText, 
  PlusCircle, 
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { Siswa, Pembayaran, FoundationSettings } from '../types';
import { storage } from '../services/storage';
import { formatRupiah, generateBillingReminderMessage, buildDirectWhatsAppUrl, sendWhatsAppMessage } from '../services/whatsapp';

interface DashboardProps {
  students: Siswa[];
  payments: Pembayaran[];
  settings: FoundationSettings;
  onNavigate: (tab: string) => void;
  onOpenNewPaymentWithStudent?: (studentId: string) => void;
  onViewReceipt: (payment: Pembayaran) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  students,
  payments,
  settings,
  onNavigate,
  onOpenNewPaymentWithStudent,
  onViewReceipt,
}) => {
  // Current month for calculation
  const currentAcademicYear = '2024/2025';
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const currentMonthName = 'Agustus'; // Default active school month for demonstration or current month
  const activeMonthLabel = `${currentMonthName} 2024`;

  // Calculate statistics
  const activeStudents = students.filter(s => s.status === 'Aktif');

  // Check which students paid for active month
  const paidStudentsForActiveMonth = activeStudents.filter(student => {
    const studentPayments = payments.filter(
      p => p.siswaId === student.id && p.statusKuitansi === 'Resmi'
    );
    return studentPayments.some(p => p.bulanList.some(m => m.includes(currentMonthName)));
  });

  const unpaidStudentsForActiveMonth = activeStudents.filter(student => {
    return !paidStudentsForActiveMonth.some(p => p.id === student.id);
  });

  // Financial totals
  const totalReceivedThisMonth = payments
    .filter(p => p.statusKuitansi === 'Resmi' && p.bulanList.some(m => m.includes(currentMonthName)))
    .reduce((sum, p) => sum + p.totalBayar, 0);

  const totalAllTimeIncome = payments
    .filter(p => p.statusKuitansi === 'Resmi')
    .reduce((sum, p) => sum + p.totalBayar, 0);

  const totalUnpaidPotentialThisMonth = unpaidStudentsForActiveMonth.reduce(
    (sum, s) => sum + s.sppBulanan + (s.biayaLain || 0),
    0
  );

  const percentagePaid = activeStudents.length > 0 
    ? Math.round((paidStudentsForActiveMonth.length / activeStudents.length) * 100)
    : 0;

  // Breakdown by Level
  const levels: ('RA / TK' | 'SDIT' | 'SMPIT' | 'SMAIT / Tahfidz')[] = ['RA / TK', 'SDIT', 'SMPIT', 'SMAIT / Tahfidz'];
  const levelStats = levels.map(jenjang => {
    const list = activeStudents.filter(s => s.jenjang === jenjang);
    const paidList = list.filter(s => paidStudentsForActiveMonth.some(p => p.id === s.id));
    const collected = payments
      .filter(p => p.jenjang === jenjang && p.statusKuitansi === 'Resmi')
      .reduce((sum, p) => sum + p.totalBayar, 0);
    return {
      jenjang,
      total: list.length,
      paid: paidList.length,
      unpaid: list.length - paidList.length,
      collected,
      percent: list.length > 0 ? Math.round((paidList.length / list.length) * 100) : 0
    };
  });

  // Mass WhatsApp Reminder State
  const [isBlasting, setIsBlasting] = useState(false);
  const [blastSuccessMessage, setBlastSuccessMessage] = useState<string | null>(null);

  const handleBlastReminders = async () => {
    if (unpaidStudentsForActiveMonth.length === 0) {
      alert('Alhamdulillah! Semua siswa sudah melunasi pembayaran bulan ini.');
      return;
    }

    const confirmSend = window.confirm(
      `Kirim notifikasi tagihan WhatsApp otomatis ke ${unpaidStudentsForActiveMonth.length} wali murid yang belum membayar bulan ${currentMonthName}?`
    );
    if (!confirmSend) return;

    setIsBlasting(true);
    let sentCount = 0;

    for (const student of unpaidStudentsForActiveMonth) {
      const msg = generateBillingReminderMessage(student, [activeMonthLabel], settings);
      await sendWhatsAppMessage(
        student.noWa,
        msg,
        student.namaWali,
        student.id,
        student.nama,
        'TAGIHAN_PENGINGAT'
      );
      sentCount++;
    }

    setIsBlasting(false);
    setBlastSuccessMessage(`Alhamdulillah, notifikasi tagihan berhasil diproses untuk ${sentCount} wali murid!`);
    setTimeout(() => setBlastSuccessMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Action Bar */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/10 relative overflow-hidden">
        {/* Subtle decorative Islamic pattern circles */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-2xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute right-48 bottom-0 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 text-emerald-200 text-xs font-medium mb-3 border border-emerald-600/40">
              <Calendar className="w-3.5 h-3.5 text-emerald-300" />
              <span>Tahun Ajaran {currentAcademicYear} • Periode {activeMonthLabel}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Rekapitulasi Keuangan & SPP Real-Time
            </h2>
            <p className="mt-2 text-sm text-emerald-100/90 leading-relaxed">
              Pantau arus kas masuk pembayaran SPP, status pembayaran siswa per jenjang, 
              serta kirimkan notifikasi tagihan dan resi otomatis langsung ke WhatsApp orang tua.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('pembayaran')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-emerald-900 font-bold text-sm shadow-md hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer glow-btn"
            >
              <PlusCircle className="w-4 h-4 text-emerald-700" />
              <span>Catat Pembayaran SPP</span>
            </button>

            <button
              onClick={handleBlastReminders}
              disabled={isBlasting || unpaidStudentsForActiveMonth.length === 0}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-emerald-300/40 bg-emerald-700/50 hover:bg-emerald-700 text-white font-semibold text-sm transition-all cursor-pointer ${
                isBlasting ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <Send className="w-4 h-4 text-emerald-300" />
              <span>{isBlasting ? 'Mengirim...' : 'Kirim Pengingat Tagihan Masal'}</span>
            </button>
          </div>
        </div>

        {/* Success toast if blasted */}
        {blastSuccessMessage && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-xs text-emerald-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{blastSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Penerimaan Bulan Ini */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs hover:border-emerald-200 transition-all glow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Kas Masuk ({currentMonthName})
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            Rp {formatRupiah(totalReceivedThisMonth)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Total Semua Periode: Rp {formatRupiah(totalAllTimeIncome)}</span>
          </div>
        </div>

        {/* Card 2: Siswa Lunas */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-xs hover:border-emerald-200 transition-all glow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Siswa Lunas SPP
            </span>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {paidStudentsForActiveMonth.length}
            </p>
            <span className="text-sm text-slate-500">dari {activeStudents.length} Siswa</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentagePaid}%` }}
            ></div>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 text-right">{percentagePaid}% Terbayar</p>
        </div>

        {/* Card 3: Belum Bayar / Menunggak */}
        <div className="bg-white p-5 rounded-2xl border border-rose-100 shadow-xs hover:border-rose-200 transition-all glow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Belum Membayar
            </span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-rose-600 tracking-tight">
            {unpaidStudentsForActiveMonth.length} Siswa
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-700 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Jatuh tempo setiap tgl {settings.tglJatuhTempoSetiapBulan}</span>
          </div>
        </div>

        {/* Card 4: Potensi Tagihan Tertunggak */}
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs hover:border-amber-200 transition-all glow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Potensi Piutang SPP
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            Rp {formatRupiah(totalUnpaidPotentialThisMonth)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Perlu ditindaklanjuti via WhatsApp
          </p>
        </div>

      </div>

      {/* Breakdown per Jenjang & Real-Time Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Unit Breakdown & Unpaid Alert */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Rekapitulasi per Jenjang Pendidikan */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs glow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">Rekapitulasi Unit Pendidikan YPWI</h3>
              </div>
              <span className="text-xs text-slate-500">Periode {activeMonthLabel}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {levelStats.map((stat) => (
                <div 
                  key={stat.jenjang}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-emerald-50/40 transition-colors glow-card-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-emerald-950 uppercase">
                      {stat.jenjang}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                      {stat.percent}% Lunas
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                    <span>Lunas: <strong>{stat.paid}</strong> siswa</span>
                    <span>Belum: <strong className="text-rose-600">{stat.unpaid}</strong> siswa</span>
                  </div>

                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{ width: `${stat.percent}%` }}
                    ></div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Total Kas Terkumpul: <strong className="text-slate-800">Rp {formatRupiah(stat.collected)}</strong>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Siswa Belum Bayar Bulan Ini (Tindak Lanjut WhatsApp) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs glow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Daftar Siswa Belum Melunasi ({currentMonthName})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik tombol WA untuk mengirim pengingat personal langsung ke orang tua siswa
                </p>
              </div>
              <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                {unpaidStudentsForActiveMonth.length} Menunggak
              </span>
            </div>

            {unpaidStudentsForActiveMonth.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">Semua Siswa Telah Lunas!</p>
                <p>Tidak ada tunggakan untuk bulan {currentMonthName}.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {unpaidStudentsForActiveMonth.slice(0, 5).map((student) => {
                  const reminderMsg = generateBillingReminderMessage(student, [activeMonthLabel], settings);
                  const waUrl = buildDirectWhatsAppUrl(student.noWa, reminderMsg);

                  return (
                    <div key={student.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{student.nama}</p>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600">
                            {student.kelas} ({student.jenjang})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Wali: {student.namaWali} ({student.noWa}) • Tagihan: <strong className="text-slate-800">Rp {formatRupiah(student.sppBulanan + (student.biayaLain || 0))}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] shadow-xs transition-colors cursor-pointer glow-btn"
                        >
                          <Send className="w-3 h-3" />
                          <span>Kirim WA</span>
                        </a>

                        <button
                          onClick={() => onOpenNewPaymentWithStudent && onOpenNewPaymentWithStudent(student.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition-colors cursor-pointer glow-btn-neutral"
                        >
                          Catat Bayar
                        </button>
                      </div>
                    </div>
                  );
                })}

                {unpaidStudentsForActiveMonth.length > 5 && (
                  <div className="pt-3 text-center">
                    <button
                      onClick={() => onNavigate('siswa')}
                      className="text-xs text-emerald-700 font-semibold hover:underline"
                    >
                      Lihat {unpaidStudentsForActiveMonth.length - 5} siswa lainnya di Data Siswa →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Real-time Transaksi Pembayaran Terbaru */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Aktivitas Kas Masuk Terbaru</h3>
              <button
                onClick={() => onNavigate('pembayaran')}
                className="text-xs text-emerald-700 font-semibold hover:underline"
              >
                Semua ({payments.length})
              </button>
            </div>

            <div className="space-y-3">
              {payments.slice(0, 5).map((pay) => (
                <div 
                  key={pay.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/80 hover:bg-white hover:border-emerald-200 hover:shadow-xs transition-all text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 leading-snug">{pay.siswaNama}</p>
                      <p className="text-[11px] text-slate-500">{pay.kelas} • {pay.bulanList.join(', ')}</p>
                    </div>
                    <span className="font-black text-emerald-700 shrink-0 text-xs">
                      Rp {formatRupiah(pay.totalBayar)}
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{pay.tanggalBayar} • {pay.metodePembayaran}</span>
                    <button
                      onClick={() => onViewReceipt(pay)}
                      className="text-emerald-700 font-semibold hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Kuitansi</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Foundation Info Card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>Rekening Resmi SPP YPWI</span>
            </div>
            {settings.rekeningList.map((rek) => (
              <div key={rek.id} className="p-2 bg-white rounded-lg border border-slate-200">
                <p className="font-semibold text-slate-800">{rek.bank}</p>
                <p className="font-mono text-emerald-800 font-bold">{rek.nomorRekening}</p>
                <p className="text-[10px] text-slate-500">a.n {rek.atasNama}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
