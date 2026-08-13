export const DEFAULT_QUICK_ACCESS_EDGE_VISIBLE = true;

export function normalizeQuickAccessEdgeVisible(value) {
  return typeof value === 'boolean' ? value : DEFAULT_QUICK_ACCESS_EDGE_VISIBLE;
}
