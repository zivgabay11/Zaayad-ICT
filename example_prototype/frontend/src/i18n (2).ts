import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enLocales from './locales/en.json';
import heLocales from './locales/he.json';

const resources = {
    en: {
        translation: enLocales
    },
    he: {
        translation: heLocales
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        lng: localStorage.getItem('i18nextLng') || 'he',
        fallbackLng: 'he',
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
