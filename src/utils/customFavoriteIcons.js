import {
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiCode,
  FiFile,
  FiHeart,
  FiHome,
  FiImage,
  FiLink,
  FiMail,
  FiPhone,
  FiStar,
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

const SYMBOL_IDS = new Set(CUSTOM_FAVORITE_SYMBOLS.map(({ id }) => id));
const COLOR_IDS = new Set(CUSTOM_FAVORITE_COLORS.map(({ id }) => id));

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
    color: COLOR_IDS.has(value.color) ? value.color : 'blue',
  };
}

export function getCustomFavoriteIconVisual(value) {
  const normalized = normalizeCustomFavoriteIcon(value);
  if (!normalized) return null;
  const symbol = CUSTOM_FAVORITE_SYMBOLS.find(({ id }) => id === normalized.symbol);
  const color = CUSTOM_FAVORITE_COLORS.find(({ id }) => id === normalized.color);
  return { ...normalized, Icon: symbol.Icon, bg: color.bg, fg: color.fg };
}
