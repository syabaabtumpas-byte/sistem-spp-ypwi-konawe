import { jsPDF } from 'jspdf';
import { Pembayaran, FoundationSettings } from '../types';

export function terbilang(angka: number): string {
  const bilangan = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  if (angka < 12) return bilangan[angka];
  if (angka < 20) return terbilang(angka - 10) + ' Belas';
  if (angka < 100) return terbilang(Math.floor(angka / 10)) + ' Puluh ' + terbilang(angka % 10);
  if (angka < 200) return 'Seratus ' + terbilang(angka - 100);
  if (angka < 1000) return terbilang(Math.floor(angka / 100)) + ' Ratus ' + terbilang(angka % 100);
  if (angka < 2000) return 'Seribu ' + terbilang(angka - 1000);
  if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + ' Ribu ' + terbilang(angka % 1000);
  if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + ' Juta ' + terbilang(angka % 1000000);
  if (angka < 1000000000000) return terbilang(Math.floor(angka / 1000000000)) + ' Miliar ' + terbilang(angka % 1000000000);
  return angka.toString();
}

export function formatRupiahDisplay(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export async function generateReceiptPDF(payment: Pembayaran, settings: FoundationSettings): Promise<void> {
  // A5 Landscape (210 x 148 mm) is the ideal standard Indonesian kuitansi format
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = 210;
  const pageHeight = 148;
  const margin = 14;

  // Background frame border
  doc.setDrawColor(5, 150, 105); // emerald-600
  doc.setLineWidth(0.8);
  doc.rect(margin - 4, margin - 4, pageWidth - (margin * 2) + 8, pageHeight - (margin * 2) + 8);

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.rect(margin - 2, margin - 2, pageWidth - (margin * 2) + 4, pageHeight - (margin * 2) + 4);

  // Logo loading attempt
  try {
    const img = new Image();
    img.src = settings.logoUrl || 'assets/aistudio/LOGO_YAYASAN_d78c341b.png';
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
    if (img.complete && img.naturalWidth !== 0) {
      doc.addImage(img, 'PNG', margin + 2, margin + 1, 20, 20);
    }
  } catch (e) {
    console.warn('Could not load logo into PDF', e);
  }

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(6, 78, 59); // deep emerald
  doc.text(settings.namaYayasan.toUpperCase(), 40, margin + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(14, 116, 144); // cyan/blue
  doc.text('UNIT: RA/TK QURRATA A\'YUN • SDIT • SMPIT • SMAIT / TAHFIDZ WAHDAH ISLAMIYAH', 40, margin + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${settings.alamat}, ${settings.kabupaten}, ${settings.provinsi} | WA: ${settings.nomorWaYayasan}`, 40, margin + 14.5);

  // Divider Line
  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(0.8);
  doc.line(margin, margin + 19, pageWidth - margin, margin + 19);

  doc.setDrawColor(245, 158, 11); // Gold accent line
  doc.setLineWidth(0.4);
  doc.line(margin, margin + 20.2, pageWidth - margin, margin + 20.2);

  // Title Box: BUKTI PEMBAYARAN SPP / KUITANSI
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(pageWidth - margin - 65, margin + 23, 65, 13, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70);
  doc.text('KUITANSI PEMBAYARAN SPP', pageWidth - margin - 61, margin + 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`No: ${payment.noKuitansi}`, pageWidth - margin - 61, margin + 32.5);

  // Left metadata
  let y = margin + 26;
  const labelX = margin + 2;
  const colonX = margin + 38;
  const valX = margin + 41;
  const rowHeight = 5.2;

  const renderRow = (label: string, val: string, isBold = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(label, labelX, y);
    doc.text(':', colonX, y);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(val, valX, y);
    y += rowHeight;
  };

  renderRow('Telah Diterima Dari', payment.namaWali || 'Orang Tua / Wali Siswa');
  renderRow('Nama Siswa', `${payment.siswaNama} (NIS: ${payment.nis})`, true);
  renderRow('Tingkat / Kelas', `${payment.kelas} - ${payment.jenjang}`);
  renderRow('Untuk Pembayaran', `SPP Bulan: ${payment.bulanList.join(', ')}`);
  renderRow('Metode Pembayaran', `${payment.metodePembayaran} ${payment.referensiBank ? `(${payment.referensiBank})` : ''}`);

  // Table of amounts
  y += 2;
  const tableTop = y;

  // Calculate items count to size table height
  let rowCount = 1; // SPP
  if (payment.nominalBiayaLain > 0) rowCount++;
  if (payment.nominalInfaqPembangunan && payment.nominalInfaqPembangunan > 0) rowCount++;
  if (payment.nominalInfaqWiz && payment.nominalInfaqWiz > 0) rowCount++;

  const tableHeight = 6 + (rowCount * 4.2);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin + 2, tableTop, pageWidth - (margin * 2) - 4, tableHeight, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Rincian Pos Pembayaran', margin + 6, tableTop + 4.5);
  doc.text('Jumlah', pageWidth - margin - 28, tableTop + 4.5);

  let currentY = tableTop + 8.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  // SPP row
  doc.text(`• SPP ${payment.bulanList.length} Bulan (${payment.bulanList.join(', ')})`, margin + 6, currentY);
  doc.text(formatRupiahDisplay(payment.totalSpp), pageWidth - margin - 28, currentY);
  currentY += 4.2;

  // Biaya lain row
  if (payment.nominalBiayaLain > 0) {
    doc.text('• Biaya Penunjang / Lainnya (Catering/Asrama/Kegiatan)', margin + 6, currentY);
    doc.text(formatRupiahDisplay(payment.nominalBiayaLain), pageWidth - margin - 28, currentY);
    currentY += 4.2;
  }

  // Infaq Pembangunan row
  if (payment.nominalInfaqPembangunan && payment.nominalInfaqPembangunan > 0) {
    doc.text(`• Infaq / Sedekah Pembangunan Sekolah (${payment.keteranganInfaqPembangunan || 'Sarana'})`, margin + 6, currentY);
    doc.text(formatRupiahDisplay(payment.nominalInfaqPembangunan), pageWidth - margin - 28, currentY);
    currentY += 4.2;
  }

  // Infaq WIZ row
  if (payment.nominalInfaqWiz && payment.nominalInfaqWiz > 0) {
    doc.text('• Infaq Wahdah Inspirasi Zakat (WIZ)', margin + 6, currentY);
    doc.text(formatRupiahDisplay(payment.nominalInfaqWiz), pageWidth - margin - 28, currentY);
    currentY += 4.2;
  }

  // Total Box
  y = tableTop + tableHeight + 2.5;
  doc.setFillColor(220, 252, 231); // emerald-100
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(margin + 2, y, 92, 12, 1, 1, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(21, 128, 61);
  doc.text('JUMLAH DIBAYAR:', margin + 6, y + 4.5);
  doc.setFontSize(11);
  doc.text(formatRupiahDisplay(payment.totalBayar), margin + 6, y + 9.5);

  // Terbilang
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const terbilangText = `Terbilang: "# ${terbilang(payment.totalBayar).trim()} Rupiah #"`;
  doc.text(terbilangText, margin + 2, y + 16.5);

  // Status Stamp on Center Bottom
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.roundedRect(102, y + 1, 34, 11, 2, 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105);
  doc.text('LUNAS / SAH', 105, y + 7.5);
  doc.setFontSize(6.5);
  doc.text('SISTEM SPP YPWI', 107, y + 10.5);

  // Signatures on Right Bottom
  const sigX = pageWidth - margin - 50;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Unaaha, ${payment.tanggalBayar}`, sigX, y + 2);
  doc.text('Penerima / Kasir Yayasan,', sigX, y + 6);

  // Signature line
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(payment.namaPenerima || settings.namaBendahara, sigX, y + 21);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Bendahara YPWI Konawe', sigX, y + 24.5);

  // Footer Note
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin + 2, pageHeight - margin - 3, pageWidth - margin - 2, pageHeight - margin - 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Dokumen kuitansi digital ini diterbitkan secara otomatis oleh Sistem SPP YPWI Konawe pada ${payment.tanggalBayar} ${payment.waktuBayar || ''}. Sah tanpa tanda tangan basah.`,
    margin + 2,
    pageHeight - margin
  );

  // Save the PDF
  const filename = `Kuitansi-SPP-${payment.nis}-${payment.noKuitansi.replace(/[\/\\]/g, '_')}.pdf`;
  doc.save(filename);
}
