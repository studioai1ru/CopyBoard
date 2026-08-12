import { useCallback, useEffect, useState } from 'react';
import { createEntryId, favoriteLabel } from '../utils/clipboardUtils';
import { detectFavoriteIcon, normalizeFavoriteIcon } from '../utils/favoriteIcons';
import { desktop } from '../utils/desktop';

export function useFrequentItems() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const api = desktop();
        const data = api?.favorites?.load ? await api.favorites.load() : [];
        if (alive) setItems(Array.isArray(data) ? data : []);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback(async (nextItems) => {
    setItems(nextItems);
    const api = desktop();
    if (api?.favorites?.save) await api.favorites.save(nextItems);
  }, []);

  const addItem = useCallback(async (label, content, icon) => {
    const trimmed = String(content || '').trim();
    if (!trimmed) return false;
    if (items.some((row) => row.content === trimmed)) return false;

    await persist([
      {
        id: createEntryId(),
        label: favoriteLabel(label, trimmed),
        content: trimmed,
        icon: normalizeFavoriteIcon(icon, trimmed),
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

  const updateItem = useCallback(async (id, label, content, icon) => {
    const trimmed = String(content || '').trim();
    if (!trimmed) return false;
    await persist(
      items.map((row) =>
        row.id === id
          ? {
              ...row,
              label: favoriteLabel(label, trimmed),
              content: trimmed,
              icon: normalizeFavoriteIcon(icon, trimmed),
              updatedAt: new Date().toISOString(),
            }
          : row,
      ),
    );
    return true;
  }, [items, persist]);

  const deleteItem = useCallback(async (id) => {
    await persist(items.filter((row) => row.id !== id));
  }, [items, persist]);

  const hasContent = useCallback(
    (content) => items.some((row) => row.content === content),
    [items],
  );

  return {
    items,
    loaded,
    addItem,
    addFromClipboardItem,
    toggleFromClipboardItem,
    removeByContent,
    updateItem,
    deleteItem,
    hasContent,
  };
}
