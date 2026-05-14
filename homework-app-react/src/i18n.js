import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getI18nextResources } from '@homework/shared';

const userLang = navigator.language || navigator.userLanguage;
const defaultLocale = userLang.startsWith('zh') ? 'zh' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: getI18nextResources(),
    lng: defaultLocale,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes by default
    }
  });

export default i18n;
