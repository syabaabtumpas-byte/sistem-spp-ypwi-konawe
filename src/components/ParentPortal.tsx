import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  Send, 
  FileText, 
  CreditCard, 
  Building2,
  Calendar
} from 'lucide-react';
import { Siswa, Pembayaran, FoundationSettings, ItemTagihanBulan } from '../types';
import { storage } from '../services/storage';
import { formatRupiah, buildDirectWhatsAppUrl } from '../services/whatsapp';
import { generateReceiptPDF } from '../services/pdfGenerator';

interface ParentPortalProps {
  students: Siswa[];
  payments: Pembayaran[];
  settings: FoundationSettings;
  initialNis?: string;
  onViewReceipt: (payment: Pembayaran) => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
  students,
  payments,
  settings,
  initialNis = '',
  onViewReceipt,
}) => {
  const [lookupQuery, setLookupQuery] = useState(initialNis || (students[0]?.nis || ''));
  const [activeStudent, setActiveStudent] = useState<Siswa | null>(null);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  // Initialize or perform lookup
  const handleSearch = (queryToUse?: string) => {
    const q = (queryToUse !== undefined ? queryToUse : lookupQuery).trim().toLowerCase();
    if (!q) {
      setActiveStudent(null);
      return;
    }

    const found = students.find(s => 
      s.nis.toLowerCase() === q ||
      s.nama.toLowerCase().includes(q) ||
      s.noWa.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    );

    if (found) {
      setActiveStudent(found);
      setSearchFeedback(null);
    } else {
      setActiveStudent(null);
      setSearchFeedback('Data siswa dengan NIS atau nomor WhatsApp tersebut tidak ditemukan. Mohon periksa kembali.');
    }
  };

  useEffect(() => {
    if (initialNis) {
      handleSearch(initialNis);
    } else if (students.length > 0 && !activeStudent) {
      setActiveStudent(students[0]);
    }
  }, [initialNis]);

  // Billing status for active student
  const billingMonths: ItemTagihanBulan[] = activeStudent
    ? storage.getStudentBillingStatus(activeStudent.id, activeStudent.tahunAjaran)
    : [];

  const paidMonths = billingMonths.filter(b => b.status === 'LUNAS');
  const unpaidMonths = billingMonths.filter(b => b.status !== 'LUNAS');

  // Copy bank account
  const handleCopy = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedBank(num);
    setTimeout(() => setCopiedBank(null), 2500);
  };

  // WhatsApp transfer confirmation message
  const primaryBank = settings.rekeningList.find(r => r.isUtama) || settings.rekeningList[0];
  const confirmTransferMessage = activeStudent ? `Assalamu'alaikum Warahmatullahi Wabarakatuh Bendahara YPWI Konawe,

Saya *${activeStudent.namaWali}* (Wali dari *${activeStudent.nama}*, NIS: ${activeStudent.nis}, Kelas: ${activeStudent.kelas} ${activeStudent.jenjang}), ingin mengonfirmasi bahwa saya telah melakukan transfer pembayaran SPP.

Mohon diverifikasi di sistem keuangan YPWI Konawe. Terima kasih.` : '';

  const confirmTransferWaUrl = buildDirectWhatsAppUrl(settings.nomorWaYayasan, confirmTransferMessage);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 rounded-3xl p-6 sm:p-7 text-white shadow-lg text-center space-y-2">
        <div className="w-12 h-12 bg-white p-1 rounded-2xl mx-auto mb-2 border border-emerald-300">
          <img 
            src={settings.logoUrl || 'assets/aistudio/LOGO_YAYASAN_d78c341b.png'} 
            alt="Logo YPWI Konawe" 
            className="w-full h-full object-contain"
          />
        </div>
        <h2 className="text-xl sm:text-2xl font-black">
          Portal Mandiri Wali Murid YPWI Konawe
        </h2>
        <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mx-auto">
          Cek rincian tagihan SPP ananda, status kelunasan bulanan, nomor rekening resmi yayasan, serta unduh bukti pembayaran kuitansi PDF resmi kapan saja.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <label className="block font-bold text-slate-800 text-xs mb-2">
          Masukkan NIS (Nomor Induk Siswa) atau Nama Siswa:
        </label>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Contoh: 202401001 atau nama ananda..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs"
            />
          </div>

          <button
            onClick={() => handleSearch()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            <span>Periksa Tagihan</span>
          </button>
        </div>

        {searchFeedback && (
          <p className="mt-3 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            {searchFeedback}
          </p>
        )}

        {/* Quick Example Links */}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 overflow-x-auto">
          <span>Contoh Cepat:</span>
          {students.slice(0, 3).map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setLookupQuery(s.nis);
                handleSearch(s.nis);
              }}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 font-medium cursor-pointer"
            >
              {s.nama} ({s.nis})
            </button>
          ))}
        </div>
      </div>

      {activeStudent && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Student Profile Card */}
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glow-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                {activeStudent.nama.charAt(0)}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{activeStudent.nama}</h3>
                <p className="text-xs text-slate-500">
                  NIS: <strong className="font-mono text-slate-800">{activeStudent.nis}</strong> • {activeStudent.kelas} ({activeStudent.jenjang})
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Wali: {activeStudent.namaWali} • WA: {activeStudent.noWa}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:items-end">
              <span className="text-[10px] uppercase font-bold text-slate-400">Tarif SPP Bulanan</span>
              <p className="text-lg font-black text-emerald-700">
                Rp {formatRupiah(activeStudent.sppBulanan)}
              </p>
              {activeStudent.biayaLain > 0 && (
                <span className="text-[10px] text-slate-500">
                  + {activeStudent.keteranganBiayaLain || 'Biaya Tambahan'}: Rp {formatRupiah(activeStudent.biayaLain)}
                </span>
              )}
            </div>
          </div>

          {/* Status Progress */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900">Bulan Sudah Lunas</span>
                <p className="text-2xl font-black text-emerald-700 mt-1">{paidMonths.length} Bulan</p>
                <p className="text-[11px] text-emerald-800/80 mt-0.5">Kuitansi PDF dapat diunduh di bawah</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-emerald-500/80" />
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-900">Sisa Tagihan Belum Bayar</span>
                <p className="text-2xl font-black text-amber-700 mt-1">{unpaidMonths.length} Bulan</p>
                <p className="text-[11px] text-amber-800/80 mt-0.5">Jatuh tempo tanggal {settings.tglJatuhTempoSetiapBulan} setiap bulan</p>
              </div>
              <Clock className="w-10 h-10 text-amber-500/80" />
            </div>
          </div>

          {/* 12 Months Status & Download Receipt Grid */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  Rekapitulasi Pembayaran SPP Tahun Ajaran {activeStudent.tahunAjaran}
                </h4>
                <p className="text-xs text-slate-500">
                  Klik tombol kuitansi untuk mengunduh bukti pembayaran resmi (PDF).
                </p>
              </div>
              <span className="text-xs text-slate-500 font-medium">12 Bulan Pendidikan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {billingMonths.map((item) => {
                const isPaid = item.status === 'LUNAS';
                const paymentRecord = payments.find(p => p.id === item.pembayaranId);

                return (
                  <div
                    key={item.label}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all glow-card-sm ${
                      isPaid
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-slate-50/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-slate-900">{item.label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/50'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {isPaid ? '✓ LUNAS' : 'BELUM DIBAYAR'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 mb-3">
                      <p>SPP: Rp {formatRupiah(item.nominal)}</p>
                      {item.biayaLain > 0 && (
                        <p className="text-[11px] text-slate-500">+ Biaya Lain: Rp {formatRupiah(item.biayaLain)}</p>
                      )}
                      {item.tanggalBayar && (
                        <p className="text-[10px] text-emerald-700 font-medium mt-1">
                          Dibayar tgl {item.tanggalBayar}
                        </p>
                      )}
                    </div>

                    {isPaid && paymentRecord ? (
                      <div className="flex items-center gap-1.5 pt-2 border-t border-emerald-200/60">
                        <button
                          onClick={() => generateReceiptPDF(paymentRecord, settings)}
                          className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>Unduh PDF</span>
                        </button>

                        <button
                          onClick={() => onViewReceipt(paymentRecord)}
                          title="Lihat Kuitansi"
                          className="p-1.5 bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg cursor-pointer transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-400 italic">
                        Menunggu pembayaran
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bank Payment Guidance & WhatsApp Confirmation */}
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl space-y-5">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Informasi Pembayaran SPP Resmi
              </span>
              <h4 className="text-lg font-bold text-white mt-1">
                Rekening Pembayaran {settings.namaYayasan}
              </h4>
              <p className="text-xs text-slate-300 mt-1">
                Silakan lakukan transfer ke salah satu rekening resmi di bawah ini, kemudian kirimkan bukti transfer ke WhatsApp Bendahara Yayasan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {settings.rekeningList.map((rek) => (
                <div key={rek.id} className="p-3.5 bg-white/10 rounded-2xl border border-white/15 space-y-2">
                  <span className="text-[11px] font-medium text-emerald-300">{rek.bank}</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base font-bold text-white tracking-wider">
                      {rek.nomorRekening}
                    </span>
                    <button
                      onClick={() => handleCopy(rek.nomorRekening)}
                      title="Salin Nomor Rekening"
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-xs"
                    >
                      {copiedBank === rek.nomorRekening ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">a.n {rek.atasNama}</p>
                </div>
              ))}
            </div>

            {/* Quick WA Confirm Button */}
            <div className="pt-3 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-300">
                Sudah melakukan transfer? Konfirmasikan pembayaran kepada bendahara:
              </span>

              <a
                href={confirmTransferWaUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Konfirmasi via WhatsApp ({settings.nomorWaYayasan})</span>
              </a>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
