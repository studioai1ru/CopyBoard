import test from 'node:test';
import assert from 'node:assert/strict';
import {
  displayFileReference,
  fileReferenceName,
  parseFileReferences,
  serializeFileReferences,
} from './fileReferences.js';

test('file clipboard payload keeps references without reading file contents', () => {
  const payload = serializeFileReferences([
    'C:\\Work\\report.pdf',
    'file:///C:/Work/Project%20Files',
  ]);

  assert.deepEqual(parseFileReferences(payload), [
    'C:\\Work\\report.pdf',
    'file:///C:/Work/Project%20Files',
  ]);
  assert.equal(displayFileReference('file:///C:/Work/Project%20Files'), 'C:/Work/Project Files');
  assert.equal(fileReferenceName('C:\\Work\\report.pdf'), 'report.pdf');
});

test('ordinary JSON arrays are not treated as file clipboard payloads', () => {
  assert.deepEqual(parseFileReferences('["one", "two"]'), []);
});
