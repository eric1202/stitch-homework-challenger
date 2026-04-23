import { createSupabaseClient } from '@homework/shared'
import { TABLES } from '@homework/shared'

const _instance = createSupabaseClient({
    primaryUrl: import.meta.env.VITE_SUPABASE_URL_PRIMARY,
    backupUrl: import.meta.env.VITE_SUPABASE_URL_BACKUP,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
})

export { TABLES }
// getter always returns the current client (may be swapped after failover)
export const getSupabase = () => _instance.supabase
export const initSupabase = _instance.initSupabase
// direct export for components that use supabase directly (e.g. MonopolyGame)
export const supabase = new Proxy({}, { get: (_, prop) => _instance.supabase[prop] })
