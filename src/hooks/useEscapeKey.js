import { useLayoutEffect, useRef } from 'react';
import { pushEscapeHandler } from '../utils/escapeStack';

/**
 * Register Esc handler while `enabled` is true.
 * Last registered overlay is closed first; tray minimize only when stack is empty.
 */
export function useEscapeKey(enabled, onEscape) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  // Layout effect: register before paint so Esc cannot race an open overlay.
  useLayoutEffect(() => {
    if (!enabled) return undefined;
    return pushEscapeHandler(() => {
      onEscapeRef.current?.();
      return true;
    });
  }, [enabled]);
}
