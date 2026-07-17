import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  DEFAULT_DASHBOARD_URL,
  isDashboardAlreadyRunning,
  launchOpenSasaDashboard,
  parseDashboardUrl,
  runOpenSasaCli,
} from '../vscode-extension/src/cli.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const {
  appendDbPathArgs,
  DB_PATH_SETTING,
  EXTENSION_NAMESPACE,
  readConfiguredDbPath,
} = require('../vscode-extension/src/config.js');
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
  PRIVACY_NOTICE_KEY,
  PRIVACY_NOTICE_MESSAGE,
  maybeShowPrivacyNotice,
} = require('../vscode-extension/src/privacy-notice.js');
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
  assert.ok(packageJson.contributes.commands.some((command) => command.command === 'opensasa.openDashboard'));
  assert.equal(packageJson.repository.url, 'https://github.com/Njengah/opensasa.git');
  assert.equal(packageJson.contributes.configuration.title, 'OpenSasa');
  assert.equal(packageJson.contributes.configuration.properties['opensasa.dbPath'].type, 'string');
  assert.ok(packageJson.files.includes('src'));
  assert.ok(packageJson.files.includes('README.md'));
  assert.ok(packageJson.files.includes('LICENSE'));
  assert.match(packageJson.scripts.check, /src\/cli\.js/);
  assert.match(packageJson.scripts['package:vsix'], /@vscode\/vsce package/);
  assert.match(packageJson.scripts.check, /src\/extension\.js/);
  assert.match(packageJson.scripts.check, /src\/status-bar\.js/);
});

test('Root test script runs the VS Code extension smoke check', async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(root, 'package.json'), 'utf8'),
  );

  assert.match(packageJson.scripts.test, /npm --prefix \.\/vscode-extension run check/);
});

test('VS Code extension README documents local install and development flow', async () => {
  const readme = await readFile(
    path.join(root, 'vscode-extension', 'README.md'),
    'utf8',
  );

  assert.match(readme, /## Install For Local Development/);
  assert.match(readme, /npm install/);
  assert.match(readme, /npm run build/);
  assert.match(readme, /npm link/);
  assert.match(readme, /Press `F5` to start an Extension Development Host window/);
  assert.match(readme, /opensasa\.dbPath/);
  assert.match(readme, /npm --prefix \.\/vscode-extension run package:vsix/);
  assert.match(readme, /Install\s+from VSIX/);
  assert.match(readme, /\.github\/workflows\/vscode-extension-package\.yml/);
});

test('Root README links to the VS Code extension development notes', async () => {
  const readme = await readFile(
    path.join(root, 'README.md'),
    'utf8',
  );

  assert.match(readme, /\[vscode-extension\/README\.md\]\(\.\/vscode-extension\/README\.md\)/);
});

test('GitHub workflow packages the VS Code extension as a VSIX artifact', async () => {
  const workflow = await readFile(
    path.join(root, '.github', 'workflows', 'vscode-extension-package.yml'),
    'utf8',
  );

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /vscode-extension-v\*/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm install -g @vscode\/vsce/);
  assert.match(workflow, /working-directory: vscode-extension/);
  assert.match(workflow, /vsce package/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
});

test('VS Code extension scaffold has an activation entry point', async () => {
  const source = await readFile(
    path.join(root, 'vscode-extension', 'src', 'extension.js'),
    'utf8',
  );

  assert.match(source, /maybeShowPrivacyNotice/);
  assert.match(source, /context\.globalState/);
  assert.match(source, /getExtensionDbPath/);
  assert.match(source, /appendDbPathArgs/);
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
  assert.match(source, /registerCommand\(\s*['"]opensasa\.openDashboard['"]\s*,/);
  assert.match(source, /launchOpenSasaDashboard/);
  assert.match(source, /openExternal/);
  assert.match(source, /['"]dashboard['"]/);
});

test('VS Code extension config helper reads a trimmed local database path', () => {
  const config = {
    get(key) {
      assert.equal(key, DB_PATH_SETTING);
      return ' C:/Users/User/.opensasa/custom.db ';
    },
  };

  assert.equal(readConfiguredDbPath(config), 'C:/Users/User/.opensasa/custom.db');
});

test('VS Code extension config helper ignores missing database path values', () => {
  assert.equal(readConfiguredDbPath({ get: () => undefined }), undefined);
  assert.equal(readConfiguredDbPath({ get: () => '   ' }), undefined);
});

test('VS Code extension config helper appends --db-path only when configured', () => {
  const baseArgs = ['agent', 'status', '--json'];

  assert.deepEqual(
    appendDbPathArgs(baseArgs, 'C:/Users/User/.opensasa/custom.db'),
    ['agent', 'status', '--json', '--db-path', 'C:/Users/User/.opensasa/custom.db'],
  );
  assert.deepEqual(appendDbPathArgs(baseArgs, undefined), baseArgs);
  assert.equal(EXTENSION_NAMESPACE, 'opensasa');
});

test('VS Code dashboard helper parses the local dashboard URL', () => {
  assert.equal(
    parseDashboardUrl('OpenSasa dashboard running at http://127.0.0.1:3210'),
    'http://127.0.0.1:3210',
  );
  assert.equal(parseDashboardUrl('not a dashboard line'), undefined);
});

test('VS Code dashboard helper recognizes an already-running local dashboard', () => {
  assert.equal(isDashboardAlreadyRunning('listen EADDRINUSE: address already in use 127.0.0.1:3210'), true);
  assert.equal(isDashboardAlreadyRunning('another local error'), false);
  assert.equal(DEFAULT_DASHBOARD_URL, 'http://127.0.0.1:3210');
});

test('VS Code dashboard launcher resolves the announced dashboard URL', async () => {
  const result = await launchOpenSasaDashboard(
    ['-e', "console.log('OpenSasa dashboard running at http://127.0.0.1:4567'); setTimeout(() => process.exit(0), 25)"],
    { executable: process.execPath, timeoutMs: 2000 },
  );

  assert.equal(result.url, 'http://127.0.0.1:4567');
  assert.equal(result.alreadyRunning, false);
});

test('VS Code dashboard launcher falls back when the default dashboard port is already in use', async () => {
  const result = await launchOpenSasaDashboard(
    ['-e', "process.stderr.write('listen EADDRINUSE: address already in use 127.0.0.1:3210'); process.exit(1)"],
    { executable: process.execPath, timeoutMs: 2000 },
  );

  assert.equal(result.url, DEFAULT_DASHBOARD_URL);
  assert.equal(result.alreadyRunning, true);
});

test('VS Code privacy notice helper shows once and persists the acknowledgement', async () => {
  const seen = new Map();
  const calls = [];
  const state = {
    get(key) {
      return seen.get(key);
    },
    async update(key, value) {
      seen.set(key, value);
    },
  };
  const ui = {
    async showInformationMessage(message) {
      calls.push(message);
    },
  };

  const firstResult = await maybeShowPrivacyNotice(ui, state);
  const secondResult = await maybeShowPrivacyNotice(ui, state);

  assert.equal(firstResult, true);
  assert.equal(secondResult, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0], PRIVACY_NOTICE_MESSAGE);
  assert.equal(seen.get(PRIVACY_NOTICE_KEY), true);
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
