import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

function subscribe(channel, callback, onReady) {
  let active = true;
  let dispose = null;

  listen(channel, (event) => callback(event.payload))
    .then((unlisten) => {
      if (active) {
        dispose = unlisten;
        onReady?.();
      }
      else unlisten();
    })
    .catch((error) => console.error(`Failed to subscribe to ${channel}:`, error));

  return () => {
    active = false;
    dispose?.();
  };
}

const api = {
  window: {
    ready: () => invoke('window_ready'),
    minimize: () => invoke('window_minimize'),
    toggleMaximize: () => invoke('window_toggle_maximize'),
    close: () => invoke('window_close'),
    isMaximized: () => invoke('window_is_maximized'),
    show: () => invoke('window_show'),
    hide: () => invoke('window_hide'),
    onMaximizedChange: (callback) => subscribe('copyboard:window.maximized', callback),
  },
  clip: {
    readText: () => invoke('clip_read_text'),
    readImage: () => invoke('clip_read_image'),
    writeText: (text, recordHistory = false) => (
      invoke('clip_write_text', { text, recordHistory })
    ),
    writeImage: (dataUrl, recordHistory = false) => (
      invoke('clip_write_image', { dataUrl, recordHistory })
    ),
    writeFiles: (files, recordHistory = false) => (
      invoke('clip_write_files', { files, recordHistory })
    ),
    onCapture: (callback, onReady) => (
      subscribe('copyboard:clip.capture', callback, onReady)
    ),
  },
  settings: {
    get: () => invoke('settings_get'),
    save: (partial) => invoke('settings_save', { partial }),
    saveDebounced: (partial) => invoke('settings_save', { partial }),
    setCloseMode: (mode) => invoke('settings_set_close_mode', { mode }),
    getCloseMode: () => invoke('settings_get_close_mode'),
    setLaunchHidden: (hidden) => invoke('settings_set_launch_hidden', { hidden }),
    getLaunchHidden: () => invoke('settings_get_launch_hidden'),
    getLanguage: () => invoke('settings_get_language'),
    setLanguage: (language) => invoke('settings_set_language', { language }),
    setAutoStart: (enabled) => invoke('settings_set_auto_start', { enabled }),
    getAutoStart: () => invoke('settings_get_auto_start'),
    getAutoStartStatus: () => invoke('settings_get_auto_start_status'),
    setHotkeys: (hotkeys) => invoke('settings_set_hotkeys', { hotkeys }),
    getHotkeys: () => invoke('settings_get_hotkeys'),
  },
  history: {
    load: () => invoke('history_load'),
    save: (items) => invoke('history_save', { items }),
    saveDebounced: (items) => invoke('history_save', { items }),
    clear: () => invoke('history_clear'),
    migrate: (items) => invoke('history_migrate', { items }),
    onWipeShortcut: (callback) => subscribe('copyboard:history.wipeShortcut', callback),
  },
  favorites: {
    load: () => invoke('favorites_load'),
    save: (items) => invoke('favorites_save', { items }),
    onChanged: (callback) => subscribe('copyboard:favorites.changed', callback),
  },
  quickAccess: {
    ready: (size) => invoke('quick_access_ready', size),
    configure: (size) => invoke('quick_access_configure', size),
    setEdgeVisible: (visible) => invoke('quick_access_set_edge_visible', { visible }),
    setOpen: (open, reduceMotion = false) => (
      invoke('quick_access_set_open', { open, reduceMotion })
    ),
    onOpenRequested: (callback) => (
      subscribe('copyboard:quickAccess.openRequested', callback)
    ),
  },
  ui: {
    onFocusSearch: (callback) => subscribe('copyboard:ui.focusSearch', callback),
    onOpenSettings: (callback) => subscribe('copyboard:ui.openSettings', callback),
  },
  platform: navigator.platform,
};

/** Renderer ↔ Tauri bridge accessor. */
export function desktop() {
  if (typeof window === 'undefined') return null;
  return isTauri() ? api : null;
}

export function isDesktop() {
  return Boolean(desktop());
}
