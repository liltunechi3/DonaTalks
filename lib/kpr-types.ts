export type KprStatus =
  | 'berkas_masuk'
  | 'verifikasi_internal'
  | 'pengajuan_bank'
  | 'bi_checking'
  | 'penilaian_agunan'
  | 'approval'
  | 'akad'
  | 'ditolak'
  | 'batal'

export const STATUS_LABELS: Record<KprStatus, string> = {
  berkas_masuk: 'Berkas Masuk',
  verifikasi_internal: 'Verifikasi Internal',
  pengajuan_bank: 'Pengajuan Bank',
  bi_checking: 'BI/SLIK Checking',
  penilaian_agunan: 'Penilaian Agunan',
  approval: 'Approval',
  akad: 'Akad',
  ditolak: 'Ditolak',
  batal: 'Batal',
}

export const STATUS_COLORS: Record<KprStatus, { bg: string; text: string; border: string }> = {
  berkas_masuk:       { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  verifikasi_internal:{ bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  pengajuan_bank:     { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
  bi_checking:        { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  penilaian_agunan:   { bg: '#ECFEFF', text: '#0E7490', border: '#A5F3FC' },
  approval:           { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  akad:               { bg: '#14532D', text: '#FFFFFF', border: '#166534' },
  ditolak:            { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  batal:              { bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' },
}

export const STATUS_ORDER: KprStatus[] = [
  'berkas_masuk',
  'verifikasi_internal',
  'pengajuan_bank',
  'bi_checking',
  'penilaian_agunan',
  'approval',
  'akad',
  'ditolak',
  'batal',
]

export interface KprNasabah {
  id: string
  nama: string
  nik?: string
  no_hp?: string
  email?: string
  pekerjaan?: string
  nama_perusahaan?: string
  penghasilan_bulanan?: number
  status: KprStatus
  nama_marketing?: string
  user_id?: string
  tipe_properti?: string
  nilai_properti?: number
  nilai_kpr?: number
  nama_developer?: string
  nama_proyek?: string
  bank_tujuan?: string
  tanggal_masuk: string
  tanggal_pengajuan_bank?: string
  tanggal_approval?: string
  tanggal_akad?: string
  tanggal_ditolak?: string
  alasan_ditolak?: string
  background_notes?: string
  created_at: string
  updated_at: string
}

export interface KprNote {
  id: string
  nasabah_id: string
  user_id?: string
  nama_penulis: string
  isi: string
  created_at: string
}

export interface KprDokumen {
  id: string
  nasabah_id: string
  nama_dokumen: string
  status: 'belum' | 'sudah' | 'tidak_perlu'
  keterangan?: string
  updated_at: string
}

export interface KprStatusLog {
  id: string
  nasabah_id: string
  status_lama?: KprStatus
  status_baru: KprStatus
  catatan?: string
  nama_user?: string
  created_at: string
}

export function formatRupiah(value?: number | null): string {
  if (!value) return '-'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value)
}

export function formatTanggal(dateStr?: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
