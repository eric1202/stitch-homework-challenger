import { supabase } from './supabase'

// Supabase adapter that mimics Dexie API
class SupabaseTable {
    constructor(tableName) {
        this.tableName = tableName
    }

    notify() {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('db-changed'));
        }
    }

    async add(data) {
        const { data: result, error } = await supabase
            .from(this.tableName)
            .insert([data])
            .select()
            .single()

        if (error) throw error
        this.notify()
        return result
    }

    async update(id, changes) {
        const { error } = await supabase
            .from(this.tableName)
            .update(changes)
            .eq('id', id)

        if (error) throw error
        this.notify()
    }

    async delete(id) {
        const { error } = await supabase
            .from(this.tableName)
            .delete()
            .eq('id', id)

        if (error) throw error
        this.notify()
    }

    async get(value) {
        const { data, error } = await supabase
            .from(this.tableName)
            .select('*')
            .eq(this.primaryKey || 'id', value)
            .limit(1)  // Use limit(1) instead of single() to avoid 406 if not found
            .maybeSingle()

        if (error) throw error
        return data // returns null if not found
    }

    async put(data) {
        const { error } = await supabase
            .from(this.tableName)
            .upsert([data])

        if (error) throw error
        this.notify()
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
        this.notify()
    }

    async clear() {
        const { error } = await supabase
            .from(this.tableName)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

        if (error) throw error
        this.notify()
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

    setPrimaryKey(key) {
        this.primaryKey = key;
        return this;
    }
}

// Reactive query helper (simplified version of liveQuery)
export function liveQuery(queryFn) {
    let subscribers = []
    let currentData = null

    const execute = async () => {
        try {
            const data = await queryFn()
            currentData = data
            subscribers.forEach(callback => callback(data))
        } catch (error) {
            console.error('LiveQuery error:', error)
        }
    }

    const listener = () => execute();

    return {
        subscribe: (callback) => {
            subscribers.push(callback)

            // On first subscriber, setup listeners
            if (subscribers.length === 1) {
                if (typeof window !== 'undefined') {
                    window.addEventListener('db-changed', listener);
                }
            }

            execute() // Initial execution

            return {
                unsubscribe: () => {
                    subscribers = subscribers.filter(cb => cb !== callback)
                    if (subscribers.length === 0) {
                        if (typeof window !== 'undefined') {
                            window.removeEventListener('db-changed', listener);
                        }
                    }
                }
            }
        }
    }
}

// Database instance
export const db = {
    tasks: new SupabaseTable('tasks'),
    settings: new SupabaseTable('settings').setPrimaryKey('key'),
    rewards: new SupabaseTable('rewards'),
    redemptionLogs: new SupabaseTable('redemption_logs'),
    dailyCheckinTemplates: new SupabaseTable('daily_checkin_templates'),

    transaction: async (...args) => {
        // Supabase doesn't support transactions in the same way
        // The last argument is the callback function
        const callback = args[args.length - 1];
        if (typeof callback !== 'function') {
            throw new TypeError('The last argument to db.transaction must be a function');
        }
        return await callback();
    }
}




