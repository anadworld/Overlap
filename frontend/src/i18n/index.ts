import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';
import fr from './locales/fr.json';
import nl from './locales/nl.json';
import de from './locales/de.json';
import es from './locales/es.json';
import pt from './locales/pt.json';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  nl: { translation: nl },
  de: { translation: de },
  es: { translation: es },
  pt: { translation: pt },
};

// Get device language, fallback to 'en'
const deviceLanguage = getLocales()?.[0]?.languageCode || 'en';

// Map to supported languages (e.g., 'pt-BR' → 'pt')
const supportedLanguages = ['en', 'fr', 'nl', 'de', 'es', 'pt'];
const resolvedLanguage = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: resolvedLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

export default i18n;
