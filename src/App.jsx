import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header';
import TitleBar from './components/TitleBar';
import ClipboardHistory from './components/ClipboardHistory';
import FrequentPanel from './components/FrequentPanel';
import FrequentEditModal from './components/FrequentEditModal';
import EditModal from './components/EditModal';
import SettingsModal from './components/SettingsModal';
import { LanguageProvider } from './utils/i18n';
import { appearance } from './utils/appearance';
import { handleGlobalEscape } from './utils/escapeStack';
import { desktop } from './utils/desktop';
import { useSettings } from './hooks/useSettings';
import { useClipboardHistory } from './hooks/useClipboardHistory';
import { useFrequentItems } from './hooks/useFrequentItems';
import { resolveFavoriteIcon } from './utils/favoriteIcons';
import { favoriteContentKey } from './utils/clipboardUtils';
import './scss/App.scss';

window.addEventListener('contextmenu', (event) => event.preventDefault());

function App() {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editingFavorite, setEditingFavorite] = useState(null);
  const [theme, setTheme] = useState(() => appearance.getCurrentTheme());
  const [isThemeChanging, setIsThemeChanging] = useState(false);
  const searchInputRef = useRef(null);
  const bootLanguageRef = useRef(null);

  useEffect(() => {
    const boot = async () => {
      const current = appearance.getCurrentTheme();
      const safe = ['system', 'dark', 'light'].includes(current) ? current : 'system';
      setTheme(safe);
      await appearance.applyTheme(safe);
    };
    boot();
  }, []);

  useEffect(() => {
    desktop()?.window?.ready?.();
  }, []);

  const handleThemeChange = useCallback(async (newTheme) => {
    if (isThemeChanging) return;
    if (!['system', 'dark', 'light'].includes(newTheme)) return;

    try {
      setIsThemeChanging(true);
      await appearance.applyTheme(newTheme);
      setTheme(newTheme);
    } catch (error) {
      console.error('Theme change failed:', error);
    } finally {
      setIsThemeChanging(false);
    }
  }, [isThemeChanging]);

  const {
    language,
    setLanguage,
    viewMode,
    setViewMode,
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
    maxItems,
    setMaxItems,
    autoDelete,
    setAutoDelete,
    settingsLoaded,
    resetSettings,
  } = useSettings({ theme, handleThemeChange });

  const {
    loading,
    clipboardHistory,
    clearHistory,
    deleteItem,
    copyToClipboard,
    handleSaveEdit,
  } = useClipboardHistory({ maxItems, autoDelete });

  const {
    items: frequentItems,
    toggleFromClipboardItem,
    updateItem: updateFrequentItem,
    deleteItem: deleteFrequentItem,
    reorderItem: reorderFrequentItem,
  } = useFrequentItems();

  const favoriteContents = useMemo(
    () => new Set(frequentItems.map((item) => favoriteContentKey(item.content))),
    [frequentItems],
  );

  const typeCounts = useMemo(() => {
    const counts = { text: 0, image: 0, code: 0, file: 0 };
    for (const row of clipboardHistory) {
      if (counts[row.type] !== undefined) counts[row.type] += 1;
    }
    return counts;
  }, [clipboardHistory]);

  useEffect(() => {
    const api = desktop();
    if (!api?.ui?.onFocusSearch) return undefined;
    return api.ui.onFocusSearch(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }, []);

  useEffect(() => {
    const api = desktop();
    if (!api?.ui?.onOpenSettings) return undefined;
    return api.ui.onOpenSettings(() => setShowSettings(true));
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (handleGlobalEscape(event)) return;
      event.preventDefault();
      desktop()?.window?.hide?.();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return clipboardHistory.filter((item) => {
      const matchesFilter = filter === 'all' || item.type === filter;
      const matchesSearch =
        !q ||
        item.content.toLowerCase().includes(q) ||
        item.preview.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [clipboardHistory, filter, searchQuery]);

  const filteredFrequentItems = useMemo(
    () => frequentItems.filter((item) => {
      const favoriteIcon = resolveFavoriteIcon(item);
      const favoriteType = ['image', 'code', 'file'].includes(favoriteIcon)
        ? favoriteIcon
        : 'text';
      return filter === 'all' || favoriteType === filter;
    }),
    [filter, frequentItems],
  );

  if (settingsLoaded && bootLanguageRef.current === null) {
    bootLanguageRef.current = language;
  }

  return (
    <LanguageProvider initialLanguage={settingsLoaded ? bootLanguageRef.current : null}>
      <div className="app">
        <TitleBar />
        <Header
          filter={filter}
          setFilter={setFilter}
          totalItems={clipboardHistory.length}
          typeCounts={typeCounts}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onOpenSettings={() => setShowSettings(true)}
          searchInputRef={searchInputRef}
        />

        <FrequentPanel
          items={filteredFrequentItems}
          onCopy={copyToClipboard}
          onEdit={setEditingFavorite}
          onDelete={deleteFrequentItem}
          onReorder={reorderFrequentItem}
        />

        <main className="main-content">
          {loading ? (
            <div className="boot-spinner-wrap">
              <div className="boot-spinner" />
            </div>
          ) : (
            <ClipboardHistory
              items={filteredHistory}
              onDelete={deleteItem}
              onCopy={copyToClipboard}
              onEdit={setEditingEntry}
              onAddFavorite={toggleFromClipboardItem}
              favoriteContents={favoriteContents}
              viewMode={viewMode}
              searchQuery={searchQuery}
            />
          )}
        </main>

        {editingEntry && (
          <EditModal
            item={editingEntry}
            onSave={(id, content) => {
              handleSaveEdit(id, content);
              setEditingEntry(null);
            }}
            onCancel={() => setEditingEntry(null)}
          />
        )}

        {editingFavorite && (
          <FrequentEditModal
            item={editingFavorite}
            onSave={updateFrequentItem}
            onClose={() => setEditingFavorite(null)}
          />
        )}

        <SettingsModal
          open={showSettings}
          onDismiss={() => setShowSettings(false)}
          onClearHistory={clearHistory}
          onRestoreDefaults={resetSettings}
          preferences={{
            current: {
              viewMode,
              theme,
              closeBehavior,
              startMinimized,
              autoStart,
              showTrayNotifications,
              quickAccessEnabled,
              showQuickAccessEdge,
              maxItems,
              autoDelete,
            },
            change: {
              viewMode: setViewMode,
              theme: handleThemeChange,
              language: setLanguage,
              closeBehavior: setCloseBehavior,
              startMinimized: setStartMinimized,
              autoStart: setAutoStart,
              showTrayNotifications: setShowTrayNotifications,
              quickAccessEnabled: setQuickAccessEnabled,
              showQuickAccessEdge: setShowQuickAccessEdge,
              maxItems: setMaxItems,
              autoDelete: setAutoDelete,
            },
          }}
        />
      </div>
    </LanguageProvider>
  );
}

export default App;
