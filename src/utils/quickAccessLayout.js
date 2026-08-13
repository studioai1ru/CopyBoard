export const DRAWER_WIDTH = 278;
const MIN_DRAWER_HEIGHT = 44;
const MAX_DRAWER_HEIGHT = 420;

export function groupQuickAccessItems(items) {
  const rows = [];

  for (const item of Array.isArray(items) ? items : []) {
    if (item?.displayMode === 'icon') {
      const previous = rows.at(-1);
      if (previous?.type === 'icons') previous.items.push(item);
      else rows.push({ type: 'icons', items: [item] });
    } else {
      rows.push({ type: 'item', items: [item] });
    }
  }

  return rows;
}

export function clampQuickAccessSize(_width, height) {
  return {
    width: DRAWER_WIDTH,
    height: Math.min(MAX_DRAWER_HEIGHT, Math.max(MIN_DRAWER_HEIGHT, Math.ceil(height))),
  };
}
