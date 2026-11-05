import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  Share2, 
  CheckCircle2, 
  Copy, 
  Check, 
  Building2,
  FileCheck
} from 'lucide-react';
import { Pembayaran, FoundationSettings } from '../types';
import { generateReceiptPDF, terbilang } from '../services/pdfGenerator';
import { generatePaymentConfirmationMessage, buildDirectWhatsAppUrl, sendWhatsAppMessage } from '../services/whatsapp';

interface ReceiptModalProps {
  payment: Pembayaran;
  settings: FoundationSettings;
  onClose: () => void;
  isNewPaymentCelebration?: boolean;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  payment,
  settings,
  onClose,
  isNewPaymentCelebration = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [waSentSuccess, setWaSentSuccess] = useState(payment.waStatus === 'Terkirim');

  const waMessage = generatePaymentConfirmationMessage(payment, settings);
  const directWaUrl = buildDirectWhatsAppUrl(payment.noWa, waMessage);

  const handleDownloadPDF = async () => {
    await generateReceiptPDF(payment, settings);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(waMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAutoSendWa = async () => {
    setWaSending(true);
    try {
      await sendWhatsAppMessage(
        payment.noWa,
        waMessage,
        payment.namaWali,
        payment.siswaId,
        payment.siswaNama,
        'KONFIRMASI_PEMBAYARAN',
        payment.id
      );
      setWaSentSuccess(true);
    } catch (e) {
      console.error(e);
    } finally {
      setWaSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-emerald-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header / Actions Bar */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700/60 rounded-lg text-emerald-200">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Kuitansi Pembayaran SPP Sah</h2>
              <p className="text-xs text-emerald-200">No. {payment.noKuitansi}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Celebration Banner if just recorded */}
        {isNewPaymentCelebration && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Pembayaran berhasil dicatat ke sistem buku kas SPP YPWI Konawe!</span>
          </div>
        )}

        {/* The Printable Official Receipt Card */}
        <div className="p-5 sm:p-6 printable-receipt">
          <div className="border-2 border-emerald-600/30 rounded-xl p-5 bg-white relative shadow-xs">
            
            {/* Watermark badge */}
            <div className="absolute right-6 top-20 pointer-events-none opacity-15 rotate-[-15deg] border-4 border-emerald-600 rounded-xl p-3 text-center">
              <span className="text-2xl font-black text-emerald-800 tracking-wider">LUNAS</span>
              <p className="text-[10px] font-bold text-emerald-800">YPWI KONAWE</p>
            </div>

            {/* Receipt Header */}
            <div className="flex items-start gap-3 pb-3 border-b-2 border-emerald-700">
              <img 
                src={settings.logoUrl || 'assets/aistudio/LOGO_YAYASAN_d78c341b.png'} 
                alt="Logo YPWI Konawe" 
                className="w-14 h-14 object-contain shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-emerald-950 uppercase tracking-tight">
                  {settings.namaYayasan}
                </h3>
                <p className="text-[11px] font-semibold text-teal-700">
                  UNIT: RA/TK • SDIT • SMPIT • SMAIT / PONDOK TAHFIDZ WAHDAH ISLAMIYAH
                </p>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {settings.alamat}, {settings.kabupaten}, {settings.provinsi} | WA: {settings.nomorWaYayasan}
                </p>
              </div>
            </div>

            {/* Title & Receipt Number */}
            <div className="my-3 flex flex-wrap items-center justify-between gap-2 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/60">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">BUKTI RESMI PEMBAYARAN</span>
                <p className="text-sm font-bold text-slate-900">No. {payment.noKuitansi}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500">Tanggal Transaksi</span>
                <p className="text-xs font-semibold text-slate-800">{payment.tanggalBayar} • {payment.waktuBayar || '10:00'} WITA</p>
              </div>
            </div>

            {/* Receipt Content Details */}
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="grid grid-cols-3 py-1 border-b border-slate-100">
                <span className="text-slate-500">Telah Terima Dari</span>
                <span className="col-span-2 font-semibold text-slate-900">: {payment.namaWali || 'Orang Tua / Wali'}</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-b border-slate-100">
                <span className="text-slate-500">Untuk Siswa / NIS</span>
                <span className="col-span-2 font-bold text-emerald-900">: {payment.siswaNama} (NIS: {payment.nis})</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-b border-slate-100">
                <span className="text-slate-500">Jenjang & Kelas</span>
                <span className="col-span-2 text-slate-800">: {payment.kelas} — {payment.jenjang} (TA {payment.tahunAjaran})</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-b border-slate-100">
                <span className="text-slate-500">Bulan SPP Dibayar</span>
                <span className="col-span-2 font-semibold text-slate-900">: {payment.bulanList.join(', ')}</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-b border-slate-100">
                <span className="text-slate-500">Metode Bayar</span>
                <span className="col-span-2 text-slate-800">
                  : {payment.metodePembayaran} {payment.referensiBank && `(Ref: ${payment.referensiBank})`}
                </span>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="mt-3 bg-slate-50 rounded-lg p-2.5 text-xs border border-slate-200">
              <div className="flex justify-between font-semibold text-slate-700 pb-1 border-b border-slate-200 text-[11px]">
                <span>Pos Pembayaran</span>
                <span>Subtotal</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>• SPP {payment.bulanList.length} Bulan (@ Rp {payment.nominalSppPerBulan.toLocaleString('id-ID')})</span>
                <span className="font-medium text-slate-800">Rp {payment.totalSpp.toLocaleString('id-ID')}</span>
              </div>
              {payment.nominalBiayaLain > 0 && (
                <div className="flex justify-between py-1 text-slate-600">
                  <span>• Biaya Penunjang / Lainnya (Catering/Asrama/Kegiatan)</span>
                  <span className="font-medium text-slate-800">Rp {payment.nominalBiayaLain.toLocaleString('id-ID')}</span>
                </div>
              )}
              {Boolean(payment.nominalInfaqPembangunan && payment.nominalInfaqPembangunan > 0) && (
                <div className="flex justify-between py-1 text-sky-700 bg-sky-50/50 px-1 rounded">
                  <span>• Infaq / Sedekah Pembangunan Sekolah ({payment.keteranganInfaqPembangunan || 'Sarana'})</span>
                  <span className="font-bold text-sky-800">Rp {payment.nominalInfaqPembangunan!.toLocaleString('id-ID')}</span>
                </div>
              )}
              {Boolean(payment.nominalInfaqWiz && payment.nominalInfaqWiz > 0) && (
                <div className="flex justify-between py-1 text-emerald-800 bg-emerald-50/60 px-1 rounded">
                  <span className="flex items-center gap-1 font-medium">
                    <span>• Infaq Wahdah Inspirasi Zakat (WIZ)</span>
                  </span>
                  <span className="font-bold text-emerald-800">Rp {payment.nominalInfaqWiz!.toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold text-sm text-emerald-900">
                <span>TOTAL PEMBAYARAN</span>
                <span className="text-emerald-700">Rp {payment.totalBayar.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Terbilang */}
            <div className="mt-2 text-[11px] italic text-slate-600 bg-emerald-50/50 p-2 rounded-md border border-emerald-100">
              <span className="font-semibold text-emerald-900 not-italic">Terbilang: </span>
              "{terbilang(payment.totalBayar).trim()} Rupiah"
            </div>

            {/* Signatures & Stamp */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-end justify-between text-xs">
              <div className="text-center text-slate-600">
                <p className="text-[11px]">Orang Tua / Wali Siswa,</p>
                <div className="h-10"></div>
                <p className="font-medium border-t border-slate-300 pt-1 px-3">
                  ( {payment.namaWali || '.......................'} )
                </p>
              </div>

              {/* Status stamp */}
              <div className="px-3 py-1.5 rounded-lg border-2 border-emerald-600 bg-emerald-50 text-emerald-700 text-center font-bold text-[10px]">
                <p>STATUS: LUNAS</p>
                <p className="text-[8px] font-normal">KASIR YPWI KONAWE</p>
              </div>

              <div className="text-center text-slate-600">
                <p className="text-[11px]">Unaaha, {payment.tanggalBayar}</p>
                <p className="text-[11px] font-medium text-emerald-900">Kasir / Bendahara,</p>
                <div className="h-10"></div>
                <p className="font-bold text-slate-900 border-t border-slate-300 pt-1 px-3">
                  {payment.namaPenerima || settings.namaBendahara}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp & Export Actions Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 sm:px-6 flex flex-col gap-3">
          {/* Quick WhatsApp Send Box */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                WA
              </div>
              <div className="text-xs">
                <p className="font-semibold text-emerald-950">
                  Notifikasi Resi Digital WhatsApp ke Orang Tua
                </p>
                <p className="text-slate-600 text-[11px]">
                  Tujuan: <strong>{payment.noWa || 'Nomor WA belum diisi'}</strong> ({payment.namaWali})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <a
                href={directWaUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Buka WhatsApp & Kirim</span>
              </a>

              <button
                onClick={handleCopyText}
                title="Salin Isi Pesan WhatsApp"
                className="p-2 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? 'Tersalin' : 'Salin Pesan'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons: PDF, Print, Close */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPDF}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Bukti PDF Resmi</span>
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Cetak / Print</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
