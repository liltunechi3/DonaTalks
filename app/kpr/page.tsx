'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function KprIndexPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/kpr/dashboard') }, [router])
  return null
}
