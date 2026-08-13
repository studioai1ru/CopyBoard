import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createHistoryEntry,
  favoriteContentKey,
  mergeHistoryEntry,
} from './clipboardUtils.js';
import { serializeFileReferences } from './fileReferences.js';

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

test('file and folder references become a file history entry', () => {
  const content = serializeFileReferences([
    'C:\\Work\\report.pdf',
    'C:\\Work\\Assets',
  ]);
  const entry = createHistoryEntry({ content });

  assert.equal(entry.type, 'file');
  assert.equal(entry.preview, 'report.pdf, Assets');
});

test('favorite content matching ignores whitespace removed during favorite saving', () => {
  const captured = '\r\n\u2003Morgenshtern базовый минимум';

  assert.equal(favoriteContentKey(captured), 'Morgenshtern базовый минимум');
  assert.equal(
    favoriteContentKey(captured),
    favoriteContentKey('Morgenshtern базовый минимум'),
  );
});
