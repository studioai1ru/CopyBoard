import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistoryEntry, mergeHistoryEntry } from './clipboardUtils.js';

test('template capture becomes a normalized history entry', () => {
  const timestamp = '2026-08-13T10:00:00.000Z';
  const entry = createHistoryEntry({
    content: 'import value from "module";\nconst template = () => ({ enabled: value });',
    type: 'text',
    timestamp,
  });

  assert.equal(entry.type, 'code');
  assert.equal(entry.timestamp, timestamp);
  assert.match(entry.content, /const template/);
});

test('copying an existing template refreshes it at the top without duplication', () => {
  const existing = [
    createHistoryEntry({ content: 'newer', timestamp: '2026-08-13T09:00:00.000Z' }),
    createHistoryEntry({ content: 'template', timestamp: '2026-08-13T08:00:00.000Z' }),
  ];
  const refreshed = createHistoryEntry({
    content: 'template',
    timestamp: '2026-08-13T10:00:00.000Z',
  });

  const result = mergeHistoryEntry(existing, refreshed, { maxItems: 100 });
  assert.equal(result[0].content, 'template');
  assert.equal(result[0].timestamp, '2026-08-13T10:00:00.000Z');
  assert.equal(result.filter((entry) => entry.content === 'template').length, 1);
});
