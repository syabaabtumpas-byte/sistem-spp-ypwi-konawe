export type JenjangPendidikan = 'RA / TK' | 'SDIT' | 'SMPIT' | 'SMAIT / Tahfidz';

export type StatusSiswa = 'Aktif' | 'Cuti' | 'Pindah' | 'Lulus';

export interface Siswa {
  id: string;
  nis: string;
  nisn: string;
  nama: string;
  jenisKelamin: 'L' | 'P';
  jenjang: JenjangPendidikan;
  kelas: string;
  tahunAjaran: string;
  namaWali: string;
  hubunganWali: 'Ayah' | 'Ibu' | 'Wali';
  noWa: string;
  alamat: string;
  sppBulanan: number;
  biayaLain: number;
  keteranganBiayaLain?: string;
  status: StatusSiswa;
  tanggalMasuk: string;
}

export type BulanNama = 
  | 'Juli' 
  | 'Agustus' 
  | 'September' 
  | 'Oktober' 
  | 'November' 
  | 'Desember' 
  | 'Januari' 
  | 'Februari' 
  | 'Maret' 
  | 'April' 
  | 'Mei' 
  | 'Juni';

export interface ItemTagihanBulan {
  bulan: BulanNama;
  tahun: number;
  label: string; // e.g. "Juli 2024"
  nominal: number;
  biayaLain: number;
  status: 'LUNAS' | 'BELUM_BAYAR' | 'TERLEWAT';
  pembayaranId?: string;
  tanggalBayar?: string;
}

export type MetodePembayaran = 
  | 'Tunai Kasir' 
  | 'Transfer BSI' 
  | 'Transfer BRI' 
  | 'QRIS Yayasan' 
  | 'Bank Muamalat';

export interface Pembayaran {
  id: string;
  noKuitansi: string;
  siswaId: string;
  siswaNama: string;
  nis: string;
  jenjang: JenjangPendidikan;
  kelas: string;
  namaWali: string;
  noWa: string;
  tahunAjaran: string;
  bulanList: string[]; // e.g. ['Juli 2024', 'Agustus 2024']
  nominalSppPerBulan: number;
  totalSpp: number;
  nominalBiayaLain: number;
  nominalInfaqPembangunan?: number;
  nominalInfaqWiz?: number;
  keteranganInfaqPembangunan?: string;
  totalBayar: number;
  tanggalBayar: string; // YYYY-MM-DD
  waktuBayar: string; // HH:mm
  metodePembayaran: MetodePembayaran;
  referensiBank?: string;
  namaPenerima: string;
  catatan?: string;
  statusKuitansi: 'Resmi' | 'Dibatalkan';
  waStatus: 'Terkirim' | 'Pending' | 'Belum Dikirim';
  waSentAt?: string;
}

export interface WhatsAppLog {
  id: string;
  timestamp: string;
  tipe: 'TAGIHAN_PENGINGAT' | 'KONFIRMASI_PEMBAYARAN' | 'BROADCAST_INFORMASI';
  siswaId: string;
  siswaNama: string;
  noWaTujuan: string;
  namaPenerima: string;
  pesan: string;
  status: 'Terkirim' | 'Pending' | 'Gagal';
  metodePengiriman: 'Direct WhatsApp' | 'Gateway API (Otomatis)';
  kuitansiId?: string;
}

export interface RekeningBank {
  id: string;
  bank: string;
  nomorRekening: string;
  atasNama: string;
  isUtama: boolean;
}

export interface UnitSekolahConfig {
  id: JenjangPendidikan;
  nama: string;
  namaLengkap: string;
  logoUrl?: string;
  kepalaSekolah?: string;
  sppStandar: number;
}

export type UserRole = 'ADMIN' | 'BENDAHARA' | 'KASIR' | 'KETUA_YAYASAN' | 'PENGAWAS';

export type UserStatus = 'AKTIF' | 'MENUNGGU_PERSETUJUAN' | 'NONAKTIF';

export interface AppUser {
  id: string;
  username: string;
  namaLengkap: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  noWa?: string;
  fotoUrl?: string;
  terakhirLogin?: string;
  disetujuiOleh?: string;
  tanggalDibuat: string;
}

export interface FoundationSettings {
  namaYayasan: string;
  namaSingkat: string;
  alamat: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  kodePos: string;
  noTelp: string;
  email: string;
  nomorWaYayasan: string;
  namaKetuaYayasan: string;
  namaBendahara: string;
  daftarSekolah: UnitSekolahConfig[];
  rekeningList: RekeningBank[];
  tglJatuhTempoSetiapBulan: number;
  logoUrl: string;
  logoWizUrl?: string;
  logoPembangunanUrl?: string;
  waGatewayConfig: {
    provider: 'DIRECT' | 'FONNTE' | 'WABLAS' | 'CUSTOM_API';
    apiKey: string;
    senderNumber: string;
    autoSendOnPayment: boolean;
    autoSendReminderDay: number;
    simulatedMode: boolean;
  };
  templatePesanTagihan: string;
  templatePesanLunas: string;
}

