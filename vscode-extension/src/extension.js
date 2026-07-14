const vscode = require('vscode');

/**
 * Extension entry point. CLI communication is intentionally deferred to the
 * next Phase 4 PR; this scaffold only proves that the package can activate.
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const disposable = vscode.commands.registerCommand('opensasa.showStatus', () => {
    vscode.window.showInformationMessage('OpenSasa is ready.');
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };
