import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  screen,
} from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { loadSettings, saveSettings, saveSettingsDebounced } from './settingsStore.js';
import {
  loadHistory,
  saveHistory,
  saveHistoryDebounced,
  clearHistoryStore,
  migrateLegacyHistory,
} from './historyStore.js';
import { loadFrequentItems, saveFrequentItems } from './frequentStore.js';
import { createClipboardWatcher } from './clipboardWatcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_NAME = 'CopyBoard';
const WINDOW_WIDTH = 820;
const WINDOW_HEIGHT = 620;
const WINDOW_MIN_W = 520;
const WINDOW_MIN_H = 500;

const TRAY_COPY = {
  ru: {
    tooltip: 'CopyBoard — менеджер буфера',
    showWindow: 'Открыть',
    settings: 'Настройки',
    quit: 'Выход',
    favoritesEmpty: 'Нет избранного',
  },
  en: {
    tooltip: 'CopyBoard — Clipboard Manager',
    showWindow: 'Open',
    settings: 'Settings',
    quit: 'Quit',
    favoritesEmpty: 'No favorites',
  },
};

let mainWindow = null;
let tray = null;
let quitting = false;
let closeMode = 'minimize';
let launchHidden = false;
let loginEnabled = true;
let shortcuts = {
  reveal: 'Ctrl+Shift+V',
  wipeHistory: 'Ctrl+Shift+Delete',
};

const watcher = createClipboardWatcher({
  onCapture: (payload) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('copyboard:clip.capture', {
      type: payload.kind,
      content: payload.body,
      timestamp: payload.capturedAt,
    });
  },
});

function trayCopy(lang) {
  return TRAY_COPY[lang] || TRAY_COPY.ru;
}

function shorten(text, max = 42) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function favoriteTitle(item, lang) {
  const labels = trayCopy(lang);
  const label = (item?.label || '').trim();
  if (label) return shorten(label);
  if (item?.content?.startsWith('data:image/')) {
    return lang === 'en' ? 'Image' : 'Изображение';
  }
  const line = String(item?.content || '').trim().split(/\r?\n/)[0] || labels.favoritesEmpty;
  return shorten(line);
}

function pasteFavorite(item) {
  if (!item?.content) return;
  try {
    if (item.content.startsWith('data:image/')) {
      watcher.writeImageDataUrl(item.content);
    } else {
      watcher.writeText(item.content);
    }
  } catch (error) {
    console.error('Tray favorite copy failed:', error);
  }
}

function syncRuntimeFromSettings(settings) {
  if (settings.closeBehavior) closeMode = settings.closeBehavior;
  if (settings.startMinimized !== undefined) launchHidden = settings.startMinimized;
  shortcuts = {
    reveal: settings.quickAccessHotkey || shortcuts.reveal,
    wipeHistory: settings.clearAllHotkey || shortcuts.wipeHistory,
  };
  if (settings.autoStart !== undefined) {
    loginEnabled = settings.autoStart;
    configureLoginItem(settings.autoStart);
  }
}

function resolveIndexHtml() {
  const candidates = [
    path.join(app.getAppPath(), 'dist-react', 'index.html'),
    path.join(__dirname, '../../dist-react/index.html'),
    path.join(process.cwd(), 'dist-react', 'index.html'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function configureLoginItem(enabled) {
  try {
    loginEnabled = enabled;
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: enabled && launchHidden,
      name: APP_NAME,
      path: process.execPath,
      args: enabled && launchHidden ? ['--hidden'] : [],
    });
    return true;
  } catch {
    return false;
  }
}

function loginItemSnapshot() {
  try {
    const s = app.getLoginItemSettings();
    return {
      openAtLogin: s.openAtLogin,
      openAsHidden: s.openAsHidden,
      wasOpenedAtLogin: s.wasOpenedAtLogin,
      wasOpenedAsHidden: s.wasOpenedAsHidden,
    };
  } catch {
    return { openAtLogin: false, openAsHidden: false };
  }
}

function applyLaunchFlags() {
  if (process.argv.includes('--hidden')) {
    launchHidden = true;
  }
  const login = loginItemSnapshot();
  if (login.wasOpenedAtLogin && login.wasOpenedAsHidden) {
    launchHidden = true;
  }
}

function platformHotkey(combo) {
  if (!combo) return combo;
  return combo.replace('Ctrl', process.platform === 'darwin' ? 'Cmd' : 'Ctrl');
}

function bindGlobalShortcuts() {
  try {
    globalShortcut.unregisterAll();

    if (shortcuts.reveal) {
      globalShortcut.register(platformHotkey(shortcuts.reveal), () => {
        revealNearCursor();
      });
    }

    if (shortcuts.wipeHistory) {
      globalShortcut.register(platformHotkey(shortcuts.wipeHistory), () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('copyboard:history.wipeShortcut');
        }
      });
    }

    if (process.platform === 'darwin') {
      ['Cmd+Shift+4', 'Cmd+Shift+3'].forEach((key) => {
        globalShortcut.register(key, () => watcher.probeImageSoon([900, 2200]));
      });
    }

    if (process.platform === 'win32') {
      ['PrintScreen', 'Alt+PrintScreen'].forEach((key) => {
        try {
          globalShortcut.register(key, () => watcher.probeImageSoon([900, 2000]));
        } catch {
          // PrintScreen may be reserved by the OS.
        }
      });
    }
  } catch {
    // ignore registration failures
  }
}

