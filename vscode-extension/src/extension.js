const vscode = require('vscode');
const { runOpenSasaCli } = require('./cli');

/**
 * Extension entry point. Commands communicate with the local CLI only.
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const disposable = vscode.commands.registerCommand('opensasa.showStatus', () => {
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    runOpenSasaCli(['agent', 'status', '--json'], { cwd })
      .then(({ stdout }) => {
        const status = JSON.parse(stdout);
        vscode.window.showInformationMessage(
          status.active ? 'OpenSasa session is active.' : 'OpenSasa has no active session.',
        );
      })
      .catch((error) => vscode.window.showErrorMessage(`OpenSasa CLI failed: ${error.message}`));
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
