import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const port = Number(process.env.VITE_PORT || 3000);
const devServerUrl = `http://localhost:${port}`;

function waitForServer(maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      attempts += 1;
      const request = http.get(devServerUrl, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error('Vite dev server did not start in time'));
          return;
        }

        setTimeout(check, 500);
      });
    };

    check();
  });
}

const vite = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev:react'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

vite.on('error', (error) => {
  console.error('Failed to start Vite:', error);
  process.exit(1);
});

waitForServer()
  .then(() => {
    const electron = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['electron', '.'],
      {
        cwd: rootDir,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'development', VITE_DEV_SERVER_URL: devServerUrl },
        shell: process.platform === 'win32',
      },
    );

    electron.stdout.setEncoding('utf8');
    electron.stderr.setEncoding('utf8');
    electron.stdout.on('data', (chunk) => process.stdout.write(chunk));
    electron.stderr.on('data', (chunk) => process.stderr.write(chunk));

    electron.on('exit', (code) => {
      vite.kill();
      process.exit(code ?? 0);
    });
  })
  .catch((error) => {
    console.error(error.message);
    vite.kill();
    process.exit(1);
  });

process.on('SIGINT', () => {
  vite.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  vite.kill();
  process.exit(0);
});
