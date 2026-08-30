const NAMED_KEYS = {
  Backquote: 'Backquote',
  Backslash: 'Backslash',
  BracketLeft: 'BracketLeft',
  BracketRight: 'BracketRight',
  Comma: 'Comma',
  Equal: 'Equal',
  Minus: 'Minus',
  Period: 'Period',
  Quote: 'Quote',
  Semicolon: 'Semicolon',
  Slash: 'Slash',
  Space: 'Space',
  Delete: 'Delete',
  Enter: 'Enter',
  Tab: 'Tab',
  Escape: 'Escape',
};

const DISPLAY_KEYS = {
  Backquote: { en: '`', ru: 'ё' },
};

function isMacPlatform() {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
}

export function codeToShortcutKey(code) {
  if (!code) return null;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return NAMED_KEYS[code] || null;
}

export function eventToShortcut(event) {
  if (!event || event.repeat) return null;
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return null;

  const parts = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.shiftKey) parts.push('Shift');
  if (event.altKey) parts.push('Alt');
  if (event.metaKey) parts.push(isMacPlatform() ? 'Ctrl' : 'Meta');

  const key = codeToShortcutKey(event.code);
  if (!key || parts.length === 0) return null;
  return [...parts, key].join('+');
}

export function formatShortcutDisplay(shortcut, language = 'ru') {
  if (!shortcut) return '';

  const modifier = isMacPlatform() ? '⌘' : 'Ctrl';
  return shortcut
    .split('+')
    .map((part) => {
      if (part === 'Ctrl' || part === 'Cmd') return modifier;
      if (part === 'Shift') return 'Shift';
      if (part === 'Alt') return 'Alt';
      if (part === 'Meta') return 'Meta';
      return DISPLAY_KEYS[part]?.[language] || part;
    })
    .join(' + ');
}
