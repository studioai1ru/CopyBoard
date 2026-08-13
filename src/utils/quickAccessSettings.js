export const DEFAULT_QUICK_ACCESS_ENABLED = true;
export const DEFAULT_QUICK_ACCESS_EDGE_VISIBLE = true;

export function normalizeQuickAccessEnabled(value) {
  return typeof value === 'boolean' ? value : DEFAULT_QUICK_ACCESS_ENABLED;
}

export function normalizeQuickAccessEdgeVisible(value) {
  return typeof value === 'boolean' ? value : DEFAULT_QUICK_ACCESS_EDGE_VISIBLE;
}
