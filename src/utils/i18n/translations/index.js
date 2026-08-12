import { en } from './en';
import { ru } from './ru';

export const translations = {
  en,
  ru,
};

export const availableLanguages = Object.keys(translations);

export const isLanguageAvailable = (langCode) => availableLanguages.includes(langCode);

export const getTranslation = (langCode) => translations[langCode] || translations.ru;
