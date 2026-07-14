import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('VS Code extension scaffold has valid package metadata', async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(root, 'vscode-extension', 'package.json'), 'utf8'),
  );

  assert.equal(packageJson.name, 'opensasa-vscode');
  assert.equal(packageJson.main, './src/extension.js');
  assert.ok(packageJson.engines.vscode);
  assert.ok(packageJson.contributes.commands.some((command) => command.command === 'opensasa.showStatus'));
});

test('VS Code extension scaffold has an activation entry point', async () => {
  const source = await readFile(
    path.join(root, 'vscode-extension', 'src', 'extension.js'),
    'utf8',
  );

  assert.match(source, /registerCommand\(\s*['"]opensasa\.showStatus['"]\s*,/);
  assert.match(source, /module\.exports/);
});
