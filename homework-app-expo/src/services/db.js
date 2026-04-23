import { createDb } from '@homework/shared'
import { getSupabase } from './supabase'
import { eventBus } from './eventBus'

const { db, liveQuery } = createDb(getSupabase, {
    notify: () => eventBus.dispatchEvent('db-changed'),
    listen: (fn) => eventBus.addEventListener('db-changed', fn),
    unlisten: (fn) => eventBus.removeEventListener('db-changed', fn),
})

export { db, liveQuery }
