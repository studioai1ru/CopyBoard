import test from 'node:test';
import assert from 'node:assert/strict';
import { clampQuickAccessSize, groupQuickAccessItems } from './quickAccessLayout.js';

test('normal favorites stay on separate rows while adjacent icon-only favorites share a row', () => {
  const rows = groupQuickAccessItems([
    { id: 'a', displayMode: 'icon-text' },
    { id: 'b', displayMode: 'icon' },
    { id: 'c', displayMode: 'icon' },
    { id: 'd', displayMode: 'text' },
  ]);

  assert.deepEqual(rows.map((row) => [row.type, row.items.map((item) => item.id)]), [
    ['item', ['a']],
    ['icons', ['b', 'c']],
    ['item', ['d']],
  ]);
});

test('drawer measurements stay compact and bounded', () => {
  assert.deepEqual(clampQuickAccessSize(20, 10), { width: 52, height: 44 });
  assert.deepEqual(clampQuickAccessSize(240.2, 125.1), { width: 241, height: 126 });
  assert.deepEqual(clampQuickAccessSize(900, 900), { width: 278, height: 420 });
});
