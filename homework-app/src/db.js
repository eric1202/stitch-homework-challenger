import { supabase } from './supabase'

// Supabase adapter that mimics Dexie API
class SupabaseTable {
    constructor(tableName) {
        this.tableName = tableName
    }

    async add(data) {
        const { data: result, error } = await supabase
            .from(this.tableName)
            .insert([data])
            .select()
            .single()

        if (error) throw error
        return result
    }

    async update(id, changes) {
        const { error } = await supabase
            .from(this.tableName)
            .update(changes)
            .eq('id', id)

        if (error) throw error
    }

    async delete(id) {
        const { error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('id', id)

        if (error) throw error
    }

    async get(key) {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .eq('key', key)
            .single()

        if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
        return data
    }

    async put(data) {
        const { error } = await supabase
            .from(this.tableName)
            .upsert([data])

        if (error) throw error
    }

    async toArray() {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')

        if (error) throw error
        return data || []
    }

    async bulkPut(items) {
        const { error } = await supabase
            .from(this.tableName)
            .upsert(items)

        if (error) throw error
    }

    async clear() {
        const { error } = await supabase
            .from(this.tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

        if (error) throw error
    }

    where(field) {
        return {
            equals: (value) => ({
                toArray: async () => {
                    const { data, error } = await supabase
                        .from(this.tableName)
                        .select('*')
                        .eq(field, value)

                    if (error) throw error
                    return data || []
                },
                reverse: () => ({
                    toArray: async () => {
                        const { data, error } = await supabase
                            .from(this.tableName)
                            .select('*')
                            .eq(field, value)
                            .order('created_at', { ascending: false })

                        if (error) throw error
                        return data || []
                    }
                })
            })
        }
    }
}

// Reactive query helper (simplified version of liveQuery)
export function liveQuery(queryFn) {
    let subscribers = []
    let currentData = null
    let polling = null

    const execute = async () => {
        try {
            const data = await queryFn()
            currentData = data
            subscribers.forEach(callback => callback(data))
        } catch (error) {
            console.error('LiveQuery error:', error)
        }
    }

    return {
        subscribe: (callback) => {
            subscribers.push(callback)
            execute() // Initial execution

            // Poll every 2 seconds for changes
            if (!polling) {
                polling = setInterval(execute, 2000)
            }

            return {
                unsubscribe: () => {
                    subscribers = subscribers.filter(cb => cb !== callback)
                    if (subscribers.length === 0 && polling) {
                        clearInterval(polling)
                        polling = null
                    }
                }
            }
        }
    }
}

// Database instance
export const db = {
    tasks: new SupabaseTable('tasks'),
    settings: new SupabaseTable('settings'),
    rewards: new SupabaseTable('rewards'),
    redemptionLogs: new SupabaseTable('redemption_logs'),

    transaction: async (mode, tables, callback) => {
        // Supabase doesn't support transactions in the same way
        // For now, just execute the callback
        return await callback()
    }
}




