const PREFERENCE_KEY = 'copyboard.appearance';
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

function getSystemQuery() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(SYSTEM_QUERY);
}

class AppearanceController {
  #mode = readStoredMode();
  #pending = false;
  #systemQuery = getSystemQuery();

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
        if (event.key !== PREFERENCE_KEY) return;
        this.#mode = normalizeThemeMode(event.newValue);
        this.#applyResolvedTheme();
      });
    }
  }

  #applyResolvedTheme() {
    if (typeof document === 'undefined') return;
    const resolved = resolveThemeMode(this.#mode, this.#systemQuery?.matches === true);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themeMode = this.#mode;
  }

  getCurrentTheme() {
    return this.#mode;
  }

  async applyTheme(requestedMode) {
    if (this.#pending) return false;

    const nextMode = normalizeThemeMode(requestedMode);
    this.#pending = true;

    try {
      this.#mode = nextMode;
      this.#applyResolvedTheme();
      localStorage.setItem(PREFERENCE_KEY, nextMode);
      return true;
    } finally {
      this.#pending = false;
    }
  }
}

export const appearance = new AppearanceController();
