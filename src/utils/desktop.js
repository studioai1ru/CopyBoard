import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const STARTUP_RETRY_DELAYS = [
  0, 25, 50, 100, 200, 400, 800,
  ...Array.from({ length: 20 }, () => 1000),
];
let nativeReadyPromise = null;

const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

async function ensureNativeReady() {
  if (!nativeReadyPromise) {
    nativeReadyPromise = (async () => {
      let lastError;
      for (const delay of STARTUP_RETRY_DELAYS) {
        if (delay > 0) await wait(delay);
        try {
          await invoke('runtime_ready');
          return true;
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError || new Error('CopyBoard native runtime did not become ready');
    })().catch((error) => {
      nativeReadyPromise = null;
      throw error;
    });
  }
  return nativeReadyPromise;
}

async function invokeNative(command, args) {
  await ensureNativeReady();
  return invoke(command, args);
}

function subscribe(channel, callback, onReady) {
  let active = true;
  let dispose = null;

  ensureNativeReady()
    .then(() => listen(channel, (event) => callback(event.payload)))
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

function subscribeWindow(channel, callback, onReady) {
  const handler = (event) => callback(event.detail);
  window.addEventListener(channel, handler);
  queueMicrotask(() => onReady?.());
  return () => window.removeEventListener(channel, handler);
}

const api = {
  window: {
    ready: () => invokeNative('window_ready'),
    minimize: () => invokeNative('window_minimize'),
    toggleMaximize: () => invokeNative('window_toggle_maximize'),
    close: () => invokeNative('window_close'),
    isMaximized: () => invokeNative('window_is_maximized'),
    show: () => invokeNative('window_show'),
    hide: () => invokeNative('window_hide'),
    onMaximizedChange: (callback) => subscribe('copyboard:window.maximized', callback),
  },
  clip: {
    readText: () => invokeNative('clip_read_text'),
    readImage: () => invokeNative('clip_read_image'),
    writeText: (text, recordHistory = false) => (
      invokeNative('clip_write_text', { text, recordHistory })
    ),
    writeImage: (dataUrl, recordHistory = false) => (
      invokeNative('clip_write_image', { dataUrl, recordHistory })
    ),
    writeFiles: (files, recordHistory = false) => (
      invokeNative('clip_write_files', { files, recordHistory })
    ),
  },
  settings: {
    get: () => invokeNative('settings_get'),
    save: (partial) => invokeNative('settings_save', { partial }),
    saveDebounced: (partial) => invokeNative('settings_save', { partial }),
    setCloseMode: (mode) => invokeNative('settings_set_close_mode', { mode }),
    getCloseMode: () => invokeNative('settings_get_close_mode'),
    setLaunchHidden: (hidden) => invokeNative('settings_set_launch_hidden', { hidden }),
    getLaunchHidden: () => invokeNative('settings_get_launch_hidden'),
    getLanguage: () => invokeNative('settings_get_language'),
    getResolvedTheme: () => invokeNative('settings_get_resolved_theme'),
    setLanguage: (language) => invokeNative('settings_set_language', { language }),
    setAutoStart: (enabled) => invokeNative('settings_set_auto_start', { enabled }),
    getAutoStart: () => invokeNative('settings_get_auto_start'),
    getAutoStartStatus: () => invokeNative('settings_get_auto_start_status'),
    setHotkeys: (hotkeys) => invokeNative('settings_set_hotkeys', { hotkeys }),
    getHotkeys: () => invokeNative('settings_get_hotkeys'),
  },
  history: {
    load: () => invokeNative('history_load'),
    save: (items) => invokeNative('history_save', { items }),
    saveDebounced: (items) => invokeNative('history_save', { items }),
    clear: () => invokeNative('history_clear'),
    onChanged: (callback, onReady) => (
      subscribeWindow('copyboard:history.changed.native', callback, onReady)
    ),
    onWipeShortcut: (callback) => subscribe('copyboard:history.wipeShortcut', callback),
  },
  favorites: {
    load: () => invokeNative('favorites_load'),
    add: (item) => invokeNative('favorites_add', { item }),
    save: (items) => invokeNative('favorites_save', { items }),
    update: (item) => invokeNative('favorites_update', { item }),
    delete: (id) => invokeNative('favorites_delete', { id }),
    onChanged: (callback) => subscribe('copyboard:favorites.changed', callback),
  },
  quickAccess: {
    useEdgeAnchor: () => invokeNative('quick_access_use_edge_anchor'),
    ready: (size) => invokeNative('quick_access_ready', size),
    configure: (size) => invokeNative('quick_access_configure', size),
    setEnabled: (enabled) => invokeNative('quick_access_set_enabled', { enabled }),
    setEdgeVisible: (visible) => invokeNative('quick_access_set_edge_visible', { visible }),
    getEdgeVisible: () => invokeNative('quick_access_get_edge_visible'),
    openEditor: (id) => invokeNative('quick_access_open_editor', { id }),
    getEditorItem: () => invokeNative('quick_access_get_editor_item'),
    closeEditor: () => invokeNative('quick_access_close_editor'),
    moveHorizontal: (deltaX) => invokeNative('quick_access_move_horizontal', { deltaX }),
    commitPosition: () => invokeNative('quick_access_commit_position'),
    setOpen: (open, reduceMotion = false) => (
      invokeNative('quick_access_set_open', { open, reduceMotion })
    ),
    onOpenRequested: (callback, onReady) => (
      subscribeWindow('copyboard:quickAccess.openRequested.native', callback, onReady)
    ),
    onEdgeVisibleChange: (callback, onReady) => (
      subscribeWindow('copyboard:quickAccess.edgeVisible.native', callback, onReady)
    ),
    onEditorItemChange: (callback, onReady) => (
      subscribeWindow('copyboard:quickAccess.editorItem.native', callback, onReady)
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
