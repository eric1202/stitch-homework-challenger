import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database schema types (for reference)
export const TABLES = {
    TASKS: 'tasks',
    SETTINGS: 'settings',
    REWARDS: 'rewards',
    REDEMPTION_LOGS: 'redemption_logs',
    MONOPOLY_LEADERBOARD: 'monopoly_leaderboard'
}
