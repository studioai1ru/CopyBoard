import { classifyPayload } from './clipboardUtils';
import { getTypeIconMeta, TYPE_ICON_META } from './typeIconMeta';

/** Small set of favorite chip icons (content stays text/image; icon is metadata). */
export const FAVORITE_ICON_IDS = Object.keys(TYPE_ICON_META);

export const FAVORITE_DISPLAY_MODES = ['icon-text', 'text', 'icon'];

export function normalizeFavoriteDisplayMode(mode) {
  return FAVORITE_DISPLAY_MODES.includes(mode) ? mode : 'icon-text';
}

/** @deprecated use getTypeIconMeta — kept for call-site compatibility */
export const FAVORITE_ICON_META = Object.fromEntries(
  FAVORITE_ICON_IDS.map((id) => {
    const meta = TYPE_ICON_META[id];
    return [id, { Icon: meta.Icon, color: meta.bg, fg: meta.fg }];
  }),
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const URL_RE = /^(https?:\/\/|www\.)\S+/i;
const PHONE_RE = /^\+?[\d\s().-]{10,20}$/;

function looksLikePhone(value) {
  if (!PHONE_RE.test(value)) return false;
  if (/[a-zA-Zа-яА-Я]{2,}/.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Guess a favorite icon from clipboard/text content.
 * email / phone / url / code / image / text — editing remains text (except images).
 */
export function detectFavoriteIcon(content) {
  const value = String(content || '').trim();
  if (!value) return 'text';
  if (value.startsWith('data:image/')) return 'image';
  if (classifyPayload(value) === 'file') return 'file';

  const singleLine = !value.includes('\n');
  if (singleLine && EMAIL_RE.test(value)) return 'email';
  if (singleLine && looksLikePhone(value)) return 'phone';
  if (singleLine && URL_RE.test(value)) return 'url';

  if (classifyPayload(value) === 'code') return 'code';
  return 'text';
}

export function normalizeFavoriteIcon(icon, content) {
  if (icon && FAVORITE_ICON_IDS.includes(icon)) return icon;
  return detectFavoriteIcon(content);
}

export function resolveFavoriteIcon(item) {
  return normalizeFavoriteIcon(item?.icon, item?.content);
}

/** Icons the user may pick for this content (images stay image-only). */
export function selectableFavoriteIcons(content) {
  if (String(content || '').startsWith('data:image/')) {
    return ['image'];
  }
  return FAVORITE_ICON_IDS.filter((id) => id !== 'image');
}

export { getTypeIconMeta };
