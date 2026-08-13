import { FiCode, FiFile, FiImage, FiLink, FiMail, FiPhone, FiType } from 'react-icons/fi';

/**
 * Shared type-badge look — history cards are the source of truth
 * (pastel bg + dark glyph via CSS vars / fallbacks).
 */
export const TYPE_ICON_META = {
  text: {
    Icon: FiType,
    bg: 'var(--type-text-bg, #38bdf8)',
    fg: 'var(--type-text-color, #0f172a)',
  },
  code: {
    Icon: FiCode,
    bg: 'var(--type-code-bg, #a78bfa)',
    fg: 'var(--type-code-color, #0f172a)',
  },
  image: {
    Icon: FiImage,
    bg: 'var(--type-image-bg, #34d399)',
    fg: 'var(--type-image-color, #0f172a)',
  },
  file: {
    Icon: FiFile,
    bg: 'var(--type-file-bg, #fb923c)',
    fg: 'var(--type-file-color, #0f172a)',
  },
  // Favorites-only extras — same visual language as history badges
  email: {
    Icon: FiMail,
    bg: 'var(--type-email-bg, #60a5fa)',
    fg: 'var(--type-email-color, #0f172a)',
  },
  phone: {
    Icon: FiPhone,
    bg: 'var(--type-phone-bg, #2dd4bf)',
    fg: 'var(--type-phone-color, #0f172a)',
  },
  url: {
    Icon: FiLink,
    bg: 'var(--type-url-bg, #fbbf24)',
    fg: 'var(--type-url-color, #0f172a)',
  },
};

export function getTypeIconMeta(id) {
  return TYPE_ICON_META[id] || TYPE_ICON_META.text;
}
