/**
 * Renderer ↔ main bridge accessor.
 * Prefer window.copyboard; keep a short alias window.cb for brevity in call sites.
 */
export function desktop() {
  if (typeof window === 'undefined') return null;
  return window.copyboard || null;
}

export function isDesktop() {
  return Boolean(desktop());
}
