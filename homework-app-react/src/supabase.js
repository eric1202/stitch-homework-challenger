import { createClient } from '@supabase/supabase-js'
import { TABLES } from '@homework/shared'

export const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const getSupabase = () => supabase
export { TABLES }
