import { supabase } from './supabase'
import { eventBus } from './eventBus'

// Supabase adapter that mimics Dexie API
class SupabaseTable {
    constructor(tableName) {
        this.tableName = tableName
    }

    notify() {
        eventBus.dispatchEvent('db-changed');
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
            .limit(1)
            .maybeSingle()

        if (error) throw error
        return data
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
            .neq('id', '00000000-0000-0000-0000-000000000000')

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

// Reactive query helper
export function liveQuery(queryFn) {
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
                eventBus.addEventListener('db-changed', execute);
            }
            execute()
            return {
                unsubscribe: () => {
                    subscribers = subscribers.filter(cb => cb !== callback)
                    if (subscribers.length === 0) {
                        eventBus.removeEventListener('db-changed', execute);
                    }
                }
            }
        }
    }
}

export const db = {
    tasks: new SupabaseTable('tasks'),
    settings: new SupabaseTable('settings').setPrimaryKey('key'),
    rewards: new SupabaseTable('rewards'),
    redemptionLogs: new SupabaseTable('redemption_logs'),
    dailyCheckinTemplates: new SupabaseTable('daily_checkin_templates'),

    transaction: async (...args) => {
        const callback = args[args.length - 1];
        return await callback();
    }
}
