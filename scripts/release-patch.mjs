import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const checkOnly = process.argv.includes('--check');
const npmCliPath = [
  process.env.npm_execpath,
  path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
].find((candidate) => candidate && existsSync(candidate));

if (!npmCliPath) {
  console.error('Could not locate npm-cli.js. Run this script through npm run release:patch.');
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function output(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(result.stderr || 'Command failed.\n');
    process.exit(result.status ?? 1);
  }

  return result.stdout.trim();
}

function runNpm(args) {
  run(process.execPath, [npmCliPath, ...args]);
}

const branch = output('git', ['branch', '--show-current']);
if (branch !== 'main') {
  console.error(`Patch releases must be created from main. Current branch: ${branch || '(detached HEAD)'}`);
  process.exit(1);
}

runNpm(['run', 'lint']);
runNpm(['run', 'build']);

if (checkOnly) {
  console.log('Release checks passed. No commit, version, tag, or push was created.');
  process.exit(0);
}

run('git', ['add', '--all']);
const stagedChanges = spawnSync('git', ['diff', '--cached', '--quiet'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: false,
});

if (stagedChanges.status === 1) {
  run('git', ['commit', '-m', 'Prepare patch release']);
} else if (stagedChanges.status !== 0) {
  process.exit(stagedChanges.status ?? 1);
}

runNpm(['version', 'patch']);
run('git', ['push', 'origin', 'main', '--follow-tags']);
