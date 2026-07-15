import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runOpenSasaCli } from '../vscode-extension/src/cli.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('VS Code extension scaffold has valid package metadata', async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(root, 'vscode-extension', 'package.json'), 'utf8'),
  );

  assert.equal(packageJson.name, 'opensasa-vscode');
  assert.equal(packageJson.main, './src/extension.js');
  assert.ok(packageJson.engines.vscode);
  assert.ok(packageJson.contributes.commands.some((command) => command.command === 'opensasa.showStatus'));
  assert.ok(packageJson.contributes.commands.some((command) => command.command === 'opensasa.startSession'));
  assert.ok(packageJson.contributes.commands.some((command) => command.command === 'opensasa.finishSession'));
});

test('VS Code extension scaffold has an activation entry point', async () => {
  const source = await readFile(
    path.join(root, 'vscode-extension', 'src', 'extension.js'),
    'utf8',
  );

  assert.match(source, /registerCommand\(\s*['"]opensasa\.showStatus['"]\s*,/);
  assert.match(source, /module\.exports/);
  assert.match(source, /registerCommand\(\s*['"]opensasa\.startSession['"]\s*,/);
  assert.match(source, /['"]draft['"].*['"]--json['"]/s);
  assert.match(source, /registerCommand\(\s*['"]opensasa\.finishSession['"]\s*,/);
  assert.match(source, /['"]finalize['"].*['"]--final-outcome['"].*['"]--json['"]/s);
});

test('VS Code CLI communication passes arguments without a shell', async () => {
  const result = await runOpenSasaCli(
    ['-e', "process.stdout.write(JSON.stringify(process.argv.slice(1)))", '--', 'safe-value'],
    { executable: process.execPath },
  );

  assert.deepEqual(JSON.parse(result.stdout), ['safe-value']);
  assert.equal(result.exitCode, 0);
});

test('VS Code CLI communication reports failures', async () => {
  await assert.rejects(
    runOpenSasaCli(['-e', "process.stderr.write('failed'); process.exit(2)"], {
      executable: process.execPath,
    }),
    /failed/,
  );
});
