import { useCallback, useEffect, useRef, useState } from 'react';
import {
  classifyPayload,
  createHistoryEntry,
  makePreview,
  mergeHistoryEntry,
  trimHistory,
} from '../utils/clipboardUtils';
import { desktop } from '../utils/desktop';
import { parseFileReferences } from '../utils/fileReferences';

/**
 * Clipboard history store for the renderer.
 * Native monitoring persists captures; this hook keeps the visible list in sync.
 */
export function useClipboardHistory({ maxItems, autoDelete }) {
  const [loading, setLoading] = useState(true);
  const [clipboardHistory, setClipboardHistory] = useState([]);

  const lastFingerprintRef = useRef('');
  const readyRef = useRef(false);
  const historyRef = useRef([]);
  const localRevisionRef = useRef(0);

  historyRef.current = clipboardHistory;

  const fingerprint = (type, content) => `${type}::${content}`;

  const historySignature = (items) => items.map((item) => (
    `${item.id}:${item.type}:${item.timestamp}:${String(item.content || '').length}:${String(item.content || '').slice(0, 64)}`
  )).join('|');

  const persistItems = useCallback(async (next) => {
    localRevisionRef.current += 1;
    historyRef.current = next;
    setClipboardHistory(next);

    const api = desktop();
    try {
      if (api?.history?.save) await api.history.save(next);
      else if (next.length > 0) localStorage.setItem('clipboardHistory', JSON.stringify(next));
      else localStorage.removeItem('clipboardHistory');
    } catch (error) {
      console.error('History save failed:', error);
    }
  }, []);

  const commitCapture = useCallback(
    (payload) => {
      const content = payload.content;
      const typeHint = payload.type;
      const stamp = payload.timestamp;
      const kind = classifyPayload(content, typeHint);
      const mark = fingerprint(kind, content);
      const force = payload.force === true;

      if (!force && mark === lastFingerprintRef.current) return;
      if (!force && historyRef.current[0]?.content === content) {
        lastFingerprintRef.current = mark;
        return;
      }

      const entry = createHistoryEntry({ content, type: kind, timestamp: stamp });

      lastFingerprintRef.current = mark;
      localRevisionRef.current += 1;
      setClipboardHistory((prev) => {
        const next = mergeHistoryEntry(prev, entry, { maxItems, autoDelete });
        historyRef.current = next;
        return next;
      });
    },
    [autoDelete, maxItems],
  );

  const clearHistory = useCallback(async () => {
    localRevisionRef.current += 1;
    setClipboardHistory([]);
    historyRef.current = [];
    lastFingerprintRef.current = '';
    const api = desktop();
    if (api?.history?.clear) await api.history.clear();
    else localStorage.removeItem('clipboardHistory');
  }, []);

  const deleteItem = useCallback((id) => {
    persistItems(historyRef.current.filter((row) => row.id !== id));
  }, [persistItems]);

  const copyToClipboard = useCallback(async (content, type, { recordHistory = false } = {}) => {
    const api = desktop();
    try {
      if (api?.clip) {
        // Native fingerprinting prevents the app's own write from being captured twice.
        if (type === 'image') await api.clip.writeImage(content, recordHistory);
        else if (type === 'file') {
          const files = parseFileReferences(content);
          if (files.length === 0) return false;
          await api.clip.writeFiles(files, recordHistory);
        } else await api.clip.writeText(content, recordHistory);
        return true;
      }

      if (type === 'file') {
        return false;
      }
      if (type === 'image') {
        const response = await fetch(content);
        const blob = await response.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      } else {
        await navigator.clipboard.writeText(content);
      }
      if (recordHistory) {
        commitCapture({
          content,
          type,
          timestamp: new Date().toISOString(),
          force: true,
        });
      }
      return true;
    } catch (error) {
      console.error('Copy failed:', error);
      return false;
    }
  }, [commitCapture]);

  const handleSaveEdit = useCallback((id, newContent) => {
    const kind = classifyPayload(newContent);
    persistItems(
      historyRef.current.map((row) =>
        row.id === id
          ? {
              ...row,
              content: newContent,
              type: kind,
              preview: makePreview(newContent, kind),
            }
          : row,
      ),
    );
  }, [persistItems]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const revision = localRevisionRef.current;
      try {
        const api = desktop();
        let items = [];

        if (api?.history?.load) {
          items = await api.history.load();
        }

        if (!items.length) {
          const legacy = localStorage.getItem('clipboardHistory');
          if (legacy) {
            items = JSON.parse(legacy);
            if (api?.history?.migrate) {
              items = await api.history.migrate(items);
            }
          }
        }

        if (!alive || revision !== localRevisionRef.current) return;
        const pruned = trimHistory(items, { maxItems, autoDelete });
        historyRef.current = pruned;
        setClipboardHistory(pruned);
        if (pruned[0]) {
          lastFingerprintRef.current = fingerprint(pruned[0].type, pruned[0].content);
        }
      } catch {
        if (alive) setClipboardHistory([]);
      } finally {
        if (alive) {
          readyRef.current = true;
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
    // Intentionally once on mount — retention rules re-applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!readyRef.current) return;
    const next = trimHistory(historyRef.current, { maxItems, autoDelete });
    if (historySignature(next) !== historySignature(historyRef.current)) {
      persistItems(next);
    }
  }, [maxItems, autoDelete, persistItems]);

  useEffect(() => {
    const api = desktop();
    if (!api?.clip) return undefined;

    let active = true;
    const syncAfterSubscribe = async () => {
      if (!api.history?.load) return;
      const revision = localRevisionRef.current;
      try {
        const stored = await api.history.load();
        if (!active || revision !== localRevisionRef.current) return;
        const next = trimHistory(stored, { maxItems, autoDelete });
        const local = historyRef.current;
        const localFirstTime = Date.parse(local[0]?.timestamp || '') || 0;
        const storedFirstTime = Date.parse(next[0]?.timestamp || '') || 0;
        if (revision > 0 && local.length > 0 && localFirstTime >= storedFirstTime) {
          return;
        }
        if (historySignature(next) !== historySignature(local)) {
          historyRef.current = next;
          setClipboardHistory(next);
        }
      } catch (error) {
        console.error('Initial history synchronization failed:', error);
      }
    };

    const offCapture = api.clip.onCapture(commitCapture, syncAfterSubscribe);
    const offWipe = api.history?.onWipeShortcut?.(() => {
      clearHistory();
    });

    return () => {
      active = false;
      offCapture?.();
      offWipe?.();
    };
  }, [autoDelete, clearHistory, commitCapture, maxItems]);

  return {
    loading,
    clipboardHistory,
    setClipboardHistory,
    clearHistory,
    deleteItem,
    copyToClipboard,
    handleSaveEdit,
  };
}
