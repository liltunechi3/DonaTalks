'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { KprStatus, STATUS_LABELS, STATUS_ORDER } from '@/lib/kpr-types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BANK_LIST = ['BTN', 'BRI', 'BNI', 'Mandiri', 'BSI', 'BCA', 'CIMB Niaga', 'Permata', 'Maybank', 'Lainnya']
const TIPE_PROPERTI = ['Rumah Tapak', 'Apartemen', 'Ruko', 'Tanah', 'Lainnya']

type Field = {
  key: string
  label: string
  type?: string
  options?: string[]
  placeholder?: string
  prefix?: string
}

const SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: 'Data Diri Nasabah',
    fields: [
      { key: 'nama', label: 'Nama Lengkap *', placeholder: 'Nama sesuai KTP' },
      { key: 'nik', label: 'NIK', placeholder: '16 digit NIK' },
      { key: 'no_hp', label: 'No. HP / WA', placeholder: '08xxx' },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'nama@email.com' },
    ]
  },
  {
    title: 'Data Pekerjaan',
    fields: [
      { key: 'pekerjaan', label: 'Pekerjaan', placeholder: 'Karyawan Swasta / Wiraswasta / PNS...' },
      { key: 'nama_perusahaan', label: 'Nama Perusahaan', placeholder: 'PT. ...' },
      { key: 'penghasilan_bulanan', label: 'Penghasilan Bulanan', type: 'number', placeholder: '0', prefix: 'Rp' },
    ]
  },
  {
    title: 'Data Properti & KPR',
    fields: [
      { key: 'tipe_properti', label: 'Tipe Properti', options: TIPE_PROPERTI },
      { key: 'nama_proyek', label: 'Nama Proyek / Perumahan', placeholder: 'Perumahan ...' },
      { key: 'nama_developer', label: 'Nama Developer', placeholder: 'PT. Developer ...' },
      { key: 'nilai_properti', label: 'Harga Properti', type: 'number', placeholder: '0', prefix: 'Rp' },
      { key: 'nilai_kpr', label: 'Nilai KPR Diajukan', type: 'number', placeholder: '0', prefix: 'Rp' },
      { key: 'bank_tujuan', label: 'Bank Tujuan', options: BANK_LIST },
    ]
  },
  {
    title: 'Info Marketing',
    fields: [
      { key: 'nama_marketing', label: 'Nama Marketing PIC', placeholder: 'Nama marketing yang handle' },
      { key: 'status', label: 'Status Awal', options: STATUS_ORDER.map(s => s) },
      { key: 'tanggal_masuk', label: 'Tanggal Masuk Berkas', type: 'date' },
    ]
  },
]

export default function NasabahBaruPage() {
  const router = useRouter()
  const [form, setForm] = useState<Record<string, string>>({
    status: 'berkas_masuk',
    tanggal_masuk: new Date().toISOString().split('T')[0],
  })
  const [background, setBackground] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nama?.trim()) { setError('Nama nasabah wajib diisi.'); return }
    setSaving(true); setError('')

    const { data: session } = await supabase.auth.getSession()
    const userId = session?.session?.user?.id

    const payload = {
      ...form,
      user_id: userId,
      background_notes: background,
      penghasilan_bulanan: form.penghasilan_bulanan ? parseInt(form.penghasilan_bulanan) : null,
      nilai_properti: form.nilai_properti ? parseInt(form.nilai_properti) : null,
      nilai_kpr: form.nilai_kpr ? parseInt(form.nilai_kpr) : null,
    }

    const { data, error: err } = await supabase.from('kpr_nasabah').insert(payload).select().single()
    if (err || !data) { setError('Gagal menyimpan data.'); setSaving(false); return }

    // Insert default dokumen
    await supabase.rpc('insert_default_dokumen', { p_nasabah_id: data.id })

    // Log status awal
    await supabase.from('kpr_status_log').insert({
      nasabah_id: data.id,
      status_baru: data.status,
      catatan: 'Berkas baru masuk',
      nama_user: form.nama_marketing || 'System',
    })

    router.push(`/kpr/nasabah/${data.id}`)
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 14, padding: 0, marginBottom: 8 }}>← Kembali</button>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E3A5F', margin: 0 }}>Tambah Nasabah Baru</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {SECTIONS.map(section => (
          <div key={section.title} style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 16, border: '1px solid #E5E7EB' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', margin: '0 0 20px', paddingBottom: 12, borderBottom: '1px solid #F3F4F6' }}>{section.title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {section.fields.map(f => (
                <div key={f.key} style={{ gridColumn: ['background_notes', 'nama'].includes(f.key) ? 'span 2' : 'span 1' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{f.label}</label>
                  {f.options ? (
                    <select value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 14, background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                      <option value="">-- Pilih --</option>
                      {f.options.map(o => (
                        <option key={o} value={o}>{f.key === 'status' ? STATUS_LABELS[o as KprStatus] : o}</option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #D1D5DB', borderRadius: 8, overflow: 'hidden' }}>
                      {f.prefix && <span style={{ padding: '9px 12px', background: '#F9FAFB', fontSize: 14, color: '#6B7280', borderRight: '1px solid #E5E7EB' }}>{f.prefix}</span>}
                      <input
                        type={f.type || 'text'}
                        value={form[f.key] || ''}
                        onChange={e => set(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        style={{ flex: 1, padding: '9px 12px', border: 'none', fontSize: 14, outline: 'none' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Background notes */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 16, border: '1px solid #E5E7EB' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', margin: '0 0 16px' }}>Background & Catatan Awal</h2>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
            Catatan background nasabah (riwayat kredit, karakteristik, dll)
          </label>
          <textarea
            value={background} onChange={e => setBackground(e.target.value)}
            rows={5} placeholder="Contoh: Nasabah PNS golongan III, tidak ada kredit macet, sudah punya KPR sebelumnya di BTN lunas 2020, istri kerja swasta..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }}
          />
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', color: '#DC2626', marginBottom: 16 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" disabled={saving}
            style={{ padding: '12px 32px', background: saving ? '#93C5FD' : '#1E40AF', color: 'white', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Menyimpan...' : 'Simpan Nasabah'}
          </button>
          <button type="button" onClick={() => router.back()}
            style={{ padding: '12px 24px', background: 'white', color: '#6B7280', border: '1.5px solid #D1D5DB', borderRadius: 8, fontSize: 15, cursor: 'pointer' }}>
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}
