import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

import { i18n } from './i18n'
import { initSupabase } from './supabase'

// Initialize Supabase (with URL failover) before mounting the app
initSupabase().then(() => {
    createApp(App).use(i18n).mount('#app')
})
