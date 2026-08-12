import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export const DEFAULT_SETTINGS = {
  language: 'ru',
  startMinimized: false,
  closeBehavior: 'minimize',
  autoStart: false,
  showTrayNotifications: true,
  quickAccessHotkey: 'Ctrl+Shift+V',
  clearAllHotkey: 'Ctrl+Shift+Delete',
  viewMode: 'list',
  theme: 'dark',
  maxItems: 100,
  autoDelete: 'never',
};

let cachedSettings = null;
let saveTimeout = null;

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}
export function loadSettings() {
  if (cachedSettings) {
    return { ...cachedSettings };
  }

  try {
    const filePath = getSettingsPath();
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      cachedSettings = { ...DEFAULT_SETTINGS, ...data };
    } else {
      cachedSettings = { ...DEFAULT_SETTINGS };
    }
  } catch {
    cachedSettings = { ...DEFAULT_SETTINGS };
  }

  delete cachedSettings.monitorClipboard;
  delete cachedSettings.saveOnClose;

  return { ...cachedSettings };
}

export function saveSettings(partial) {
  const current = loadSettings();
  cachedSettings = { ...current, ...partial };

  try {
    fs.mkdirSync(path.dirname(getSettingsPath()), { recursive: true });
    fs.writeFileSync(getSettingsPath(), JSON.stringify(cachedSettings, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save settings:', error);
  }

  return { ...cachedSettings };
}

export function saveSettingsDebounced(partial, delay = 400) {
  const current = loadSettings();
  cachedSettings = { ...current, ...partial };

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  return new Promise((resolve) => {
    saveTimeout = setTimeout(() => {
      saveTimeout = null;
      resolve(saveSettings(partial));
    }, delay);
  });
}
