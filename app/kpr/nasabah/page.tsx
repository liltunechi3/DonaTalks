'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { KprNasabah, KprStatus, STATUS_LABELS, STATUS_COLORS, STATUS_ORDER, formatRupiah, formatTanggal } from '@/lib/kpr-types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function NasabahListPage() {
  const searchParams = useSearchParams()
  const [nasabah, setNasabah] = useState<KprNasabah[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<KprStatus | ''>(
    (searchParams.get('status') as KprStatus) || ''
  )
  const [filterMarketing, setFilterMarketing] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('kpr_nasabah').select('*').order('created_at', { ascending: false })
    if (filterStatus) query = query.eq('status', filterStatus)
    if (filterMarketing) query = query.ilike('nama_marketing', `%${filterMarketing}%`)
    const { data } = await query
    setNasabah(data || [])
    setLoading(false)
  }, [filterStatus, filterMarketing])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = nasabah.filter(n =>
    !search || n.nama.toLowerCase().includes(search.toLowerCase()) ||
    (n.no_hp && n.no_hp.includes(search)) ||
    (n.nik && n.nik.includes(search))
  )

  return (
    <div style={{ padding: '32px 36px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E3A5F', margin: 0 }}>Data Nasabah</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>{nasabah.length} nasabah total</p>
        </div>
        <Link href="/kpr/nasabah/baru" style={{ padding: '10px 20px', background: '#1E40AF', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
          + Nasabah Baru
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, NIK, no HP..."
          style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 14, width: 240, outline: 'none' }}
        />
        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value as KprStatus | '')}
          style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 14, background: 'white', outline: 'none' }}
        >
          <option value="">Semua Status</option>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <input
          value={filterMarketing} onChange={e => setFilterMarketing(e.target.value)}
          placeholder="Filter marketing..."
          style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid #D1D5DB', fontSize: 14, width: 180, outline: 'none' }}
        />
        {(filterStatus || filterMarketing || search) && (
          <button onClick={() => { setSearch(''); setFilterStatus(''); setFilterMarketing('') }}
            style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid #D1D5DB', background: 'white', fontSize: 13, cursor: 'pointer', color: '#6B7280' }}>
            Reset
          </button>
        )}
      </div>

      {/* Status pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUS_ORDER.map(s => {
          const col = STATUS_COLORS[s]
          const active = filterStatus === s
          const count = nasabah.filter(n => n.status === s).length
          return (
            <button key={s} onClick={() => setFilterStatus(active ? '' : s)}
              style={{
                padding: '4px 12px', borderRadius: 20, border: `1.5px solid ${active ? col.text : col.border}`,
                background: active ? col.text : col.bg, color: active ? 'white' : col.text,
                fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}>
              {STATUS_LABELS[s]} ({count})
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 32, color: '#9CA3AF', textAlign: 'center' }}>Memuat data...</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: 32, color: '#9CA3AF', textAlign: 'center' }}>Tidak ada data.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                {['Nama Nasabah', 'Kontak', 'Proyek / Bank', 'Nilai KPR', 'Marketing', 'Tgl Masuk', 'Status', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(n => {
                const col = STATUS_COLORS[n.status]
                return (
                  <tr key={n.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/kpr/nasabah/${n.id}`} style={{ color: '#1E3A5F', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>{n.nama}</Link>
                      {n.nik && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>NIK: {n.nik}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B7280' }}>
                      {n.no_hp && <div>{n.no_hp}</div>}
                      {n.email && <div style={{ fontSize: 11 }}>{n.email}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151' }}>
                      {n.nama_proyek && <div style={{ fontWeight: 500 }}>{n.nama_proyek}</div>}
                      {n.bank_tujuan && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{n.bank_tujuan}</div>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', fontWeight: 500 }}>{formatRupiah(n.nilai_kpr)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B7280' }}>{n.nama_marketing || '-'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#9CA3AF' }}>{formatTanggal(n.tanggal_masuk)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {STATUS_LABELS[n.status]}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/kpr/nasabah/${n.id}`} style={{ fontSize: 13, color: '#1E40AF', textDecoration: 'none' }}>Detail →</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
