import { useCallback, useEffect, useRef, useState } from 'react';
import { desktop } from '../utils/desktop';
import {
  DEFAULT_QUICK_ACCESS_EDGE_VISIBLE,
  DEFAULT_QUICK_ACCESS_ENABLED,
  normalizeQuickAccessEdgeVisible,
  normalizeQuickAccessEnabled,
} from '../utils/quickAccessSettings';

const DEFAULTS = {
  language: 'ru',
  viewMode: 'list',
  closeBehavior: 'minimize',
  startMinimized: false,
  autoStart: true,
  showTrayNotifications: true,
  quickAccessEnabled: DEFAULT_QUICK_ACCESS_ENABLED,
  showQuickAccessEdge: DEFAULT_QUICK_ACCESS_EDGE_VISIBLE,
  quickAccessHotkey: 'Ctrl+Shift+V',
  clearAllHotkey: 'Ctrl+Shift+Delete',
  maxItems: 100,
  autoDelete: 'never',
  theme: 'system',
};

const THEMES = ['system', 'dark', 'light'];

function readLegacyLocal() {
  try {
    const raw = localStorage.getItem('appSettings');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useSettings({ theme, handleThemeChange, availableThemes = THEMES }) {
  const [language, setLanguage] = useState('ru');
  const [viewMode, setViewMode] = useState('list');
  const [closeBehavior, setCloseBehavior] = useState('minimize');
  const [startMinimized, setStartMinimized] = useState(false);
  const [autoStart, setAutoStart] = useState(true);
  const [showTrayNotifications, setShowTrayNotifications] = useState(true);
  const [quickAccessEnabled, setQuickAccessEnabled] = useState(DEFAULT_QUICK_ACCESS_ENABLED);
  const [showQuickAccessEdge, setShowQuickAccessEdge] = useState(
    DEFAULT_QUICK_ACCESS_EDGE_VISIBLE,
  );
  const [quickAccessHotkey, setQuickAccessHotkey] = useState('Ctrl+Shift+V');
  const [clearAllHotkey, setClearAllHotkey] = useState('Ctrl+Shift+Delete');
  const [maxItems, setMaxItems] = useState(100);
  const [autoDelete, setAutoDelete] = useState('never');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const loadedRef = useRef(false);
  const bootRef = useRef(false);
  const themeOnceRef = useRef(false);
  const onThemeRef = useRef(handleThemeChange);
  const themesRef = useRef(availableThemes);
  onThemeRef.current = handleThemeChange;
  themesRef.current = availableThemes;

  const updateViewMode = useCallback((value) => {
    setViewMode((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      return next === prev ? prev : next;
    });
  }, []);

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    let alive = true;

    (async () => {
      try {
        const api = desktop();
        let settings = api?.settings?.get ? await api.settings.get() : null;
        const legacy = readLegacyLocal();
        if (legacy) settings = { ...legacy, ...(settings || {}) };
        if (!settings) settings = { ...DEFAULTS };

        delete settings.monitorClipboard;
        delete settings.saveOnClose;

        if (!alive) return;

        if (settings.language) setLanguage(settings.language);
        if (settings.viewMode) updateViewMode(settings.viewMode);
        if (settings.closeBehavior) setCloseBehavior(settings.closeBehavior);
        if (settings.startMinimized !== undefined) setStartMinimized(settings.startMinimized);
        if (settings.showTrayNotifications !== undefined) {
          setShowTrayNotifications(settings.showTrayNotifications);
        }
        setQuickAccessEnabled(normalizeQuickAccessEnabled(settings.quickAccessEnabled));
        setShowQuickAccessEdge(normalizeQuickAccessEdgeVisible(settings.showQuickAccessEdge));
        if (settings.quickAccessHotkey) setQuickAccessHotkey(settings.quickAccessHotkey);
        if (settings.clearAllHotkey) setClearAllHotkey(settings.clearAllHotkey);
        if (settings.maxItems !== undefined) setMaxItems(Number(settings.maxItems) || 100);
        if (settings.autoDelete) setAutoDelete(settings.autoDelete);
        if (settings.autoStart !== undefined) setAutoStart(settings.autoStart);

        if (
          settings.theme &&
          themesRef.current.includes(settings.theme) &&
          !themeOnceRef.current
        ) {
          themeOnceRef.current = true;
          await onThemeRef.current(settings.theme);
        }

        if (api?.settings?.save) await api.settings.save(settings);
      } catch (error) {
        console.error('Settings load failed:', error);
      } finally {
        if (alive) {
          loadedRef.current = true;
          setSettingsLoaded(true);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [updateViewMode]);

  useEffect(() => {
    if (!loadedRef.current) return;
    const api = desktop();
    const bundle = {
      theme,
      language,
      viewMode,
      closeBehavior,
      startMinimized,
      autoStart,
      showTrayNotifications,
      quickAccessEnabled,
      showQuickAccessEdge,
      quickAccessHotkey,
      clearAllHotkey,
      maxItems,
      autoDelete,
    };

    localStorage.setItem('appSettings', JSON.stringify(bundle));
    localStorage.setItem('appLanguage', language);

    if (api?.settings?.saveDebounced) api.settings.saveDebounced(bundle);
    else if (api?.settings?.save) api.settings.save(bundle);
  }, [
    theme,
    language,
    viewMode,
    closeBehavior,
    startMinimized,
    autoStart,
    showTrayNotifications,
    quickAccessEnabled,
    showQuickAccessEdge,
    quickAccessHotkey,
    clearAllHotkey,
    maxItems,
    autoDelete,
  ]);

  useEffect(() => {
    if (!loadedRef.current) return;
    desktop()?.settings?.setLaunchHidden?.(startMinimized);
  }, [startMinimized, settingsLoaded]);

  useEffect(() => {
    if (!loadedRef.current) return;
    desktop()?.settings?.setCloseMode?.(closeBehavior);
  }, [closeBehavior, settingsLoaded]);

  useEffect(() => {
    if (!loadedRef.current) return;
    desktop()?.settings?.setAutoStart?.(autoStart);
  }, [autoStart, settingsLoaded]);

  useEffect(() => {
    if (!loadedRef.current) return;
    desktop()?.quickAccess?.setEnabled?.(quickAccessEnabled);
  }, [settingsLoaded, quickAccessEnabled]);

  useEffect(() => {
    if (!loadedRef.current || !quickAccessEnabled) return;
    desktop()?.quickAccess?.setEdgeVisible?.(showQuickAccessEdge);
  }, [settingsLoaded, quickAccessEnabled, showQuickAccessEdge]);

  useEffect(() => {
    if (!loadedRef.current) return;
    desktop()?.settings?.setHotkeys?.({
      quickAccess: quickAccessHotkey,
      clearAll: clearAllHotkey,
    });
  }, [quickAccessHotkey, clearAllHotkey, settingsLoaded]);

  const resetSettings = useCallback(async () => {
    const defaults = { ...DEFAULTS };
    setViewMode(defaults.viewMode);
    setLanguage(defaults.language);
    setCloseBehavior(defaults.closeBehavior);
    setStartMinimized(defaults.startMinimized);
    setAutoStart(defaults.autoStart);
    setShowTrayNotifications(defaults.showTrayNotifications);
    setQuickAccessEnabled(defaults.quickAccessEnabled);
    setShowQuickAccessEdge(defaults.showQuickAccessEdge);
    setQuickAccessHotkey(defaults.quickAccessHotkey);
    setClearAllHotkey(defaults.clearAllHotkey);
    setMaxItems(defaults.maxItems);
    setAutoDelete(defaults.autoDelete);

    const api = desktop();
    if (api?.settings?.save) {
      await api.settings.save({ ...defaults, theme: 'system' });
    }
    await handleThemeChange('system');
  }, [handleThemeChange]);

  return {
    language,
    setLanguage,
    viewMode,
    setViewMode: updateViewMode,
    closeBehavior,
    setCloseBehavior,
    startMinimized,
    setStartMinimized,
    autoStart,
    setAutoStart,
    showTrayNotifications,
    setShowTrayNotifications,
    quickAccessEnabled,
    setQuickAccessEnabled,
    showQuickAccessEdge,
    setShowQuickAccessEdge,
    quickAccessHotkey,
    setQuickAccessHotkey,
    clearAllHotkey,
    setClearAllHotkey,
    maxItems,
    setMaxItems,
    autoDelete,
    setAutoDelete,
    settingsLoaded,
    settingsLoadedRef: loadedRef,
    resetSettings,
  };
}
