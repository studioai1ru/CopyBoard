import {
  FiBell,
  FiBookOpen,
  FiBookmark,
  FiBriefcase,
  FiCalendar,
  FiCamera,
  FiCheckCircle,
  FiCloud,
  FiCode,
  FiCoffee,
  FiFile,
  FiFlag,
  FiGift,
  FiGlobe,
  FiHeart,
  FiHome,
  FiImage,
  FiKey,
  FiLink,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiMusic,
  FiPhone,
  FiSend,
  FiShield,
  FiShoppingBag,
  FiStar,
  FiTag,
  FiType,
  FiUser,
  FiZap,
} from 'react-icons/fi';

export const CUSTOM_FAVORITE_ICON_ID = 'custom';

export const CUSTOM_FAVORITE_SYMBOLS = [
  { id: 'text', Icon: FiType },
  { id: 'code', Icon: FiCode },
  { id: 'image', Icon: FiImage },
  { id: 'file', Icon: FiFile },
  { id: 'mail', Icon: FiMail },
  { id: 'phone', Icon: FiPhone },
  { id: 'link', Icon: FiLink },
  { id: 'star', Icon: FiStar },
  { id: 'heart', Icon: FiHeart },
  { id: 'home', Icon: FiHome },
  { id: 'user', Icon: FiUser },
  { id: 'work', Icon: FiBriefcase },
  { id: 'calendar', Icon: FiCalendar },
  { id: 'check', Icon: FiCheckCircle },
  { id: 'book', Icon: FiBookOpen },
  { id: 'bolt', Icon: FiZap },
  { id: 'bookmark', Icon: FiBookmark },
  { id: 'tag', Icon: FiTag },
  { id: 'chat', Icon: FiMessageCircle },
  { id: 'bell', Icon: FiBell },
  { id: 'pin', Icon: FiMapPin },
  { id: 'globe', Icon: FiGlobe },
  { id: 'music', Icon: FiMusic },
  { id: 'camera', Icon: FiCamera },
  { id: 'cart', Icon: FiShoppingBag },
  { id: 'key', Icon: FiKey },
  { id: 'shield', Icon: FiShield },
  { id: 'cloud', Icon: FiCloud },
  { id: 'gift', Icon: FiGift },
  { id: 'coffee', Icon: FiCoffee },
  { id: 'flag', Icon: FiFlag },
  { id: 'send', Icon: FiSend },
];

export const CUSTOM_FAVORITE_COLORS = [
  { id: 'sky', bg: '#0369a1', fg: '#ffffff' },
  { id: 'blue', bg: '#1d4ed8', fg: '#ffffff' },
  { id: 'violet', bg: '#6d28d9', fg: '#ffffff' },
  { id: 'rose', bg: '#be123c', fg: '#ffffff' },
  { id: 'orange', bg: '#c2410c', fg: '#ffffff' },
  { id: 'amber', bg: '#f59e0b', fg: '#172033' },
  { id: 'emerald', bg: '#047857', fg: '#ffffff' },
  { id: 'slate', bg: '#475569', fg: '#ffffff' },
];

export const CUSTOM_FAVORITE_COLOR_PICKER_DEFAULT = '#be123c';

const SYMBOL_IDS = new Set(CUSTOM_FAVORITE_SYMBOLS.map(({ id }) => id));
const COLOR_IDS = new Set(CUSTOM_FAVORITE_COLORS.map(({ id }) => id));
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

export function isCustomFavoriteHexColor(value) {
  return typeof value === 'string' && HEX_COLOR_RE.test(value);
}

function contrastForeground(hex) {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma > 0.62 ? '#172033' : '#ffffff';
}

export function normalizeCustomFavoriteColor(value) {
  if (COLOR_IDS.has(value)) return value;
  if (isCustomFavoriteHexColor(value)) return value.toLowerCase();
  return 'blue';
}

export function resolveCustomFavoriteColor(color) {
  const preset = CUSTOM_FAVORITE_COLORS.find(({ id }) => id === color);
  if (preset) return { id: preset.id, bg: preset.bg, fg: preset.fg };

  const normalized = normalizeCustomFavoriteColor(color);
  if (isCustomFavoriteHexColor(normalized)) {
    return { id: 'custom', bg: normalized, fg: contrastForeground(normalized) };
  }

  const fallback = CUSTOM_FAVORITE_COLORS.find(({ id }) => id === 'blue');
  return { id: fallback.id, bg: fallback.bg, fg: fallback.fg };
}

export function createDefaultCustomFavoriteIcon(name = '') {
  return {
    name: String(name).trim().slice(0, 24),
    symbol: 'star',
    color: 'blue',
  };
}

export function normalizeCustomFavoriteIcon(value) {
  if (!value || typeof value !== 'object') return null;
  const name = String(value.name || '').trim().slice(0, 24);
  if (!name) return null;
  return {
    name,
    symbol: SYMBOL_IDS.has(value.symbol) ? value.symbol : 'star',
    color: normalizeCustomFavoriteColor(value.color),
  };
}

export function getCustomFavoriteIconVisual(value) {
  const normalized = normalizeCustomFavoriteIcon(value);
  if (!normalized) return null;
  const symbol = CUSTOM_FAVORITE_SYMBOLS.find(({ id }) => id === normalized.symbol);
  const color = resolveCustomFavoriteColor(normalized.color);
  return { ...normalized, Icon: symbol.Icon, bg: color.bg, fg: color.fg };
}
