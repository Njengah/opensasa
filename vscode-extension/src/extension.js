const vscode = require('vscode');
const { runOpenSasaCli } = require('./cli');

/**
 * Extension entry point. Commands communicate with the local CLI only.
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const showStatus = vscode.commands.registerCommand('opensasa.showStatus', () => {
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    runOpenSasaCli(['agent', 'status', '--json'], { cwd })
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
    const provider = await vscode.window.showInputBox({ prompt: 'AI provider', placeHolder: 'OpenAI' });
    if (!provider) return;
    const modelId = await vscode.window.showInputBox({ prompt: 'Model ID', placeHolder: 'gpt-4o' });
    if (!modelId) return;
    const taskType = await vscode.window.showInputBox({ prompt: 'Task type', placeHolder: 'feature' });
    if (!taskType) return;

    runOpenSasaCli(
      ['draft', '--provider', provider, '--model-id', modelId, '--task-type', taskType, '--json', ...(cwd ? ['--project-path', cwd] : [])],
      { cwd },
    )
      .then(({ stdout }) => {
        const result = JSON.parse(stdout);
        vscode.window.showInformationMessage(`OpenSasa session started: ${result.session.session_id}`);
      })
      .catch((error) => vscode.window.showErrorMessage(`OpenSasa CLI failed: ${error.message}`));
  });

  context.subscriptions.push(showStatus, startSession);
}

function deactivate() {}

module.exports = { activate, deactivate };
