'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { KprNasabah, KprStatus, STATUS_LABELS, STATUS_COLORS, STATUS_ORDER, formatRupiah } from '@/lib/kpr-types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PIPELINE_STAGES: KprStatus[] = ['berkas_masuk', 'verifikasi_internal', 'pengajuan_bank', 'bi_checking', 'penilaian_agunan', 'approval', 'akad']

export default function DashboardPage() {
  const [nasabah, setNasabah] = useState<KprNasabah[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('kpr_nasabah').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setNasabah(data || []); setLoading(false) })
  }, [])

  const countByStatus = (s: KprStatus) => nasabah.filter(n => n.status === s).length
  const totalAktif = nasabah.filter(n => !['ditolak', 'batal'].includes(n.status)).length
  const totalAkad = countByStatus('akad')
  const totalDitolak = countByStatus('ditolak')
  const totalNilaiKpr = nasabah.filter(n => n.status === 'akad').reduce((s, n) => s + (n.nilai_kpr || 0), 0)
  const recentNasabah = nasabah.slice(0, 5)

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1200 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E3A5F', margin: 0 }}>Dashboard</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>Overview pipeline KPR tim marketing</p>
        </div>
        <Link href="/kpr/nasabah/baru" style={{ padding: '10px 20px', background: '#1E40AF', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14 }}>
          + Tambah Nasabah
        </Link>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Aktif', value: loading ? '...' : totalAktif, color: '#1E40AF', bg: '#EFF6FF', icon: '📋' },
          { label: 'Berhasil Akad', value: loading ? '...' : totalAkad, color: '#15803D', bg: '#F0FDF4', icon: '✅' },
          { label: 'Ditolak', value: loading ? '...' : totalDitolak, color: '#DC2626', bg: '#FEF2F2', icon: '❌' },
          { label: 'Total KPR Akad', value: loading ? '...' : formatRupiah(totalNilaiKpr), color: '#92400E', bg: '#FFFBEB', icon: '💰' },
        ].map(card => (
          <div key={card.label} style={{ background: card.bg, borderRadius: 12, padding: '20px 24px', border: `1px solid ${card.color}20` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{card.label}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color: card.color, margin: '4px 0 0' }}>{card.value}</p>
              </div>
              <span style={{ fontSize: 24 }}>{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Funnel */}
      <div style={{ background: 'white', borderRadius: 12, padding: '24px', marginBottom: 24, border: '1px solid #E5E7EB' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E3A5F', margin: '0 0 20px' }}>Pipeline Status</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {PIPELINE_STAGES.map(s => {
            const count = countByStatus(s)
            const col = STATUS_COLORS[s]
            return (
              <Link key={s} href={`/kpr/nasabah?status=${s}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: col.bg, border: `1.5px solid ${col.border}`, borderRadius: 10, padding: '16px 12px', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.1s' }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: col.text }}>{loading ? '-' : count}</div>
                  <div style={{ fontSize: 11, color: col.text, marginTop: 4, fontWeight: 600, lineHeight: 1.3 }}>{STATUS_LABELS[s]}</div>
                </div>
              </Link>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
          {(['ditolak', 'batal'] as KprStatus[]).map(s => {
            const count = countByStatus(s)
            const col = STATUS_COLORS[s]
            return (
              <Link key={s} href={`/kpr/nasabah?status=${s}`} style={{ textDecoration: 'none' }}>
                <div style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 8, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: col.text }}>{loading ? '-' : count}</span>
                  <span style={{ fontSize: 12, color: col.text }}>{STATUS_LABELS[s]}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent nasabah */}
      <div style={{ background: 'white', borderRadius: 12, padding: '24px', border: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E3A5F', margin: 0 }}>Nasabah Terbaru</h2>
          <Link href="/kpr/nasabah" style={{ fontSize: 13, color: '#1E40AF', textDecoration: 'none', fontWeight: 600 }}>Lihat Semua →</Link>
        </div>
        {loading ? (
          <p style={{ color: '#9CA3AF', fontSize: 14 }}>Memuat...</p>
        ) : recentNasabah.length === 0 ? (
          <p style={{ color: '#9CA3AF', fontSize: 14 }}>Belum ada data nasabah.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                {['Nama', 'Bank', 'Nilai KPR', 'Marketing', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentNasabah.map(n => {
                const col = STATUS_COLORS[n.status]
                return (
                  <tr key={n.id} style={{ borderBottom: '1px solid #F9FAFB' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <Link href={`/kpr/nasabah/${n.id}`} style={{ color: '#1E3A5F', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>{n.nama}</Link>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#6B7280' }}>{n.bank_tujuan || '-'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#374151' }}>{formatRupiah(n.nilai_kpr)}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: '#6B7280' }}>{n.nama_marketing || '-'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                        {STATUS_LABELS[n.status]}
                      </span>
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
