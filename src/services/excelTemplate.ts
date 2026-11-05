import * as XLSX from 'xlsx';

export type TemplateCell = string | number;

/**
 * Mengunduh template resmi dalam format Excel (.xlsx) yang bisa langsung dibuka
 * di Microsoft Excel, WPS, atau Google Sheets.
 */
export function downloadExcelTemplate(
  fileName: string,
  sheetName: string,
  headers: string[],
  sampleRows: TemplateCell[][]
): void {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Lebarkan kolom agar judul dan contoh isi terbaca tanpa dipotong
  worksheet['!cols'] = headers.map((header, idx) => {
    const contoh = sampleRows[0]?.[idx];
    const panjangContoh = contoh !== undefined ? String(contoh).length : 0;
    return { wch: Math.min(Math.max(header.length + 2, panjangContoh + 2, 14), 45) };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

/**
 * Membaca file Excel (.xlsx / .xls) lalu mengubahnya menjadi teks CSV.
 * Dengan begitu jalur impor tetap sama dengan CSV sehingga kolom selalu cocok.
 */
export async function readSpreadsheetAsCsvText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return '';
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_csv(worksheet, { blankrows: false });
}

export function isSpreadsheetFile(file: File): boolean {
  return /\.(xlsx|xls|xlsm|xlsb)$/i.test(file.name);
}
