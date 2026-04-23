import { createDb } from '@homework/shared'
import { getSupabase } from './supabase'

const { db, liveQuery } = createDb(getSupabase, {
    notify: () => window.dispatchEvent(new CustomEvent('db-changed')),
    listen: (fn) => window.addEventListener('db-changed', fn),
    unlisten: (fn) => window.removeEventListener('db-changed', fn),
})

export { db, liveQuery }
