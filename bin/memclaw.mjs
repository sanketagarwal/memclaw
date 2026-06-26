#!/usr/bin/env node
/**
 * Thin launcher so `memclaw <command>` works after `npm link` or a global
 * install. It runs the TypeScript CLI through the project's local `tsx`.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tsxBin = resolve(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsx.cmd' : 'tsx',
);
const cli = resolve(root, 'src', 'cli.ts');

const child = spawn(tsxBin, [cli, ...process.argv.slice(2)], { stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (err) => {
  console.error('Failed to launch memclaw:', err.message);
  console.error('Try running `npm install` first.');
  process.exit(1);
});
