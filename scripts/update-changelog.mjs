import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const packagePath = path.join(projectDirectory, 'package.json');
const changelogPath = path.join(projectDirectory, 'CHANGELOG.md');

const packageMetadata = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const changelog = fs.readFileSync(changelogPath, 'utf8').replace(/\r\n/g, '\n');
const unreleasedHeader = '## [Unreleased]';
const unreleasedStart = changelog.indexOf(unreleasedHeader);

if (unreleasedStart === -1) {
  throw new Error(`Missing ${unreleasedHeader} in CHANGELOG.md.`);
}

const bodyStart = unreleasedStart + unreleasedHeader.length;
const nextReleaseStart = changelog.indexOf('\n## [', bodyStart);

if (nextReleaseStart === -1) {
  throw new Error('CHANGELOG.md must contain at least one released version after Unreleased.');
}

const unreleasedBody = changelog.slice(bodyStart, nextReleaseStart).trim();

if (!/^\s*-\s+\S/m.test(unreleasedBody)) {
  throw new Error('The Unreleased section has no changelog entries.');
}

const releaseMoment = new Date();
const releaseDate = [
  releaseMoment.getFullYear(),
  String(releaseMoment.getMonth() + 1).padStart(2, '0'),
  String(releaseMoment.getDate()).padStart(2, '0'),
].join('-');
const prefix = changelog.slice(0, bodyStart);
const previousReleases = changelog.slice(nextReleaseStart).trimStart();
const updatedChangelog = `${prefix}\n\n## [${packageMetadata.version}] - ${releaseDate}\n\n${unreleasedBody}\n\n${previousReleases.trimEnd()}\n`;

fs.writeFileSync(changelogPath, updatedChangelog, 'utf8');
console.log(`Prepared CHANGELOG.md for v${packageMetadata.version}.`);
