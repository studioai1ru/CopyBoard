import { useCallback, useEffect, useRef, useState } from 'react';
import {
  classifyPayload,
  createHistoryEntry,
  makePreview,
  mergeHistoryEntry,
  trimHistory,
} from '../utils/clipboardUtils';
import { desktop } from '../utils/desktop';

/**
 * Clipboard history store for the renderer.
 * Echo suppression lives in the main process; this hook only merges captures.
 */
export function useClipboardHistory({ maxItems, autoDelete }) {
  const [loading, setLoading] = useState(true);
  const [clipboardHistory, setClipboardHistory] = useState([]);

  const lastFingerprintRef = useRef('');
  const coalesceTimerRef = useRef(null);
  const pendingRef = useRef(null);
  const readyRef = useRef(false);
  const historyRef = useRef([]);

  historyRef.current = clipboardHistory;

  const fingerprint = (type, content) => `${type}::${content}`;

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
      setClipboardHistory((prev) => (
        mergeHistoryEntry(prev, entry, { maxItems, autoDelete })
      ));
    },
    [autoDelete, maxItems],
  );

  const ingestCapture = useCallback(
    (payload) => {
      pendingRef.current = payload;
      if (coalesceTimerRef.current) clearTimeout(coalesceTimerRef.current);
      // Coalesce bursty clipboard updates (e.g. multi-format writes).
      coalesceTimerRef.current = setTimeout(() => {
        const next = pendingRef.current;
        pendingRef.current = null;
        if (next) commitCapture(next);
      }, 180);
    },
    [commitCapture],
  );

  const clearHistory = useCallback(async () => {
    setClipboardHistory([]);
    lastFingerprintRef.current = '';
    pendingRef.current = null;
    const api = desktop();
    if (api?.history?.clear) await api.history.clear();
    else localStorage.removeItem('clipboardHistory');
  }, []);

  const deleteItem = useCallback((id) => {
    setClipboardHistory((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const copyToClipboard = useCallback(async (content, type, { recordHistory = false } = {}) => {
    const api = desktop();
    try {
      if (api?.clip) {
        // Main process suppress gate prevents echo into history.
        if (type === 'image') await api.clip.writeImage(content, recordHistory);
        else await api.clip.writeText(content, recordHistory);
        return true;
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
    setClipboardHistory((prev) =>
      prev.map((row) =>
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
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
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

        if (!alive) return;
        const pruned = trimHistory(items, { maxItems, autoDelete });
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
    setClipboardHistory((prev) => trimHistory(prev, { maxItems, autoDelete }));
  }, [maxItems, autoDelete]);

  useEffect(() => {
    if (!readyRef.current) return;
    const api = desktop();
    const timer = setTimeout(async () => {
      if (api?.history?.saveDebounced) {
        await api.history.saveDebounced(clipboardHistory);
      } else if (api?.history?.save) {
        await api.history.save(clipboardHistory);
      } else if (clipboardHistory.length > 0) {
        localStorage.setItem('clipboardHistory', JSON.stringify(clipboardHistory));
      } else {
        localStorage.removeItem('clipboardHistory');
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [clipboardHistory]);

  useEffect(() => {
    const api = desktop();
    if (!api?.history?.onFlush) return undefined;
    return api.history.onFlush(async () => {
      if (api.history.save) await api.history.save(historyRef.current);
    });
  }, []);

  useEffect(() => {
    const api = desktop();
    if (!api?.clip) return undefined;

    api.clip.start();
    const offCapture = api.clip.onCapture(ingestCapture);
    const offWipe = api.history?.onWipeShortcut?.(() => {
      clearHistory();
    });

    return () => {
      if (coalesceTimerRef.current) clearTimeout(coalesceTimerRef.current);
      api.clip.stop();
      offCapture?.();
      offWipe?.();
    };
  }, [clearHistory, ingestCapture]);

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
