import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Analysis = {
  id: string
  cv_text: string
  linkedin_url: string | null
  preview_content: string | null
  full_content: string | null
  is_paid: boolean
  session_id: string
  created_at: string
  updated_at: string
}

export type Payment = {
  id: string
  analysis_id: string
  amount: number
  currency: string
  scalev_transaction_id: string | null
  status: string
  created_at: string
}
