import { fileReferenceName, parseFileReferences } from './fileReferences.js';

/** Create a stable-enough unique id for history/favorites rows. */
export function createEntryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
/** Favorite display name: explicit label, else first content line. */
export function favoriteLabel(label, content) {
  const named = String(label || '').trim();
  if (named) return named.slice(0, 48);

  if (String(content || '').startsWith('data:image/')) {
    return '';
  }

  const files = parseFileReferences(content);
  if (files.length > 0) {
    const first = fileReferenceName(files[0]);
    return files.length > 1 ? `${first} +${files.length - 1}` : first;
  }

  const first = String(content || '').trim().split(/\r?\n/)[0] || '';
  return first.slice(0, 48) || '…';
}

/** Score-based content classifier (text | code | image | file). */
export function classifyPayload(body, hint = null) {
  const value = String(body || '');

  if (hint === 'file' || parseFileReferences(value).length > 0) {
    return 'file';
  }

  if (hint === 'image' || value.startsWith('data:image/')) {
    if (value.includes('base64') || value.length > 800) {
      return 'image';
    }
  }

  let score = 0;
  const sample = value.slice(0, 4000);

  if (/```[\s\S]*```/.test(sample)) score += 4;
  if (/^\s*[{[]/.test(sample) && /[}\]]\s*$/.test(sample.trim())) score += 3;
  if (/<\/?[a-zA-Z][^>]*>/.test(sample)) score += 3;
  if (/\b(def|fn|func|class|interface|struct|enum)\b/.test(sample)) score += 2;
  if (/\b(import|export|require|include|using|package)\b/.test(sample)) score += 2;
  if (/=>|::|->|\.\.\./.test(sample)) score += 1;
  if (/[{};]\s*$/m.test(sample) && (sample.match(/[{};]/g) || []).length >= 3) score += 2;
  if (/^\s{2,}|\t/m.test(sample) && sample.split('\n').length >= 3) score += 1;
  if (/\b(console|print|printf|System\.out|fmt\.)\b/.test(sample)) score += 1;

  const punctuationDensity =
    (sample.match(/[{}()[\];=<>]/g) || []).length / Math.max(sample.length, 1);
  if (punctuationDensity > 0.08 && sample.length > 40) score += 2;

  return score >= 4 ? 'code' : 'text';
}

export function makePreview(body, kind) {
  if (kind === 'image') return body;
  if (kind === 'file') {
    return parseFileReferences(body).map(fileReferenceName).join(', ');
  }
  const text = String(body || '');
  if (text.length <= 120) return text;
  return `${text.slice(0, 120)}…`;
}

/** Normalize a clipboard capture into the history row shape used by the UI. */
export function createHistoryEntry({ content, type, timestamp } = {}) {
  const kind = classifyPayload(content, type);
  const normalizedContent = String(content || '');
  return {
    id: createEntryId(),
    content: normalizedContent,
    type: kind,
    timestamp: timestamp || new Date().toISOString(),
    preview: makePreview(normalizedContent, kind),
  };
}

const RETENTION_MS = {
  never: 0,
  '5min': 5 * 60 * 1000,
  '15min': 15 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
  '2hours': 2 * 60 * 60 * 1000,
  '6hours': 6 * 60 * 60 * 1000,
  '12hours': 12 * 60 * 60 * 1000,
  '1day': 24 * 60 * 60 * 1000,
  '3days': 3 * 24 * 60 * 60 * 1000,
  '7days': 7 * 24 * 60 * 60 * 1000,
  '30days': 30 * 24 * 60 * 60 * 1000,
};

/** Newest-first list: drop expired rows, collapse duplicates, enforce max length. */
export function trimHistory(entries, { maxItems = 100, autoDelete = 'never' } = {}) {
  const windowMs = RETENTION_MS[autoDelete] || 0;
  let next = Array.isArray(entries) ? [...entries] : [];

  if (windowMs > 0) {
    const cutoff = Date.now() - windowMs;
    next = next.filter((row) => new Date(row.timestamp).getTime() >= cutoff);
  }

  const seen = new Set();
  next = next.filter((row) => {
    if (seen.has(row.content)) return false;
    seen.add(row.content);
    return true;
  });

  return next.slice(0, Number(maxItems) || 100);
}

/** Put a capture at the top, refreshing an existing value instead of duplicating it. */
export function mergeHistoryEntry(entries, entry, options) {
  const withoutSameContent = (Array.isArray(entries) ? entries : [])
    .filter((row) => row.content !== entry.content);
  return trimHistory([entry, ...withoutSameContent], options);
}
