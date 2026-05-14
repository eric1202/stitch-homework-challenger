import { createI18n } from 'vue-i18n';
import { getVueMessages } from '@homework/shared';

// Detect browser language or default to Chinese as per request context implication (user asked for Chinese), 
// but usually we default to English or auto-detect. 
// User asked to "add Chinese", implies they might switch or default to it. Let's try to detect.
const userLang = navigator.language || navigator.userLanguage;
const defaultLocale = userLang.startsWith('zh') ? 'zh' : 'en';

export const i18n = createI18n({
    legacy: false, // Use Composition API mode
    locale: defaultLocale,
    fallbackLocale: 'en',
    messages: getVueMessages()
});
