import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database schema types (for reference)
export const TABLES = {
    TASKS: 'tasks',
    SETTINGS: 'settings',
    REWARDS: 'rewards',
    REDEMPTION_LOGS: 'redemption_logs',
    MONOPOLY_LEADERBOARD: 'monopoly_leaderboard'
}
