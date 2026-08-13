import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CUSTOM_FAVORITE_COLORS,
  CUSTOM_FAVORITE_SYMBOLS,
  isCustomFavoriteHexColor,
  normalizeCustomFavoriteIcon,
  resolveCustomFavoriteColor,
} from './customFavoriteIcons.js';

test('custom favorite icon offers an 8x4 symbol grid and eight preset colors', () => {
  assert.equal(CUSTOM_FAVORITE_SYMBOLS.length, 32);
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
  assert.deepEqual(
    normalizeCustomFavoriteIcon({ name: 'Custom', symbol: 'gift', color: '#AaBbCc' }),
    { name: 'Custom', symbol: 'gift', color: '#aabbcc' },
  );
  assert.equal(normalizeCustomFavoriteIcon({ name: '   ' }), null);
});

test('custom favorite hex colors resolve contrast-aware visuals', () => {
  assert.equal(isCustomFavoriteHexColor('#be123c'), true);
  assert.equal(isCustomFavoriteHexColor('rose'), false);
  assert.deepEqual(resolveCustomFavoriteColor('rose'), {
    id: 'rose',
    bg: '#be123c',
    fg: '#ffffff',
  });
  assert.deepEqual(resolveCustomFavoriteColor('#f59e0b'), {
    id: 'custom',
    bg: '#f59e0b',
    fg: '#172033',
  });
});
