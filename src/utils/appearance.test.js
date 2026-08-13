import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeThemeMode, resolveThemeMode } from './appearance.js';

test('system is the safe default appearance mode', () => {
  assert.equal(normalizeThemeMode(undefined), 'system');
  assert.equal(normalizeThemeMode('unsupported'), 'system');
});

test('system mode follows the operating system preference', () => {
  assert.equal(resolveThemeMode('system', true), 'dark');
  assert.equal(resolveThemeMode('system', false), 'light');
  assert.equal(resolveThemeMode('dark', false), 'dark');
  assert.equal(resolveThemeMode('light', true), 'light');
});