function revealNearCursor() {
  if (!mainWindow) return;
  try {
    const cursor = screen.getCursorScreenPoint();
    const display = screen.getDisplayNearestPoint(cursor);
    const bounds = mainWindow.getBounds();
    const x = Math.max(
      display.bounds.x,
      Math.min(cursor.x - bounds.width / 2, display.bounds.x + display.bounds.width - bounds.width),
    );
    const y = Math.max(
      display.bounds.y,
      Math.min(cursor.y - bounds.height / 2, display.bounds.y + display.bounds.height - bounds.height),
    );
    mainWindow.setPosition(Math.round(x), Math.round(y));
    revealWindow();
    mainWindow.webContents.send('copyboard:ui.focusSearch');
  } catch {
    revealWindow();
  }
}

function rebuildTrayMenu(language = loadSettings().language || 'ru') {
  if (!tray) return;
  const labels = trayCopy(language);
  const favorites = [...loadFrequentItems()].sort((a, b) =>
    favoriteTitle(a, language).localeCompare(favoriteTitle(b, language), language === 'en' ? 'en' : 'ru', {
      sensitivity: 'base',
    }),
  );

  const favoriteEntries =
    favorites.length > 0
      ? favorites.map((item) => ({
          label: favoriteTitle(item, language),
          type: 'normal',
          click: () => pasteFavorite(item),
        }))
      : [{ label: labels.favoritesEmpty, type: 'normal', enabled: false }];

  tray.setToolTip(labels.tooltip);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      ...favoriteEntries,
      { type: 'separator' },
      { label: labels.showWindow, type: 'normal', click: revealWindow },
      {
        label: labels.settings,
        type: 'normal',
        click: () => {
          revealWindow();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('copyboard:ui.openSettings');
          }
        },
      },
      { type: 'separator' },
      { label: labels.quit, type: 'normal', click: exitApp },
    ]),
  );
}

function createTrayIcon() {
  const iconFile = path.join(app.getAppPath(), 'dist-react', 'images', 'CopyBoard_Logo.png');
  const icon = nativeImage.createFromPath(iconFile).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  rebuildTrayMenu();

  const toggle = () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) concealWindow();
    else revealWindow();
  };
  tray.on('click', toggle);
  tray.on('double-click', toggle);
}

function revealWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function concealWindow() {
  if (mainWindow) mainWindow.hide();
}

function exitApp() {
  quitting = true;
  watcher.stop();
  globalShortcut.unregisterAll();
  if (tray) tray.destroy();
  app.quit();
}

