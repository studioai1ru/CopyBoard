import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];

if (!['win', 'mac'].includes(target)) {
  throw new Error('Usage: node scripts/package-tauri.mjs <win|mac>');
}

if (target === 'win' && process.platform !== 'win32') {
  throw new Error('The Windows NSIS installer must be built on Windows.');
}

if (target === 'mac' && process.platform !== 'darwin') {
  throw new Error('The universal macOS DMG must be built on macOS.');
}

const tauriCli = require.resolve('@tauri-apps/cli/tauri.js');
const buildArgs = target === 'win'
  ? ['build', '--bundles', 'nsis']
  : ['build', '--target', 'universal-apple-darwin', '--bundles', 'dmg'];

const result = spawnSync(process.execPath, [tauriCli, ...buildArgs], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const bundleDir = target === 'win'
  ? path.join(rootDir, 'src-tauri', 'target', 'release', 'bundle', 'nsis')
  : path.join(
      rootDir,
      'src-tauri',
      'target',
      'universal-apple-darwin',
      'release',
      'bundle',
      'dmg',
    );
const extension = target === 'win' ? '.exe' : '.dmg';
const artifacts = readdirSync(bundleDir)
  .filter((name) => name.toLowerCase().endsWith(extension))
  .map((name) => ({ name, modified: statSync(path.join(bundleDir, name)).mtimeMs }))
  .sort((a, b) => b.modified - a.modified);

if (!artifacts.length) {
  throw new Error(`Tauri did not create a ${extension} artifact in ${bundleDir}.`);
}

const releaseDir = path.join(rootDir, 'release');
const stableName = target === 'win'
  ? 'CopyBoard-Windows-x64-Setup.exe'
  : 'CopyBoard-macOS-universal.dmg';
mkdirSync(releaseDir, { recursive: true });
copyFileSync(path.join(bundleDir, artifacts[0].name), path.join(releaseDir, stableName));
console.log(`Packaged release/${stableName}`);
