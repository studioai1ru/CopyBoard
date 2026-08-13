import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_QUICK_ACCESS_EDGE_VISIBLE,
  DEFAULT_QUICK_ACCESS_ENABLED,
  normalizeQuickAccessEdgeVisible,
  normalizeQuickAccessEnabled,
} from './quickAccessSettings.js';

test('templates drawer is enabled by default while an explicit off preference is preserved', () => {
  assert.equal(DEFAULT_QUICK_ACCESS_ENABLED, true);
  assert.equal(normalizeQuickAccessEnabled(undefined), true);
  assert.equal(normalizeQuickAccessEnabled(true), true);
  assert.equal(normalizeQuickAccessEnabled(false), false);
});

test('drawer edge is visible by default while an explicit off preference is preserved', () => {
  assert.equal(DEFAULT_QUICK_ACCESS_EDGE_VISIBLE, true);
  assert.equal(normalizeQuickAccessEdgeVisible(undefined), true);
  assert.equal(normalizeQuickAccessEdgeVisible(true), true);
  assert.equal(normalizeQuickAccessEdgeVisible(false), false);
});
