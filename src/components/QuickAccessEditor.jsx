import { useCallback, useEffect, useState } from 'react';
import { useFrequentItems } from '../hooks/useFrequentItems';
import { desktop } from '../utils/desktop';
import { LanguageProvider } from '../utils/i18n';
import { appearance } from '../utils/appearance';
import { handleGlobalEscape } from '../utils/escapeStack';
import FrequentEditModal from './FrequentEditModal';

function QuickAccessEditor() {
  const { refreshItems, updateItem } = useFrequentItems();
  const [editingItem, setEditingItem] = useState(null);

  const closeEditor = useCallback(async () => {
    setEditingItem(null);
    await desktop()?.quickAccess?.closeEditor?.();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => handleGlobalEscape(event);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    let active = true;
    const syncItem = async () => {
      const [item] = await Promise.all([
        desktop()?.quickAccess?.getEditorItem?.(),
        refreshItems(),
      ]);
      if (active) setEditingItem(item || null);
    };
    const offItem = desktop()?.quickAccess?.onEditorItemChange?.((item) => {
      refreshItems().finally(() => {
        if (active) setEditingItem(item || null);
      });
    }, syncItem);
    window.addEventListener('focus', syncItem);
    document.addEventListener('visibilitychange', syncItem);
    return () => {
      active = false;
      offItem?.();
      window.removeEventListener('focus', syncItem);
      document.removeEventListener('visibilitychange', syncItem);
    };
  }, [refreshItems]);

  return editingItem ? (
    <FrequentEditModal
      item={editingItem}
      onSave={updateItem}
      onClose={closeEditor}
    />
  ) : null;
}

export default function QuickAccessEditorSurface() {
  const [language, setLanguage] = useState(
    () => localStorage.getItem('copyboard.language') || localStorage.getItem('appLanguage') || 'ru',
  );

  useEffect(() => {
    document.body.classList.add('quick-access-editor-surface');
    let active = true;
    (async () => {
      const settings = await desktop()?.settings?.get?.();
      const theme = settings?.theme || appearance.getCurrentTheme();
      const resolved = theme === 'system'
        ? await desktop()?.settings?.getResolvedTheme?.()
        : theme;
      await appearance.applyTheme(theme, resolved);
      if (active) setLanguage(settings?.language || 'ru');
    })().catch(() => {
      if (active) setLanguage('ru');
    });
    const syncLanguage = (event) => {
      if (event.key === 'copyboard.language' || event.key === 'appLanguage') {
        setLanguage(event.newValue || 'ru');
      }
    };
    window.addEventListener('storage', syncLanguage);
    return () => {
      active = false;
      document.body.classList.remove('quick-access-editor-surface');
      window.removeEventListener('storage', syncLanguage);
    };
  }, []);

  return (
    <LanguageProvider initialLanguage={language}>
      <QuickAccessEditor />
    </LanguageProvider>
  );
}
