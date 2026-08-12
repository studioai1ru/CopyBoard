import { app } from 'electron';
import fs from 'fs';
import path from 'path';

function getFrequentPath() {
  return path.join(app.getPath('userData'), 'frequent-items.json');
}

export function loadFrequentItems() {
  try {
    const filePath = getFrequentPath();
    if (!fs.existsSync(filePath)) {
      return [];
    }

    const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function saveFrequentItems(items) {
  try {
    fs.mkdirSync(path.dirname(getFrequentPath()), { recursive: true });
    fs.writeFileSync(getFrequentPath(), JSON.stringify(items, null, 2), 'utf8');
    return items;
  } catch (error) {
    console.error('Failed to save frequent items:', error);
    return items;
  }
}
