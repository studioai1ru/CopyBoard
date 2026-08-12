import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const changelogPath = path.join(projectDirectory, 'CHANGELOG.md');
const version = String(process.argv[2] || '').replace(/^v/, '');
const outputPath = path.resolve(projectDirectory, process.argv[3] || 'release-notes.md');

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error('Pass a semantic version or tag, for example v1.0.1.');
}

const changelog = fs.readFileSync(changelogPath, 'utf8').replace(/\r\n/g, '\n');
const releaseHeader = `## [${version}]`;
const releaseStart = changelog.indexOf(releaseHeader);

if (releaseStart === -1) {
  throw new Error(`Missing ${releaseHeader} in CHANGELOG.md.`);
}

const bodyStart = changelog.indexOf('\n', releaseStart);
const nextReleaseStart = changelog.indexOf('\n## [', bodyStart + 1);
const releaseNotes = changelog
  .slice(bodyStart + 1, nextReleaseStart === -1 ? changelog.length : nextReleaseStart)
  .trim();

if (!releaseNotes) {
  throw new Error(`The changelog section for v${version} is empty.`);
}

fs.writeFileSync(outputPath, `${releaseNotes}\n`, 'utf8');
console.log(`Prepared release notes for v${version}.`);
