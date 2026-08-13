import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_QUICK_ACCESS_EDGE_VISIBLE,
  normalizeQuickAccessEdgeVisible,
} from './quickAccessSettings.js';

test('drawer edge is visible by default while an explicit off preference is preserved', () => {
  assert.equal(DEFAULT_QUICK_ACCESS_EDGE_VISIBLE, true);
  assert.equal(normalizeQuickAccessEdgeVisible(undefined), true);
  assert.equal(normalizeQuickAccessEdgeVisible(true), true);
  assert.equal(normalizeQuickAccessEdgeVisible(false), false);
});
