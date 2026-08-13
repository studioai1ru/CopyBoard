import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CUSTOM_FAVORITE_COLORS,
  CUSTOM_FAVORITE_SYMBOLS,
  normalizeCustomFavoriteIcon,
} from './customFavoriteIcons.js';

test('custom favorite icon offers a fixed 4x4 symbol grid and eight colors', () => {
  assert.equal(CUSTOM_FAVORITE_SYMBOLS.length, 16);
  assert.equal(CUSTOM_FAVORITE_COLORS.length, 8);
});

test('custom favorite icon metadata is normalized and limited to known choices', () => {
  assert.deepEqual(
    normalizeCustomFavoriteIcon({
      name: '  Работа  ',
      symbol: 'work',
      color: 'emerald',
    }),
    { name: 'Работа', symbol: 'work', color: 'emerald' },
  );
  assert.deepEqual(
    normalizeCustomFavoriteIcon({ name: 'Свой', symbol: 'unknown', color: 'unknown' }),
    { name: 'Свой', symbol: 'star', color: 'blue' },
  );
  assert.equal(normalizeCustomFavoriteIcon({ name: '   ' }), null);
});
