const vscode = require('vscode');
const { launchOpenSasaDashboard, runOpenSasaCli } = require('./cli');
const { appendDbPathArgs, getExtensionDbPath } = require('./config');
const { pickFinalOutcome, pickModelId, pickTaskType, pickTool } = require('./prompts');
const { maybeShowPrivacyNotice } = require('./privacy-notice');
const { applyStatusBarState } = require('./status-bar');

let activeSessionId;

/**
 * Extension entry point. Commands communicate with the local CLI only.
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  applyStatusBarState(statusBarItem, activeSessionId);
  void maybeShowPrivacyNotice(vscode.window, context.globalState);

  const showStatus = vscode.commands.registerCommand('opensasa.showStatus', () => {
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const dbPath = getExtensionDbPath(vscode.workspace);
    runOpenSasaCli(appendDbPathArgs(['agent', 'status', '--json'], dbPath), { cwd })
      .then(({ stdout }) => {
        const status = JSON.parse(stdout);
        vscode.window.showInformationMessage(
          status.status === 'active' ? 'OpenSasa session is active.' : 'OpenSasa has no active session.',
        );
      })
      .catch((error) => vscode.window.showErrorMessage(`OpenSasa CLI failed: ${error.message}`));
  });

  const startSession = vscode.commands.registerCommand('opensasa.startSession', async () => {
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const dbPath = getExtensionDbPath(vscode.workspace);
    const provider = await vscode.window.showInputBox({
      prompt: 'AI provider',
      placeHolder: 'OpenAI',
      ignoreFocusOut: true,
    });
    const trimmedProvider = provider?.trim();
    if (!trimmedProvider) return;

    const modelId = await pickModelId(vscode.window, trimmedProvider);
    if (!modelId) return;

    const tool = await pickTool(vscode.window);
    if (tool === undefined) return;

    const taskType = await pickTaskType(vscode.window);
    if (!taskType) return;

    runOpenSasaCli(
      appendDbPathArgs([
        'draft',
        '--provider',
        trimmedProvider,
        '--model-id',
        modelId,
        ...(tool ? ['--tool', tool] : []),
        '--task-type',
        taskType,
        '--json',
        ...(cwd ? ['--project-path', cwd] : []),
      ], dbPath),
      { cwd },
    )
      .then(({ stdout }) => {
        const result = JSON.parse(stdout);
        activeSessionId = result.session.session_id;
        applyStatusBarState(statusBarItem, activeSessionId);
        vscode.window.showInformationMessage(`OpenSasa session started: ${result.session.session_id}`);
      })
      .catch((error) => vscode.window.showErrorMessage(`OpenSasa CLI failed: ${error.message}`));
  });

  const finishSession = vscode.commands.registerCommand('opensasa.finishSession', async () => {
    if (!activeSessionId) {
      vscode.window.showWarningMessage('OpenSasa has no session started in this editor window.');
      return;
    }

    const finalOutcome = await pickFinalOutcome(vscode.window);
    if (!finalOutcome) return;

    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const dbPath = getExtensionDbPath(vscode.workspace);
    runOpenSasaCli(
      appendDbPathArgs(['finalize', activeSessionId, '--final-outcome', finalOutcome, '--json'], dbPath),
      { cwd },
    )
      .then(({ stdout }) => {
        const result = JSON.parse(stdout);
        activeSessionId = undefined;
        applyStatusBarState(statusBarItem, activeSessionId);
        vscode.window.showInformationMessage(`OpenSasa session finished: ${result.session.session_id}`);
      })
      .catch((error) => vscode.window.showErrorMessage(`OpenSasa CLI failed: ${error.message}`));
  });

  const openDashboard = vscode.commands.registerCommand('opensasa.openDashboard', () => {
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const dbPath = getExtensionDbPath(vscode.workspace);

    launchOpenSasaDashboard(appendDbPathArgs(['dashboard'], dbPath), { cwd })
      .then(async ({ url, alreadyRunning }) => {
        await vscode.env.openExternal(vscode.Uri.parse(url));
        vscode.window.showInformationMessage(
          alreadyRunning ? `OpenSasa dashboard already running: ${url}` : `OpenSasa dashboard opened: ${url}`,
        );
      })
      .catch((error) => vscode.window.showErrorMessage(`OpenSasa dashboard failed: ${error.message}`));
  });

  context.subscriptions.push(statusBarItem, showStatus, startSession, finishSession, openDashboard);
}

function deactivate() {}

module.exports = { activate, deactivate };
