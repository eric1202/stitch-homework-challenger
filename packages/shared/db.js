/**
 * Shared database adapter layer.
 *
 * Platform differences (window events vs custom eventBus) are injected via
 * the `events` parameter so this module stays platform-agnostic.
 *
 * Usage:
 *   const { db, liveQuery } = createDb(getSupabase, {
 *     notify:   () => window.dispatchEvent(new CustomEvent('db-changed')),
 *     listen:   (fn) => window.addEventListener('db-changed', fn),
 *     unlisten: (fn) => window.removeEventListener('db-changed', fn),
 *   })
 *
 * The first argument is a getter function () => supabaseClient so that
 * the client can be swapped after init (e.g. failover to backup URL).
 */

class SupabaseTable {
    constructor(tableName, getSupabase, events) {
        this.tableName = tableName
        this._getSupabase = getSupabase
        this._events = events
    }

    notify() {
        this._events.notify()
    }

    async add(data) {
        const { data: result, error } = await this._getSupabase()
            .from(this.tableName)
            .insert([data])
            .select()
            .single()

        if (error) throw error
        this.notify()
        return result
    }

    async update(id, changes) {
        const { error } = await this._getSupabase()
            .from(this.tableName)
            .update(changes)
            .eq('id', id)

        if (error) throw error
        this.notify()
    }

    async delete(id) {
        const { error } = await this._getSupabase()
            .from(this.tableName)
            .delete()
            .eq('id', id)

        if (error) throw error
        this.notify()
    }

    async get(value) {
        const { data, error } = await this._getSupabase()
            .from(this.tableName)
            .select('*')
            .eq(this.primaryKey || 'id', value)
            .limit(1)
            .maybeSingle()

        if (error) throw error
        return data
    }

    async put(data) {
        const { error } = await this._getSupabase()
            .from(this.tableName)
            .upsert([data])

        if (error) throw error
        this.notify()
    }

    async toArray() {
        const { data, error } = await this._getSupabase()
            .from(this.tableName)
            .select('*')

        if (error) throw error
        return data || []
    }

    async bulkPut(items) {
        const { error } = await this._getSupabase()
            .from(this.tableName)
            .upsert(items)

        if (error) throw error
        this.notify()
    }

    async clear() {
        const { error } = await this._getSupabase()
            .from(this.tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')

        if (error) throw error
        this.notify()
    }

    async clearByUser(userName) {
        const { error } = await this._getSupabase()
            .from(this.tableName)
            .delete()
            .eq('user_name', userName)

        if (error) throw error
        this.notify()
    }

    where(field) {
        const getSupabase = this._getSupabase
        const tableName = this.tableName
        return {
            equals: (value) => {
                let columns = '*'
                const chain = {
                    select: (cols) => {
                        columns = cols
                        return chain
                    },
                    toArray: async () => {
                        const { data, error } = await getSupabase()
                            .from(tableName)
                            .select(columns)
                            .eq(field, value)

                        if (error) throw error
                        return data || []
                    },
                    reverse: () => ({
                        toArray: async () => {
                            const { data, error } = await getSupabase()
                                .from(tableName)
                                .select(columns)
                                .eq(field, value)
                                .order('created_at', { ascending: false })

                            if (error) throw error
                            return data || []
                        }
                    })
                }
                return chain
            }
        }
    }

    setPrimaryKey(key) {
        this.primaryKey = key
        return this
    }
}

function createLiveQuery(events) {
    return function liveQuery(queryFn) {
        let subscribers = []

        const execute = async () => {
            try {
                const data = await queryFn()
                subscribers.forEach(callback => callback(data))
            } catch (error) {
                console.error('LiveQuery error:', error)
            }
        }

        return {
            subscribe: (callback) => {
                subscribers.push(callback)
                if (subscribers.length === 1) {
                    events.listen(execute)
                }
                execute()
                return {
                    unsubscribe: () => {
                        subscribers = subscribers.filter(cb => cb !== callback)
                        if (subscribers.length === 0) {
                            events.unlisten(execute)
                        }
                    }
                }
            }
        }
    }
}

/**
 * @param {function} getSupabase - Getter () => supabaseClient (allows post-init swap)
 * @param {object} events
 */
export function createDb(getSupabase, events) {
    const table = (name) => new SupabaseTable(name, getSupabase, events)

    const db = {
        tasks: table('tasks'),
        settings: table('settings').setPrimaryKey('key'),
        rewards: table('rewards'),
        redemptionLogs: table('redemption_logs'),
        dailyCheckinTemplates: table('daily_checkin_templates'),
        userCards: table('user_cards'),
        drawRecords: table('draw_records'),
        pityStates: table('pity_states'),

        transaction: async (...args) => {
            const callback = args[args.length - 1]
            if (typeof callback !== 'function') {
                throw new TypeError('The last argument to db.transaction must be a function')
            }
            return await callback()
        }
    }

    const liveQuery = createLiveQuery(events)

    return { db, liveQuery }
}
