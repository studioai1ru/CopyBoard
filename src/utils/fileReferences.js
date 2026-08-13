const FILE_URI_RE = /^file:\/\//i;
const WINDOWS_PATH_RE = /^(?:[a-z]:[\\/]|\\\\)/i;
const POSIX_PATH_RE = /^\//;

export function isFileReference(value) {
  const reference = String(value || '').trim();
  return Boolean(reference) && (
    FILE_URI_RE.test(reference)
    || WINDOWS_PATH_RE.test(reference)
    || POSIX_PATH_RE.test(reference)
  );
}

export function serializeFileReferences(files) {
  const references = (Array.isArray(files) ? files : [])
    .map((value) => String(value || '').trim())
    .filter(isFileReference);
  return references.length > 0 ? JSON.stringify(references) : '';
}

export function parseFileReferences(content) {
  try {
    const parsed = JSON.parse(String(content || ''));
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    const references = parsed.map((value) => String(value || '').trim());
    return references.every(isFileReference) ? references : [];
  } catch {
    return [];
  }
}

export function displayFileReference(reference) {
  const raw = String(reference || '').trim();
  if (!FILE_URI_RE.test(raw)) return raw;

  try {
    const url = new URL(raw);
    let path = decodeURIComponent(url.pathname);
    if (/^\/[a-z]:\//i.test(path)) path = path.slice(1);
    return url.host ? `//${url.host}${path}` : path;
  } catch {
    return raw;
  }
}

export function fileReferenceName(reference) {
  const path = displayFileReference(reference).replace(/[\\/]+$/, '');
  return path.split(/[\\/]/).at(-1) || path;
}
