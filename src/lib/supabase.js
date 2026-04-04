import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase = null

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  console.warn(
    '[Hive] Supabase env vars missing (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). ' +
      'Running without backend — data will not persist.'
  )
}

export default supabase
