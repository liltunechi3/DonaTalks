'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter, useParams } from 'next/navigation'
import { KprNasabah, KprNote, KprDokumen, KprStatusLog, KprStatus, STATUS_LABELS, STATUS_COLORS, STATUS_ORDER, formatRupiah, formatTanggal } from '@/lib/kpr-types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TABS = ['Info', 'Dokumen', 'Notes', 'Riwayat']
const BANK_LIST = ['BTN', 'BRI', 'BNI', 'Mandiri', 'BSI', 'BCA', 'CIMB Niaga', 'Permata', 'Maybank', 'Lainnya']
const TIPE_PROPERTI = ['Rumah Tapak', 'Apartemen', 'Ruko', 'Tanah', 'Lainnya']

export default function NasabahDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [nasabah, setNasabah] = useState<KprNasabah | null>(null)
  const [dokumen, setDokumen] = useState<KprDokumen[]>([])
  const [notes, setNotes] = useState<KprNote[]>([])
  const [logs, setLogs] = useState<KprStatusLog[]>([])
  const [tab, setTab] = useState('Info')
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [noteAuthor, setNoteAuthor] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<Partial<KprNasabah>>({})
  const [changingStatus, setChangingStatus] = useState(false)
  const [newStatus, setNewStatus] = useState<KprStatus | ''>('')
  const [statusNote, setStatusNote] = useState('')
  const [userEmail, setUserEmail] = useState('')

  const fetchAll = useCallback(async () => {
    const [n, d, no, l, sess] = await Promise.all([
      supabase.from('kpr_nasabah').select('*').eq('id', id).single(),
      supabase.from('kpr_dokumen').select('*').eq('nasabah_id', id).order('nama_dokumen'),
      supabase.from('kpr_notes').select('*').eq('nasabah_id', id).order('created_at', { ascending: false }),
      supabase.from('kpr_status_log').select('*').eq('nasabah_id', id).order('created_at', { ascending: false }),
      supabase.auth.getSession(),
    ])
    setNasabah(n.data)
    setEditForm(n.data || {})
    setDokumen(d.data || [])
    setNotes(no.data || [])
    setLogs(l.data || [])
    setUserEmail(sess.data?.session?.user?.email || '')
    setLoading(false)
  }, [id])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleSaveNote() {
    if (!noteText.trim() || !noteAuthor.trim()) return
    setSavingNote(true)
    await supabase.from('kpr_notes').insert({ nasabah_id: id, isi: noteText, nama_penulis: noteAuthor })
    setNoteText(''); setSavingNote(false)
    const { data } = await supabase.from('kpr_notes').select('*').eq('nasabah_id', id).order('created_at', { ascending: false })
    setNotes(data || [])
  }

  async function handleDokumenToggle(dok: KprDokumen) {
    const next = dok.status === 'belum' ? 'sudah' : dok.status === 'sudah' ? 'tidak_perlu' : 'belum'
    await supabase.from('kpr_dokumen').update({ status: next, updated_at: new Date().toISOString() }).eq('id', dok.id)
    setDokumen(d => d.map(x => x.id === dok.id ? { ...x, status: next } : x))
  }

  async function handleSaveEdit() {
    if (!nasabah) return
    const payload: Partial<KprNasabah> = {
      nama: editForm.nama,
      nik: editForm.nik,
      no_hp: editForm.no_hp,
      email: editForm.email,
      pekerjaan: editForm.pekerjaan,
      nama_perusahaan: editForm.nama_perusahaan,
      penghasilan_bulanan: editForm.penghasilan_bulanan,
      nama_marketing: editForm.nama_marketing,
      tipe_properti: editForm.tipe_properti,
      nilai_properti: editForm.nilai_properti,
      nilai_kpr: editForm.nilai_kpr,
      nama_developer: editForm.nama_developer,
      nama_proyek: editForm.nama_proyek,
      bank_tujuan: editForm.bank_tujuan,
      background_notes: editForm.background_notes,
      tanggal_pengajuan_bank: editForm.tanggal_pengajuan_bank,
      tanggal_approval: editForm.tanggal_approval,
      tanggal_akad: editForm.tanggal_akad,
      tanggal_ditolak: editForm.tanggal_ditolak,
      alasan_ditolak: editForm.alasan_ditolak,
    }
    await supabase.from('kpr_nasabah').update(payload).eq('id', id)
    setEditMode(false)
    fetchAll()
  }

  async function handleChangeStatus() {
    if (!newStatus || !nasabah) return
    setChangingStatus(true)
    await supabase.from('kpr_nasabah').update({ status: newStatus }).eq('id', id)
    await supabase.from('kpr_status_log').insert({
      nasabah_id: id,
      status_lama: nasabah.status,
      status_baru: newStatus,
      catatan: statusNote,
      nama_user: userEmail,
    })
    setNewStatus(''); setStatusNote(''); setChangingStatus(false)
    fetchAll()
  }

  if (loading) return <div style={{ padding: 40, color: '#9CA3AF' }}>Memuat...</div>
  if (!nasabah) return <div style={{ padding: 40, color: '#DC2626' }}>Data tidak ditemukan.</div>

  const col = STATUS_COLORS[nasabah.status]
  const ef = editForm

  return (
    <div style={{ padding: '32px 36px', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ marginBottom: 8 }}>
        <button onClick={() => router.push('/kpr/nasabah')} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: 14, padding: 0 }}>← Kembali ke Daftar</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1E3A5F', margin: 0 }}>{nasabah.nama}</h1>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <span style={{ background: col.bg, color: col.text, border: `1.5px solid ${col.border}`, padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
              {STATUS_LABELS[nasabah.status]}
            </span>
            {nasabah.nama_marketing && <span style={{ color: '#6B7280', fontSize: 13 }}>Marketing: {nasabah.nama_marketing}</span>}
            <span style={{ color: '#9CA3AF', fontSize: 12 }}>Masuk: {formatTanggal(nasabah.tanggal_masuk)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setEditMode(!editMode)}
            style={{ padding: '8px 16px', background: editMode ? '#F3F4F6' : 'white', border: '1.5px solid #D1D5DB', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#374151' }}>
            {editMode ? 'Batal Edit' : 'Edit Data'}
          </button>
        </div>
      </div>

      {/* Change status card */}
      <div style={{ background: '#F0F4FF', borderRadius: 12, padding: '16px 20px', marginBottom: 20, border: '1px solid #BFDBFE' }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#1E40AF' }}>Pindah Status Pipeline</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <select value={newStatus} onChange={e => setNewStatus(e.target.value as KprStatus)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #BFDBFE', fontSize: 13, background: 'white', outline: 'none' }}>
            <option value="">-- Pilih status baru --</option>
            {STATUS_ORDER.filter(s => s !== nasabah.status).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <input value={statusNote} onChange={e => setStatusNote(e.target.value)}
            placeholder="Catatan perubahan (opsional)"
            style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #BFDBFE', fontSize: 13, outline: 'none' }}
          />
          <button onClick={handleChangeStatus} disabled={!newStatus || changingStatus}
            style={{ padding: '8px 20px', background: newStatus ? '#1E40AF' : '#93C5FD', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: newStatus ? 'pointer' : 'not-allowed' }}>
            {changingStatus ? '...' : 'Update'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #E5E7EB' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', fontSize: 14, fontWeight: tab === t ? 700 : 500,
              color: tab === t ? '#1E40AF' : '#6B7280', cursor: 'pointer',
              borderBottom: tab === t ? '2px solid #1E40AF' : '2px solid transparent', marginBottom: -2,
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* TAB: Info */}
      {tab === 'Info' && (
        <div>
          {editMode ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { key: 'nama', label: 'Nama *' }, { key: 'nik', label: 'NIK' },
                  { key: 'no_hp', label: 'No HP' }, { key: 'email', label: 'Email', type: 'email' },
                  { key: 'pekerjaan', label: 'Pekerjaan' }, { key: 'nama_perusahaan', label: 'Nama Perusahaan' },
                  { key: 'penghasilan_bulanan', label: 'Penghasilan Bulanan', type: 'number' },
                  { key: 'nama_marketing', label: 'Nama Marketing' },
                  { key: 'nama_proyek', label: 'Nama Proyek' }, { key: 'nama_developer', label: 'Developer' },
                  { key: 'nilai_properti', label: 'Nilai Properti', type: 'number' },
                  { key: 'nilai_kpr', label: 'Nilai KPR', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{f.label}</label>
                    <input type={f.type || 'text'} value={(ef as Record<string, string | number | undefined>)[f.key] as string || ''}
                      onChange={e => setEditForm(x => ({ ...x, [f.key]: f.type === 'number' ? parseInt(e.target.value) || undefined : e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Bank Tujuan</label>
                  <select value={ef.bank_tujuan || ''} onChange={e => setEditForm(x => ({ ...x, bank_tujuan: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 13, background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="">-- Pilih Bank --</option>
                    {BANK_LIST.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Tipe Properti</label>
                  <select value={ef.tipe_properti || ''} onChange={e => setEditForm(x => ({ ...x, tipe_properti: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 13, background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                    <option value="">-- Pilih Tipe --</option>
                    {TIPE_PROPERTI.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {(['tanggal_pengajuan_bank', 'tanggal_approval', 'tanggal_akad', 'tanggal_ditolak'] as (keyof KprNasabah)[]).map(k => (
                  <div key={k as string}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                      {k === 'tanggal_pengajuan_bank' ? 'Tgl Pengajuan Bank' : k === 'tanggal_approval' ? 'Tgl Approval' : k === 'tanggal_akad' ? 'Tgl Akad' : 'Tgl Ditolak'}
                    </label>
                    <input type="date" value={(ef[k] as string) || ''}
                      onChange={e => setEditForm(x => ({ ...x, [k]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Background Notes</label>
                <textarea value={ef.background_notes || ''} onChange={e => setEditForm(x => ({ ...x, background_notes: e.target.value }))} rows={4}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }}
                />
              </div>
              {nasabah.status === 'ditolak' && (
                <div style={{ marginTop: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Alasan Ditolak</label>
                  <input value={ef.alasan_ditolak || ''} onChange={e => setEditForm(x => ({ ...x, alasan_ditolak: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={handleSaveEdit} style={{ padding: '10px 24px', background: '#1E40AF', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Simpan</button>
                <button onClick={() => setEditMode(false)} style={{ padding: '10px 20px', background: 'white', border: '1.5px solid #D1D5DB', borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#6B7280' }}>Batal</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { title: 'Data Diri', rows: [
                  ['NIK', nasabah.nik], ['No. HP', nasabah.no_hp], ['Email', nasabah.email],
                  ['Pekerjaan', nasabah.pekerjaan], ['Perusahaan', nasabah.nama_perusahaan],
                  ['Penghasilan', formatRupiah(nasabah.penghasilan_bulanan)],
                ]},
                { title: 'Properti & KPR', rows: [
                  ['Tipe Properti', nasabah.tipe_properti], ['Proyek', nasabah.nama_proyek],
                  ['Developer', nasabah.nama_developer], ['Harga Properti', formatRupiah(nasabah.nilai_properti)],
                  ['Nilai KPR', formatRupiah(nasabah.nilai_kpr)], ['Bank Tujuan', nasabah.bank_tujuan],
                ]},
                { title: 'Timeline', rows: [
                  ['Tgl Masuk Berkas', formatTanggal(nasabah.tanggal_masuk)],
                  ['Tgl Pengajuan Bank', formatTanggal(nasabah.tanggal_pengajuan_bank)],
                  ['Tgl Approval', formatTanggal(nasabah.tanggal_approval)],
                  ['Tgl Akad', formatTanggal(nasabah.tanggal_akad)],
                  ['Tgl Ditolak', formatTanggal(nasabah.tanggal_ditolak)],
                  ['Alasan Ditolak', nasabah.alasan_ditolak],
                ]},
              ].map(card => (
                <div key={card.title} style={{ background: 'white', borderRadius: 12, padding: '20px 24px', border: '1px solid #E5E7EB' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F', margin: '0 0 16px' }}>{card.title}</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {card.rows.map(([label, val]) => (
                        <tr key={label} style={{ borderBottom: '1px solid #F9FAFB' }}>
                          <td style={{ padding: '7px 0', fontSize: 12, color: '#9CA3AF', width: 140 }}>{label}</td>
                          <td style={{ padding: '7px 0', fontSize: 13, color: '#374151', fontWeight: val && val !== '-' ? 500 : 400 }}>{val || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {nasabah.background_notes && (
                <div style={{ background: '#FFFBEB', borderRadius: 12, padding: '20px 24px', border: '1px solid #FDE68A', gridColumn: 'span 2' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#92400E', margin: '0 0 10px' }}>Background Nasabah</h3>
                  <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{nasabah.background_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: Dokumen */}
      {tab === 'Dokumen' && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1E3A5F' }}>
              Checklist Dokumen ({dokumen.filter(d => d.status === 'sudah').length}/{dokumen.filter(d => d.status !== 'tidak_perlu').length} lengkap)
            </span>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              {[['belum', '#EFF6FF', '#1D4ED8'], ['sudah', '#F0FDF4', '#15803D'], ['tidak_perlu', '#F9FAFB', '#6B7280']].map(([s, bg, c]) => (
                <span key={s} style={{ background: bg, color: c, padding: '3px 10px', borderRadius: 12, fontWeight: 600 }}>
                  {s === 'belum' ? 'Belum' : s === 'sudah' ? 'Sudah' : 'Tidak Perlu'}
                </span>
              ))}
            </div>
          </div>
          {dokumen.map(dok => (
            <div key={dok.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid #F9FAFB', gap: 12 }}>
              <button onClick={() => handleDokumenToggle(dok)}
                style={{
                  width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', flexShrink: 0, fontSize: 16,
                  background: dok.status === 'sudah' ? '#15803D' : dok.status === 'tidak_perlu' ? '#9CA3AF' : '#E5E7EB',
                  color: dok.status !== 'belum' ? 'white' : 'transparent',
                }}>
                {dok.status === 'sudah' ? '✓' : dok.status === 'tidak_perlu' ? '−' : ' '}
              </button>
              <span style={{
                flex: 1, fontSize: 14,
                color: dok.status === 'sudah' ? '#15803D' : dok.status === 'tidak_perlu' ? '#9CA3AF' : '#374151',
                textDecoration: dok.status === 'tidak_perlu' ? 'line-through' : 'none',
              }}>{dok.nama_dokumen}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                {dok.status === 'belum' ? 'Klik untuk tandai' : dok.status === 'sudah' ? 'Lengkap' : 'Tidak perlu'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Notes */}
      {tab === 'Notes' && (
        <div>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #E5E7EB', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1E3A5F', margin: '0 0 16px' }}>Tambah Catatan</h3>
            <input
              value={noteAuthor} onChange={e => setNoteAuthor(e.target.value)}
              placeholder="Nama Anda (marketing)"
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
            />
            <textarea
              value={noteText} onChange={e => setNoteText(e.target.value)} rows={4}
              placeholder="Tulis catatan: hasil komunikasi, info tambahan, update terbaru..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 13, outline: 'none', resize: 'vertical', marginBottom: 10, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }}
            />
            <button onClick={handleSaveNote} disabled={savingNote || !noteText.trim() || !noteAuthor.trim()}
              style={{ padding: '9px 20px', background: noteText.trim() && noteAuthor.trim() ? '#1E40AF' : '#93C5FD', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              {savingNote ? 'Menyimpan...' : 'Simpan Catatan'}
            </button>
          </div>

          {notes.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Belum ada catatan.</p>
          ) : notes.map(n => (
            <div key={n.id} style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #E5E7EB', marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#1E3A5F' }}>{n.nama_penulis}</span>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {new Date(n.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{n.isi}</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Riwayat */}
      {tab === 'Riwayat' && (
        <div>
          {logs.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: 14 }}>Belum ada riwayat perubahan status.</p>
          ) : (
            <div style={{ position: 'relative' }}>
              {logs.map((log, i) => {
                const col = STATUS_COLORS[log.status_baru]
                return (
                  <div key={log.id} style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: col.bg, border: `2px solid ${col.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.text }} />
                      </div>
                      {i < logs.length - 1 && <div style={{ flex: 1, width: 2, background: '#E5E7EB', marginTop: 4 }} />}
                    </div>
                    <div style={{ flex: 1, background: 'white', borderRadius: 10, padding: '14px 18px', border: '1px solid #E5E7EB', marginBottom: 4 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {log.status_lama && (
                            <>
                              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{STATUS_LABELS[log.status_lama]}</span>
                              <span style={{ color: '#D1D5DB' }}>→</span>
                            </>
                          )}
                          <span style={{ background: col.bg, color: col.text, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{STATUS_LABELS[log.status_baru]}</span>
                        </div>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                          {new Date(log.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {log.catatan && <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{log.catatan}</p>}
                      {log.nama_user && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9CA3AF' }}>oleh {log.nama_user}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
