const escapeHandlers = [];

/**
 * Register an Esc handler. Last registered = topmost (runs first).
 * Returns unregister function.
 */
export function pushEscapeHandler(handler) {
  escapeHandlers.push(handler);
  return () => {
    const index = escapeHandlers.lastIndexOf(handler);
    if (index !== -1) {
      escapeHandlers.splice(index, 1);
    }
  };
}

export function handleGlobalEscape(event) {
  if (event.key !== 'Escape') return false;

  for (let i = escapeHandlers.length - 1; i >= 0; i -= 1) {
    const consumed = escapeHandlers[i]();
    if (consumed !== false) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      return true;
    }
  }

  return false;
}
