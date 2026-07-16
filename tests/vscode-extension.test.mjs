import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runOpenSasaCli } from '../vscode-extension/src/cli.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const {
  CUSTOM_MODEL_VALUE,
  CUSTOM_TOOL_VALUE,
  OMIT_TOOL_VALUE,
  getModelItems,
  pickFinalOutcome,
  pickModelId,
  pickTaskType,
  pickTool,
} = require('../vscode-extension/src/prompts.js');
const {
  buildStatusBarState,
} = require('../vscode-extension/src/status-bar.js');

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

  assert.match(source, /createStatusBarItem/);
  assert.match(source, /applyStatusBarState/);
  assert.match(source, /registerCommand\(\s*['"]opensasa\.showStatus['"]\s*,/);
  assert.match(source, /module\.exports/);
  assert.match(source, /registerCommand\(\s*['"]opensasa\.startSession['"]\s*,/);
  assert.match(source, /pickModelId/);
  assert.match(source, /pickTool/);
  assert.match(source, /pickTaskType/);
  assert.match(source, /['"]--tool['"]/);
  assert.match(source, /['"]draft['"].*['"]--json['"]/s);
  assert.match(source, /registerCommand\(\s*['"]opensasa\.finishSession['"]\s*,/);
  assert.match(source, /pickFinalOutcome/);
  assert.match(source, /['"]finalize['"].*['"]--final-outcome['"].*['"]--json['"]/s);
});

test('VS Code status bar state shows idle and active session states', () => {
  const idleState = buildStatusBarState();
  const activeState = buildStatusBarState('session-123');

  assert.equal(idleState.text, '$(circle-large-outline) OpenSasa idle');
  assert.equal(idleState.command, 'opensasa.startSession');
  assert.match(idleState.tooltip, /No OpenSasa session is active/);

  assert.equal(activeState.text, '$(record) OpenSasa active');
  assert.equal(activeState.command, 'opensasa.finishSession');
  assert.match(activeState.tooltip, /session-123/);
});

test('VS Code model quick pick includes provider defaults and custom fallback', () => {
  const openAiModels = getModelItems('OpenAI');
  const unknownProviderModels = getModelItems('Custom Provider');

  assert.deepEqual(
    openAiModels.map((item) => item.value),
    ['gpt-5', CUSTOM_MODEL_VALUE],
  );
  assert.deepEqual(
    unknownProviderModels.map((item) => item.value),
    [CUSTOM_MODEL_VALUE],
  );
});

test('VS Code prompt helpers return selected quick-pick values', async () => {
  const taskType = await pickTaskType({
    showQuickPick: async (items) => items.find((item) => item.value === 'frontend_ui'),
  });
  const finalOutcome = await pickFinalOutcome({
    showQuickPick: async (items) => items.find((item) => item.value === 'partially_accepted'),
  });

  assert.equal(taskType, 'frontend_ui');
  assert.equal(finalOutcome, 'partially_accepted');
});

test('VS Code model quick pick accepts custom model input', async () => {
  const modelId = await pickModelId(
    {
      showQuickPick: async () => ({ value: CUSTOM_MODEL_VALUE }),
      showInputBox: async () => ' gpt-5-custom ',
    },
    'OpenAI',
  );

  assert.equal(modelId, 'gpt-5-custom');
});

test('VS Code tool quick pick supports custom and omitted tool values', async () => {
  const customTool = await pickTool({
    showQuickPick: async () => ({ value: CUSTOM_TOOL_VALUE }),
    showInputBox: async () => ' Codex Cloud ',
  });
  const omittedTool = await pickTool({
    showQuickPick: async () => ({ value: OMIT_TOOL_VALUE }),
  });

  assert.equal(customTool, 'Codex Cloud');
  assert.equal(omittedTool, null);
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
