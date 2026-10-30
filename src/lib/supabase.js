import { createClient } from '@supabase/supabase-js'

let supabaseClient

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient

  const configuredUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!configuredUrl || !supabaseKey) {
    throw new Error(
      'Konfigurasi Supabase belum tersedia. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY di .env.local, lalu mulai ulang Vite.',
    )
  }

  let supabaseUrl
  try {
    const parsedUrl = new URL(configuredUrl.trim())
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
    supabaseUrl = parsedUrl.toString().replace(/\/$/, '')
  } catch {
    throw new Error(
      'VITE_SUPABASE_URL tidak valid. Isi dengan URL proyek Supabase, misalnya https://project-ref.supabase.co.',
    )
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey)
  return supabaseClient
}
