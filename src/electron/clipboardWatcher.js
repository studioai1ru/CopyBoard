import { clipboard, nativeImage } from 'electron';

/** Max text payload kept in history (chars). */
const MAX_TEXT_CHARS = 750_000;
/** Max image data-URL length kept in history. */
const MAX_IMAGE_CHARS = 40_000_000;
/** Interval between clipboard snapshots. */
const POLL_MS = 420;
/** How long writes from the app suppress capture. */
const DEFAULT_SUPPRESS_MS = 4_000;

/** Main-process clipboard capture with a timestamp gate for in-app writes. */
export function createClipboardWatcher({ onCapture }) {
  let timer = null;
  let running = false;
  let suppressUntil = 0;
  let lastText = '';
  let lastImageKey = '';

  function fingerprintImage(image) {
    if (!image || image.isEmpty()) return '';
    const size = image.getSize();
    // Size + bitmap byteLength is enough to detect change without always serializing PNG.
    const buf = image.toBitmap();
    return `${size.width}x${size.height}:${buf.byteLength}`;
  }

  function snapshotBaseline() {
    try {
      lastText = clipboard.readText() || '';
      const image = clipboard.readImage();
      lastImageKey = fingerprintImage(image);
    } catch {
      lastText = '';
      lastImageKey = '';
    }
  }

  function isSuppressed() {
    return Date.now() < suppressUntil;
  }

  function suppress(ms = DEFAULT_SUPPRESS_MS) {
    suppressUntil = Math.max(suppressUntil, Date.now() + ms);
  }

  function emit(payload) {
    if (typeof onCapture === 'function') {
      onCapture(payload);
    }
  }

  function pollOnce() {
    if (!running || isSuppressed()) return;

    try {
      const text = clipboard.readText() || '';
      if (
        text &&
        text !== lastText &&
        text.trim().length > 0 &&
        text.length <= MAX_TEXT_CHARS
      ) {
        lastText = text;
        emit({
          kind: 'text',
          body: text,
          capturedAt: new Date().toISOString(),
        });
      }

      const image = clipboard.readImage();
      const key = fingerprintImage(image);
      if (key && key !== lastImageKey) {
        const dataUrl = image.toDataURL();
        if (
          dataUrl &&
          dataUrl.length > 120 &&
          dataUrl.length <= MAX_IMAGE_CHARS
        ) {
          lastImageKey = key;
          emit({
            kind: 'image',
            body: dataUrl,
            capturedAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      // Ignore transient clipboard lock errors on Windows.
    }
  }

  function start() {
    if (running) return;
    running = true;
    snapshotBaseline();
    timer = setInterval(pollOnce, POLL_MS);
  }

  function stop() {
    running = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function writeText(text) {
    suppress();
    clipboard.writeText(String(text ?? ''));
    lastText = String(text ?? '');
    return true;
  }

  function writeImageDataUrl(dataUrl) {
    suppress();
    const image = nativeImage.createFromDataURL(dataUrl);
    clipboard.writeImage(image);
    lastImageKey = fingerprintImage(image);
    return true;
  }

  function readText() {
    try {
      return clipboard.readText();
    } catch {
      return '';
    }
  }

  function readImageDataUrl() {
    try {
      const image = clipboard.readImage();
      return image.isEmpty() ? null : image.toDataURL();
    } catch {
      return null;
    }
  }

  /** Force a one-shot image capture (e.g. after PrintScreen). */
  function probeImageSoon(delays = [800, 1800]) {
    delays.forEach((ms) => {
      setTimeout(() => {
        if (!running || isSuppressed()) return;
        try {
          const image = clipboard.readImage();
          const key = fingerprintImage(image);
          if (!key || key === lastImageKey) return;
          const dataUrl = image.toDataURL();
          if (!dataUrl || dataUrl.length <= 120 || dataUrl.length > MAX_IMAGE_CHARS) return;
          lastImageKey = key;
          emit({
            kind: 'image',
            body: dataUrl,
            capturedAt: new Date().toISOString(),
          });
        } catch {
          // ignore
        }
      }, ms);
    });
  }

  return {
    start,
    stop,
    suppress,
    writeText,
    writeImageDataUrl,
    readText,
    readImageDataUrl,
    probeImageSoon,
    get isRunning() {
      return running;
    },
  };
}
