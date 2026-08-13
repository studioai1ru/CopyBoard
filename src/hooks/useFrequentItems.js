import { useCallback, useEffect, useState } from 'react';
import { createEntryId, favoriteLabel } from '../utils/clipboardUtils';
import {
  detectFavoriteIcon,
  normalizeFavoriteDisplayMode,
  normalizeFavoriteIcon,
} from '../utils/favoriteIcons';
import { desktop } from '../utils/desktop';

export function useFrequentItems() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refreshItems = useCallback(async () => {
    try {
      const api = desktop();
      const data = api?.favorites?.load ? await api.favorites.load() : [];
      const nextItems = Array.isArray(data) ? data : [];
      setItems(nextItems);
      return nextItems;
    } catch {
      setItems([]);
      return [];
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  useEffect(() => {
    const api = desktop();
    if (!api?.favorites?.onChanged) return undefined;
    return api.favorites.onChanged((nextItems) => {
      setItems(Array.isArray(nextItems) ? nextItems : []);
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (nextItems) => {
    setItems(nextItems);
    const api = desktop();
    if (api?.favorites?.save) await api.favorites.save(nextItems);
  }, []);

  const addItem = useCallback(async (label, content, icon, displayMode = 'icon-text') => {
    const trimmed = String(content || '').trim();
    if (!trimmed) return false;
    if (items.some((row) => row.content === trimmed)) return false;

    await persist([
      {
        id: createEntryId(),
        label: favoriteLabel(label, trimmed),
        content: trimmed,
        icon: normalizeFavoriteIcon(icon, trimmed),
        displayMode: normalizeFavoriteDisplayMode(displayMode),
        createdAt: new Date().toISOString(),
      },
      ...items,
    ]);
    return true;
  }, [items, persist]);

  const addFromClipboardItem = useCallback(
    async (clipboardItem) => {
      if (!clipboardItem?.content) return false;
      return addItem('', clipboardItem.content, detectFavoriteIcon(clipboardItem.content));
    },
    [addItem],
  );

  const removeByContent = useCallback(async (content) => {
    if (!content) return false;
    if (!items.some((row) => row.content === content)) return false;
    await persist(items.filter((row) => row.content !== content));
    return true;
  }, [items, persist]);

  const toggleFromClipboardItem = useCallback(async (clipboardItem) => {
    if (!clipboardItem?.content) return false;
    if (items.some((row) => row.content === clipboardItem.content)) {
      await persist(items.filter((row) => row.content !== clipboardItem.content));
      return false;
    }
    return addItem('', clipboardItem.content, detectFavoriteIcon(clipboardItem.content));
  }, [addItem, items, persist]);

  const updateItem = useCallback(async (id, label, content, icon, displayMode = 'icon-text') => {
    const trimmed = String(content || '').trim();
    if (!trimmed) return false;
    const current = items.find((row) => row.id === id);
    if (!current) return false;
    const updated = {
      ...current,
      label: favoriteLabel(label, trimmed),
      content: trimmed,
      icon: normalizeFavoriteIcon(icon, trimmed),
      displayMode: normalizeFavoriteDisplayMode(displayMode),
      updatedAt: new Date().toISOString(),
    };
    const api = desktop();
    if (api?.favorites?.update) {
      const saved = await api.favorites.update(updated);
      setItems(Array.isArray(saved) ? saved : []);
    } else {
      await persist(items.map((row) => (row.id === id ? updated : row)));
    }
    return true;
  }, [items, persist]);

  const deleteItem = useCallback(async (id) => {
    const api = desktop();
    if (api?.favorites?.delete) {
      const saved = await api.favorites.delete(id);
      setItems(Array.isArray(saved) ? saved : []);
    } else {
      await persist(items.filter((row) => row.id !== id));
    }
  }, [items, persist]);

  const reorderItem = useCallback(async (activeId, targetId = null) => {
    const fromIndex = items.findIndex((row) => row.id === activeId);
    if (fromIndex < 0) return false;

    const targetIndex = targetId === null
      ? items.length - 1
      : items.findIndex((row) => row.id === targetId);
    if (targetIndex < 0 || targetIndex === fromIndex) return false;

    const nextItems = [...items];
    const [movedItem] = nextItems.splice(fromIndex, 1);
    nextItems.splice(targetIndex, 0, movedItem);
    await persist(nextItems);
    return true;
  }, [items, persist]);

  const hasContent = useCallback(
    (content) => items.some((row) => row.content === content),
    [items],
  );

  return {
    items,
    loaded,
    refreshItems,
    addItem,
    addFromClipboardItem,
    toggleFromClipboardItem,
    removeByContent,
    updateItem,
    deleteItem,
    reorderItem,
    hasContent,
  };
}
