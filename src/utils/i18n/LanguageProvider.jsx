import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import i18n from './i18n';

const LanguageContext = createContext(null);

export function LanguageProvider({ children, initialLanguage }) {
  const [language, setLanguageState] = useState(() => initialLanguage || i18n.getLanguage());

  useEffect(() => {
    if (!initialLanguage) return undefined;

    let active = true;
    i18n.init(initialLanguage)
      .then((loadedLanguage) => {
        if (active) setLanguageState(loadedLanguage);
      })
      .catch(() => {
        if (active) setLanguageState(i18n.getLanguage());
      });

    return () => {
      active = false;
    };
  }, [initialLanguage]);

  useEffect(() => i18n.subscribe(setLanguageState), []);

  useEffect(() => {
    const metadata = i18n.getSupportedLanguages().find((entry) => entry.code === language);
    document.documentElement.lang = language;
    document.documentElement.dir = metadata?.direction || 'ltr';
  }, [language]);

  const changeLanguage = useCallback(async (nextLanguage) => {
    if (nextLanguage === i18n.getLanguage()) return true;
    const changed = await i18n.setLanguage(nextLanguage);
    if (changed) setLanguageState(nextLanguage);
    return changed;
  }, []);

  const value = useMemo(() => ({
    language,
    setLanguage: changeLanguage,
    t: (key, params) => i18n.t(key, params),
    formatRelativeTime: (date) => i18n.formatRelativeTime(date),
    getSupportedLanguages: () => i18n.getSupportedLanguages(),
  }), [changeLanguage, language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is missing from the component tree');
  return value;
}
