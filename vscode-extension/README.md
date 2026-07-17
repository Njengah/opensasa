# OpenSasa VS Code extension

This directory is the package scaffold for the OpenSasa VS Code extension.
It is intentionally local-first: the extension will communicate with the
OpenSasa CLI and its local SQLite database in later Phase 4 PRs.

## Install For Local Development

Prerequisites:

- VS Code `1.85.0` or newer,
- Node.js `20.x` or newer,
- repository dependencies installed from the project root.

From the repository root, prepare the local CLI that the extension calls:

```sh
npm install
npm run build
npm link
```

`npm link` exposes the local `opensasa` executable on your machine so the
extension can launch the CLI without hardcoding a repo path.

## Develop And Verify

From this directory, run:

```sh
npm run check
npm run package:vsix
```

From the repository root, `npm test` now includes this extension smoke check
after the shared test suite.

`npm run package:vsix` creates an installable `.vsix` package in the
`vscode-extension` directory using the official `@vscode/vsce` packaging tool.

To try the extension in VS Code:

1. Open the `vscode-extension` directory in VS Code.
2. Press `F5` to start an Extension Development Host window.
3. In the new window, run the `OpenSasa:` commands from the Command Palette.

The Extension Development Host uses the same local `opensasa` executable you
prepared with `npm link`.

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

## Notes

- The extension stays local-first; it talks only to your local OpenSasa CLI and database.
- If you change the CLI code, rerun `npm run build` from the repository root before testing the extension again.
- If you want the extension to use a non-default SQLite file, set `opensasa.dbPath` before launching the Extension Development Host.

## Release Packaging

Package the extension locally with:

```sh
npm --prefix ./vscode-extension run package:vsix
```

The generated `.vsix` file can be installed in VS Code with `Extensions: Install
from VSIX...`.

GitHub Actions also includes a release packaging workflow at
`.github/workflows/vscode-extension-package.yml`. It can be run manually with
`workflow_dispatch` or by pushing a tag that matches `vscode-extension-v*`.
The workflow verifies the repository, packages the extension on Linux, and
uploads the `.vsix` file as a build artifact.
