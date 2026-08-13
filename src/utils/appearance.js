const PREFERENCE_KEY = 'copyboard.appearance';
const RESOLVED_PREFERENCE_KEY = 'copyboard.resolvedAppearance';
const ALLOWED_MODES = new Set(['system', 'dark', 'light']);
const SYSTEM_QUERY = '(prefers-color-scheme: dark)';

export function normalizeThemeMode(value) {
  return ALLOWED_MODES.has(value) ? value : 'system';
}

export function resolveThemeMode(mode, systemPrefersDark = false) {
  const normalized = normalizeThemeMode(mode);
  if (normalized === 'system') return systemPrefersDark ? 'dark' : 'light';
  return normalized;
}

function readStoredMode() {
  try {
    return normalizeThemeMode(localStorage.getItem(PREFERENCE_KEY));
  } catch {
    return 'system';
  }
}

function readStoredResolvedTheme() {
  try {
    const value = localStorage.getItem(RESOLVED_PREFERENCE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

function getSystemQuery() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(SYSTEM_QUERY);
}

class AppearanceController {
  #mode = readStoredMode();
  #pending = false;
  #systemQuery = getSystemQuery();
  #resolvedSystemTheme = readStoredResolvedTheme();

  constructor() {
    const syncSystemTheme = () => {
      if (this.#mode === 'system') this.#applyResolvedTheme();
    };

    if (typeof this.#systemQuery?.addEventListener === 'function') {
      this.#systemQuery.addEventListener('change', syncSystemTheme);
    } else {
      this.#systemQuery?.addListener?.(syncSystemTheme);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === PREFERENCE_KEY) {
          this.#mode = normalizeThemeMode(event.newValue);
          this.#applyResolvedTheme();
        }
        if (event.key === RESOLVED_PREFERENCE_KEY) {
          this.#resolvedSystemTheme = ['dark', 'light'].includes(event.newValue)
            ? event.newValue
            : null;
          this.#applyResolvedTheme();
        }
      });
    }
  }

  #applyResolvedTheme() {
    if (typeof document === 'undefined') return;
    const systemPrefersDark = this.#resolvedSystemTheme
      ? this.#resolvedSystemTheme === 'dark'
      : this.#systemQuery?.matches === true;
    const resolved = resolveThemeMode(this.#mode, systemPrefersDark);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themeMode = this.#mode;
  }

  getCurrentTheme() {
    return this.#mode;
  }

  async applyTheme(requestedMode, resolvedSystemTheme = null) {
    if (this.#pending) return false;

    const nextMode = normalizeThemeMode(requestedMode);
    this.#pending = true;

    try {
      this.#mode = nextMode;
      if (nextMode === 'system') {
        this.#resolvedSystemTheme = ['dark', 'light'].includes(resolvedSystemTheme)
          ? resolvedSystemTheme
          : (this.#systemQuery?.matches === true ? 'dark' : 'light');
      }
      this.#applyResolvedTheme();
      localStorage.setItem(PREFERENCE_KEY, nextMode);
      if (this.#resolvedSystemTheme) {
        localStorage.setItem(RESOLVED_PREFERENCE_KEY, this.#resolvedSystemTheme);
      }
      return true;
    } finally {
      this.#pending = false;
    }
  }
}

export const appearance = new AppearanceController();
