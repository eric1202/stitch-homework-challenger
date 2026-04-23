import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with optional primary/backup failover.
 *
 * @param {object} config
 * @param {string} config.primaryUrl  - Primary Supabase URL
 * @param {string} config.backupUrl   - Backup Supabase URL (optional, skip failover if absent)
 * @param {string} config.anonKey     - Supabase anon key
 * @returns {{ supabase: object, initSupabase: () => Promise<object> }}
 */
export function createSupabaseClient({ primaryUrl, backupUrl, anonKey }) {
    let activeUrl = primaryUrl
    let isResolved = false
    let supabase = createClient(primaryUrl, anonKey)

    const resolveActiveUrl = async () => {
        if (isResolved) return activeUrl
        if (!backupUrl) {
            isResolved = true
            return activeUrl
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)

        try {
            await fetch(`${primaryUrl}/rest/v1/`, {
                method: 'GET',
                headers: { 'apikey': anonKey },
                signal: controller.signal
            })
            activeUrl = primaryUrl
            console.log('Supabase: Using Primary URL')
        } catch (err) {
            console.warn('Supabase: Primary URL failed or timed out, falling back to Backup URL')
            activeUrl = backupUrl
        } finally {
            clearTimeout(timeoutId)
            isResolved = true
        }

        return activeUrl
    }

    const initSupabase = async () => {
        const url = await resolveActiveUrl()
        if (url !== primaryUrl) {
            supabase = createClient(url, anonKey)
        }
        return supabase
    }

    // Return a getter so consumers always see the current client
    return {
        get supabase() { return supabase },
        initSupabase
    }
}
