import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const HISTORY_FILE = 'clipboard-history.json';
const IMAGES_DIR = 'clipboard-images';

let saveTimeout = null;

function getHistoryPath() {
  return path.join(app.getPath('userData'), HISTORY_FILE);
}

function getImagesDir() {
  return path.join(app.getPath('userData'), IMAGES_DIR);
}

function ensureDirs() {
  fs.mkdirSync(getImagesDir(), { recursive: true });
}

function stripImageContent(item) {
  if (item.type !== 'image' || !item.content?.startsWith('data:image/')) {
    return item;
  }

  return {
    ...item,
    content: '',
    imageFile: item.id,
  };
}

function hydrateImageContent(item) {
  if (item.type !== 'image' || item.content || !item.imageFile) {
    return item;
  }

  const imagePath = path.join(getImagesDir(), `${item.imageFile}.txt`);
  if (!fs.existsSync(imagePath)) {
    return item;
  }

  return {
    ...item,
    content: fs.readFileSync(imagePath, 'utf8'),
  };
}

function persistImageContent(item) {
  if (item.type !== 'image' || !item.content?.startsWith('data:image/')) {
    return item;
  }

  ensureDirs();
  fs.writeFileSync(path.join(getImagesDir(), `${item.id}.txt`), item.content, 'utf8');
  return stripImageContent(item);
}

export function loadHistory() {
  try {
    const historyPath = getHistoryPath();
    if (!fs.existsSync(historyPath)) {
      return [];
    }

    const items = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    if (!Array.isArray(items)) {
      return [];
    }

    return items.map(hydrateImageContent);
  } catch {
    return [];
  }
}

export function saveHistory(items) {
  try {
    ensureDirs();
    const serialized = items.map((item) => {
      if (item.type === 'image' && item.content?.startsWith('data:image/')) {
        return persistImageContent(item);
      }
      return item;
    });

    fs.writeFileSync(getHistoryPath(), JSON.stringify(serialized, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save clipboard history:', error);
  }
}

export function saveHistoryDebounced(items, delay = 800) {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  return new Promise((resolve) => {
    saveTimeout = setTimeout(() => {
      saveTimeout = null;
      saveHistory(items);
      resolve(true);
    }, delay);
  });
}

export function clearHistoryStore() {
  try {
    const historyPath = getHistoryPath();
    if (fs.existsSync(historyPath)) {
      fs.unlinkSync(historyPath);
    }

    const imagesDir = getImagesDir();
    if (fs.existsSync(imagesDir)) {
      for (const file of fs.readdirSync(imagesDir)) {
        fs.unlinkSync(path.join(imagesDir, file));
      }
    }
  } catch (error) {
    console.error('Failed to clear clipboard history store:', error);
  }
}

export function migrateLegacyHistory(legacyItems) {
  if (!Array.isArray(legacyItems) || legacyItems.length === 0) {
    return loadHistory();
  }

  const existing = loadHistory();
  if (existing.length > 0) {
    return existing;
  }

  saveHistory(legacyItems);
  return legacyItems;
}
