const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const handler = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api = {
  window: {
    minimize: () => ipcRenderer.invoke('copyboard:window.minimize'),
    toggleMaximize: () => ipcRenderer.invoke('copyboard:window.toggleMaximize'),
    close: () => ipcRenderer.invoke('copyboard:window.close'),
    isMaximized: () => ipcRenderer.invoke('copyboard:window.isMaximized'),
    show: () => ipcRenderer.invoke('copyboard:window.show'),
    hide: () => ipcRenderer.invoke('copyboard:window.hide'),
    onMaximizedChange: (cb) => subscribe('copyboard:window.maximized', cb),
  },

  clip: {
    start: () => ipcRenderer.invoke('copyboard:clip.start'),
    stop: () => ipcRenderer.invoke('copyboard:clip.stop'),
    readText: () => ipcRenderer.invoke('copyboard:clip.readText'),
    readImage: () => ipcRenderer.invoke('copyboard:clip.readImage'),
    writeText: (text) => ipcRenderer.invoke('copyboard:clip.writeText', text),
    writeImage: (dataUrl) => ipcRenderer.invoke('copyboard:clip.writeImage', dataUrl),
    suppress: (ms) => ipcRenderer.invoke('copyboard:clip.suppress', ms),
    onCapture: (cb) => subscribe('copyboard:clip.capture', cb),
  },

  settings: {
    get: () => ipcRenderer.invoke('copyboard:settings.get'),
    save: (partial) => ipcRenderer.invoke('copyboard:settings.save', partial),
    saveDebounced: (partial) => ipcRenderer.invoke('copyboard:settings.saveDebounced', partial),
    setCloseMode: (mode) => ipcRenderer.invoke('copyboard:settings.setCloseMode', mode),
    getCloseMode: () => ipcRenderer.invoke('copyboard:settings.getCloseMode'),
    setLaunchHidden: (hidden) => ipcRenderer.invoke('copyboard:settings.setLaunchHidden', hidden),
    getLaunchHidden: () => ipcRenderer.invoke('copyboard:settings.getLaunchHidden'),
    getLanguage: () => ipcRenderer.invoke('copyboard:settings.getLanguage'),
    setLanguage: (language) => ipcRenderer.invoke('copyboard:settings.setLanguage', language),
    setAutoStart: (enabled) => ipcRenderer.invoke('copyboard:settings.setAutoStart', enabled),
    getAutoStart: () => ipcRenderer.invoke('copyboard:settings.getAutoStart'),
    getAutoStartStatus: () => ipcRenderer.invoke('copyboard:settings.getAutoStartStatus'),
    setHotkeys: (hotkeys) => ipcRenderer.invoke('copyboard:settings.setHotkeys', hotkeys),
    getHotkeys: () => ipcRenderer.invoke('copyboard:settings.getHotkeys'),
  },

  history: {
    load: () => ipcRenderer.invoke('copyboard:history.load'),
    save: (items) => ipcRenderer.invoke('copyboard:history.save', items),
    saveDebounced: (items) => ipcRenderer.invoke('copyboard:history.saveDebounced', items),
    clear: () => ipcRenderer.invoke('copyboard:history.clear'),
    migrate: (items) => ipcRenderer.invoke('copyboard:history.migrate', items),
    onWipeShortcut: (cb) => subscribe('copyboard:history.wipeShortcut', cb),
    onFlush: (cb) => subscribe('copyboard:history.flush', cb),
  },

  favorites: {
    load: () => ipcRenderer.invoke('copyboard:favorites.load'),
    save: (items) => ipcRenderer.invoke('copyboard:favorites.save', items),
  },

  ui: {
    onFocusSearch: (cb) => subscribe('copyboard:ui.focusSearch', cb),
    onOpenSettings: (cb) => subscribe('copyboard:ui.openSettings', cb),
  },

  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0',
};

contextBridge.exposeInMainWorld('copyboard', api);