function registerIpc() {
  ipcMain.handle('copyboard:window.minimize', () => {
    mainWindow?.minimize();
  });
  ipcMain.handle('copyboard:window.toggleMaximize', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.handle('copyboard:window.close', () => {
    if (!mainWindow) return;
    if (closeMode === 'minimize') concealWindow();
    else exitApp();
  });
  ipcMain.handle('copyboard:window.isMaximized', () => Boolean(mainWindow?.isMaximized()));
  ipcMain.handle('copyboard:window.show', () => {
    revealWindow();
    return true;
  });
  ipcMain.handle('copyboard:window.hide', () => {
    concealWindow();
    return true;
  });

  ipcMain.handle('copyboard:clip.start', () => {
    watcher.start();
    return true;
  });
  ipcMain.handle('copyboard:clip.stop', () => {
    watcher.stop();
    return true;
  });
  ipcMain.handle('copyboard:clip.readText', () => watcher.readText());
  ipcMain.handle('copyboard:clip.readImage', () => watcher.readImageDataUrl());
  ipcMain.handle('copyboard:clip.writeText', (_e, text) => watcher.writeText(text));
  ipcMain.handle('copyboard:clip.writeImage', (_e, dataUrl) => watcher.writeImageDataUrl(dataUrl));
  ipcMain.handle('copyboard:clip.suppress', (_e, ms) => {
    watcher.suppress(typeof ms === 'number' ? ms : undefined);
    return true;
  });

  ipcMain.handle('copyboard:settings.get', () => loadSettings());
  ipcMain.handle('copyboard:settings.save', (_e, partial) => {
    const updated = saveSettings(partial || {});
    syncRuntimeFromSettings(updated);
    return updated;
  });
  ipcMain.handle('copyboard:settings.saveDebounced', async (_e, partial) =>
    saveSettingsDebounced(partial || {}),
  );
  ipcMain.handle('copyboard:settings.setCloseMode', (_e, behavior) => {
    closeMode = behavior;
    saveSettings({ closeBehavior: behavior });
    return true;
  });
  ipcMain.handle('copyboard:settings.getCloseMode', () => closeMode);
  ipcMain.handle('copyboard:settings.setLaunchHidden', (_e, hidden) => {
    launchHidden = hidden;
    saveSettings({ startMinimized: hidden });
    if (loginEnabled) configureLoginItem(true);
    return true;
  });
  ipcMain.handle('copyboard:settings.getLaunchHidden', () => loadSettings().startMinimized ?? launchHidden);
  ipcMain.handle('copyboard:settings.getLanguage', () => loadSettings().language || 'ru');
  ipcMain.handle('copyboard:settings.setLanguage', (_e, language) => {
    saveSettings({ language });
    rebuildTrayMenu(language);
    return true;
  });
  ipcMain.handle('copyboard:settings.setAutoStart', (_e, enabled) => {
    const ok = configureLoginItem(enabled);
    if (ok) saveSettings({ autoStart: enabled });
    return ok;
  });
  ipcMain.handle('copyboard:settings.getAutoStart', () => loginItemSnapshot().openAtLogin);
  ipcMain.handle('copyboard:settings.getAutoStartStatus', () => loginItemSnapshot());
  ipcMain.handle('copyboard:settings.setHotkeys', (_e, next) => {
    shortcuts = {
      reveal: next?.quickAccess || shortcuts.reveal,
      wipeHistory: next?.clearAll || shortcuts.wipeHistory,
    };
    saveSettings({
      quickAccessHotkey: shortcuts.reveal,
      clearAllHotkey: shortcuts.wipeHistory,
    });
    bindGlobalShortcuts();
    return true;
  });
  ipcMain.handle('copyboard:settings.getHotkeys', () => ({
    quickAccess: shortcuts.reveal,
    clearAll: shortcuts.wipeHistory,
  }));

  ipcMain.handle('copyboard:history.load', () => loadHistory());
  ipcMain.handle('copyboard:history.save', (_e, items) => {
    saveHistory(items || []);
    return true;
  });
  ipcMain.handle('copyboard:history.saveDebounced', async (_e, items) => {
    await saveHistoryDebounced(items || []);
    return true;
  });
  ipcMain.handle('copyboard:history.clear', () => {
    clearHistoryStore();
    return true;
  });
  ipcMain.handle('copyboard:history.migrate', (_e, items) => migrateLegacyHistory(items || []));

  ipcMain.handle('copyboard:favorites.load', () => loadFrequentItems());
  ipcMain.handle('copyboard:favorites.save', (_e, items) => {
    const saved = saveFrequentItems(items || []);
    rebuildTrayMenu();
    return saved;
  });
}

function createMainWindow() {
  applyLaunchFlags();

  const iconPath = path.join(app.getAppPath(), 'dist-react', 'images', 'CopyBoard_Logo.png');

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: WINDOW_MIN_W,
    minHeight: WINDOW_MIN_H,
    icon: iconPath,
    frame: false,
    titleBarStyle: 'hidden',
    roundedCorners: true,
    show: !launchHidden,
    backgroundColor: '#0f172a',
    hasShadow: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, destination) => {
    if (destination !== mainWindow.webContents.getURL()) event.preventDefault();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000');
  } else {
    const indexPath = resolveIndexHtml();
    if (indexPath) mainWindow.loadFile(indexPath);
    else mainWindow.loadURL(`file://${path.join(process.cwd(), 'dist-react', 'index.html')}`);
  }

  mainWindow.once('ready-to-show', () => {
    if (!launchHidden || process.env.NODE_ENV === 'development') {
      mainWindow.show();
      mainWindow.focus();
    }
    setTimeout(() => {
      watcher.start();
      bindGlobalShortcuts();
    }, 750);
  });

  mainWindow.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      if (closeMode === 'minimize') concealWindow();
      else exitApp();
    }
  });

  mainWindow.on('show', () => {
    if (!watcher.isRunning) watcher.start();
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('copyboard:window.maximized', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('copyboard:window.maximized', false);
  });

  createTrayIcon();
}

app.whenReady().then(() => {
  syncRuntimeFromSettings(loadSettings());
  registerIpc();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else revealWindow();
  });
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});

app.on('before-quit', () => {
  quitting = true;
  watcher.stop();
  globalShortcut.unregisterAll();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('copyboard:history.flush');
  }
});

app.on('will-quit', () => {
  watcher.stop();
  globalShortcut.unregisterAll();
  if (tray) tray.destroy();
});
