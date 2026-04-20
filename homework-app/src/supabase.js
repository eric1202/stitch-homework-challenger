import { createClient } from '@supabase/supabase-js'

const PRIMARY_URL = import.meta.env.VITE_SUPABASE_URL_PRIMARY
const BACKUP_URL = import.meta.env.VITE_SUPABASE_URL_BACKUP
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let activeUrl = PRIMARY_URL
let isResolved = false

/**
 * Health check with timeout to determine the best available URL
 */
const resolveActiveUrl = async () => {
    if (isResolved) return activeUrl

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
        // Try the primary URL with a GET request
        await fetch(`${PRIMARY_URL}/rest/v1/`, {
            method: 'GET',
            headers: { 'apikey': supabaseAnonKey },
            signal: controller.signal
        })

        // If fetch succeeds (even with 401/404), server is reachable
        activeUrl = PRIMARY_URL
        console.log('Supabase: Using Primary URL')
    } catch (err) {
        console.warn('Supabase: Primary URL failed or timed out, falling back to Backup URL')
        activeUrl = BACKUP_URL
    } finally {
        clearTimeout(timeoutId)
        isResolved = true
    }

    return activeUrl
}

// Initial client
export let supabase = createClient(PRIMARY_URL, supabaseAnonKey)

/**
 * Initialization function for Vue app
 */
export const initSupabase = async () => {
    const url = await resolveActiveUrl()
    if (url !== PRIMARY_URL) {
        supabase = createClient(url, supabaseAnonKey)
    }
    return supabase
}

// Database schema types
export const TABLES = {
    TASKS: 'tasks',
    SETTINGS: 'settings',
    REWARDS: 'rewards',
    REDEMPTION_LOGS: 'redemption_logs',
    MONOPOLY_LEADERBOARD: 'monopoly_leaderboard'
}
