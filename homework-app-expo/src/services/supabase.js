import 'react-native-url-polyfill/auto'
import { createSupabaseClient, TABLES } from '@homework/shared'

const _instance = createSupabaseClient({
    primaryUrl: process.env.EXPO_PUBLIC_SUPABASE_URL_PRIMARY,
    backupUrl: process.env.EXPO_PUBLIC_SUPABASE_URL_BACKUP,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
})

export { TABLES }
export const getSupabase = () => _instance.supabase
export const initSupabase = _instance.initSupabase
export const supabase = new Proxy({}, { get: (_, prop) => _instance.supabase[prop] })
