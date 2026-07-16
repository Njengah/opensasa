function buildStatusBarState(activeSessionId) {
  if (activeSessionId) {
    return {
      text: '$(record) OpenSasa active',
      tooltip: `OpenSasa session active: ${activeSessionId}\nClick to finish this local session.`,
      command: 'opensasa.finishSession',
    };
  }

  return {
    text: '$(circle-large-outline) OpenSasa idle',
    tooltip: 'No OpenSasa session is active in this editor window.\nClick to start a local session.',
    command: 'opensasa.startSession',
  };
}

function applyStatusBarState(statusBarItem, activeSessionId) {
  const state = buildStatusBarState(activeSessionId);
  statusBarItem.text = state.text;
  statusBarItem.tooltip = state.tooltip;
  statusBarItem.command = state.command;
  statusBarItem.show();
  return state;
}

module.exports = {
  applyStatusBarState,
  buildStatusBarState,
};
