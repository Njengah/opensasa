# OpenSasa VS Code extension

This directory is the package scaffold for the OpenSasa VS Code extension.
It is intentionally local-first: the extension will communicate with the
OpenSasa CLI and its local SQLite database in later Phase 4 PRs.

## Development

From this directory, run:

```sh
npm run check
```

From the repository root, `npm test` now includes this extension smoke check
after the shared test suite.

To try the extension in VS Code, open this directory as a workspace and press
`F5` after installing the VS Code Extension Development host tools.

The extension exposes `OpenSasa: Show Status`, which invokes the local
`opensasa agent status --json` command. Arguments are passed without a shell,
and command output is kept in memory so the extension does not capture or
transmit it.

On first activation, the extension shows a local privacy notice: OpenSasa keeps
session metadata in your local database and does not upload source code,
private prompts, model responses, exact file paths, or raw terminal output.

Set `opensasa.dbPath` in VS Code settings when the extension should use a
specific local SQLite database instead of the CLI default path or other local
OpenSasa config resolution.

Run `OpenSasa: Open Dashboard` to start the local dashboard server through the
CLI and open the local report UI in your browser.

The extension also shows a status bar item in the current editor window. It
starts in an idle state, switches to active after `OpenSasa: Start Session`,
and switches back to idle after `OpenSasa: Finish Session`. The item clicks
through to the matching start or finish command.

`OpenSasa: Start Session` asks for the provider, then uses quick picks for the
model ID, tool, and task type before creating a local draft with
`opensasa draft --json`. The workspace path is only sent to the CLI so it can
derive the privacy-safe project identity hash.

`OpenSasa: Finish Session` uses a quick pick for the final outcome and
finalizes the session created in the current editor window with
`opensasa finalize --json`.
