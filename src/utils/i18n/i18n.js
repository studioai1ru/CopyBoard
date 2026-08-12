import { translations } from './translations';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './config';
import { desktop } from '../desktop';

const LANG_STORAGE = 'copyboard.language';

/**
 * Lightweight localization runtime for CopyBoard.
 * Nested-key lookup with {{param}} interpolation and RU plural forms.
 */
class LocaleRuntime {
  constructor() {
    this.locale = DEFAULT_LANGUAGE;
    this.fallback = DEFAULT_LANGUAGE;
    this.catalog = translations;
    this.watchers = new Set();
    this.ready = false;
  }

  async init(preferred = null) {
    let chosen = null;
    const api = desktop();

    if (!preferred && api?.settings?.getLanguage) {
      try {
        const fromMain = await api.settings.getLanguage();
        if (fromMain && this.catalog[fromMain]) chosen = fromMain;
      } catch {
        // ignore
      }
    }

    if (!chosen && preferred && this.catalog[preferred]) {
      chosen = preferred;
    }

    if (!chosen) {
      try {
        const stored =
          localStorage.getItem(LANG_STORAGE) || localStorage.getItem('appLanguage');
        if (stored && this.catalog[stored]) chosen = stored;
      } catch {
        // ignore
      }
    }

    if (!chosen) {
      const browser = navigator.language?.split('-')[0];
      if (browser && this.catalog[browser]) chosen = browser;
    }

    this.locale = chosen || DEFAULT_LANGUAGE;
    this.ready = true;
    this.#syncDocument();
    return this.locale;
  }

  getLanguage() {
    return this.locale;
  }

  async setLanguage(next) {
    if (!this.catalog[next] || next === this.locale) {
      return Boolean(this.catalog[next]);
    }

    this.locale = next;
    this.#syncDocument();

    const api = desktop();
    if (api?.settings?.setLanguage) {
      try {
        await api.settings.setLanguage(next);
      } catch (error) {
        console.error('Failed to persist language:', error);
      }
    }

    try {
      localStorage.setItem(LANG_STORAGE, next);
      localStorage.setItem('appLanguage', next);
    } catch {
      // ignore
    }

    this.watchers.forEach((fn) => fn(this.locale));
    return true;
  }

  #syncDocument() {
    const meta = SUPPORTED_LANGUAGES[this.locale];
    if (!meta) return;
    document.documentElement.dir = meta.direction;
    document.documentElement.lang = this.locale;
  }

  #lookup(keys, bag) {
    let node = bag;
    for (const part of keys) {
      if (node && node[part] !== undefined && node[part] !== null) {
        node = node[part];
      } else {
        return null;
      }
    }
    return node;
  }

  #pluralBucket(count) {
    const n = Math.abs(Number(count));
    if (!Number.isFinite(n)) return 'many';
    if (this.locale === 'ru') {
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return 'one';
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'few';
      return 'many';
    }
    return n === 1 ? 'one' : 'many';
  }

  #fill(template, params) {
    return Object.keys(params).reduce((acc, key) => {
      return acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(params[key]));
    }, template);
  }

  t(path, params = {}) {
    const keys = path.split('.');
    let value = this.#lookup(keys, this.catalog[this.locale]);
    if (value == null) {
      value = this.#lookup(keys, this.catalog[this.fallback]);
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const form = this.#pluralBucket(params.count);
      value = value[form] || value.many || value.one || path;
    }

    if (typeof value === 'string') {
      return this.#fill(value, params);
    }
    return value || path;
  }

  formatRelativeTime(date) {
    const delta = Date.now() - new Date(date).getTime();
    if (delta < 45_000) return this.t('item.justNow');
    if (delta < 3_600_000) {
      return this.t('item.minutesAgo', { count: Math.max(1, Math.floor(delta / 60_000)) });
    }
    if (delta < 86_400_000) {
      return this.t('item.hoursAgo', { count: Math.floor(delta / 3_600_000) });
    }
    return this.t('item.daysAgo', { count: Math.floor(delta / 86_400_000) });
  }

  subscribe(listener) {
    this.watchers.add(listener);
    return () => this.watchers.delete(listener);
  }

  getSupportedLanguages() {
    return Object.keys(SUPPORTED_LANGUAGES).map((code) => ({
      code,
      ...SUPPORTED_LANGUAGES[code],
    }));
  }

  isLanguageSupported(language) {
    return Boolean(this.catalog[language]);
  }

  getIsInitialized() {
    return this.ready;
  }
}

const i18n = new LocaleRuntime();
export default i18n;
