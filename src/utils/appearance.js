const PREFERENCE_KEY = 'copyboard.appearance';
const ALLOWED_MODES = new Set(['dark', 'light']);

function readStoredMode() {
  try {
    const value = localStorage.getItem(PREFERENCE_KEY);
    return ALLOWED_MODES.has(value) ? value : 'dark';
  } catch {
    return 'dark';
  }
}

class AppearanceController {
  #mode = readStoredMode();
  #pending = false;

  getCurrentTheme() {
    return this.#mode;
  }

  async applyTheme(requestedMode) {
    if (this.#pending) return false;

    const nextMode = ALLOWED_MODES.has(requestedMode) ? requestedMode : 'dark';
    this.#pending = true;

    try {
      document.documentElement.dataset.theme = nextMode;
      localStorage.setItem(PREFERENCE_KEY, nextMode);
      this.#mode = nextMode;
      return true;
    } finally {
      this.#pending = false;
    }
  }
}

export const appearance = new AppearanceController();
