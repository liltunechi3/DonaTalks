'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface UserRole {
  id: string
  user_id: string
  role: 'admin' | 'marketing'
  nama: string
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) { router.push('/kpr/login'); return }

      const { data: myRole } = await supabase
        .from('kpr_user_roles')
        .select('role')
        .eq('user_id', session.session.user.id)
        .single()

      if (myRole?.role !== 'admin') {
        router.push('/kpr/dashboard')
        return
      }
      setIsAdmin(true)

      const { data } = await supabase
        .from('kpr_user_roles')
        .select('*')
        .order('created_at')
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  async function handleChangeRole(userId: string, newRole: 'admin' | 'marketing') {
    setSaving(userId)
    await supabase
      .from('kpr_user_roles')
      .update({ role: newRole })
      .eq('user_id', userId)
    setUsers(u => u.map(x => x.user_id === userId ? { ...x, role: newRole } : x))
    setSaving(null)
  }

  if (!isAdmin || loading) return (
    <div style={{ padding: 40, color: '#9CA3AF' }}>Memuat atau memeriksa akses...</div>
  )

  return (
    <div style={{ padding: '32px 36px', maxWidth: 800 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E3A5F', margin: 0 }}>Manajemen User</h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
          Kelola role tim marketing. Invite user baru lewat Supabase Dashboard.
        </p>
      </div>

      {/* Info keamanan */}
      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '16px 20px', marginBottom: 24 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#15803D', fontWeight: 600 }}>Info Keamanan</p>
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
          <li>Hanya <strong>Admin</strong> yang bisa hapus data nasabah</li>
          <li><strong>Marketing</strong> hanya bisa input & edit, tidak bisa hapus</li>
          <li>Semua aksi tersimpan di log riwayat</li>
          <li>Data tersimpan di Supabase (terenkripsi at-rest & in-transit)</li>
        </ul>
      </div>

      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        <div style={{ padding: '14px 24px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: 0 }}>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>USER</span>
          <span style={{ width: 160, fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>ROLE</span>
          <span style={{ width: 80, fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>AKSI</span>
        </div>

        {users.length === 0 ? (
          <p style={{ padding: 32, color: '#9CA3AF', textAlign: 'center', fontSize: 14 }}>
            Belum ada user. Invite via Supabase Dashboard → Authentication → Users.
          </p>
        ) : users.map(u => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid #F9FAFB', gap: 0 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1E3A5F' }}>{u.nama}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{u.user_id}</div>
            </div>
            <div style={{ width: 160 }}>
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: u.role === 'admin' ? '#EFF6FF' : '#F0FDF4',
                color: u.role === 'admin' ? '#1D4ED8' : '#15803D',
                border: `1px solid ${u.role === 'admin' ? '#BFDBFE' : '#BBF7D0'}`,
              }}>{u.role === 'admin' ? 'Admin' : 'Marketing'}</span>
            </div>
            <div style={{ width: 80 }}>
              <button
                onClick={() => handleChangeRole(u.user_id, u.role === 'admin' ? 'marketing' : 'admin')}
                disabled={saving === u.user_id}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: '1.5px solid #D1D5DB',
                  background: 'white', fontSize: 12, cursor: 'pointer', color: '#374151',
                  opacity: saving === u.user_id ? 0.5 : 1,
                }}
              >
                {saving === u.user_id ? '...' : u.role === 'admin' ? '→ Marketing' : '→ Admin'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '14px 18px' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#92400E' }}>
          <strong>Cara invite user baru:</strong> Buka{' '}
          <a href="https://supabase.com/dashboard/project/xiwpbulblpovkekmgbnr/auth/users"
            target="_blank" rel="noreferrer" style={{ color: '#1E40AF' }}>
            Supabase Dashboard → Authentication → Users → Invite user
          </a>
          {' '}→ masukkan email tim marketing → mereka akan dapat email undangan.
        </p>
      </div>
    </div>
  )
}
