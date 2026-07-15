# OpenSasa VS Code extension

This directory is the package scaffold for the OpenSasa VS Code extension.
It is intentionally local-first: the extension will communicate with the
OpenSasa CLI and its local SQLite database in later Phase 4 PRs.

## Development

From this directory, run:

```sh
npm run check
```

To try the extension in VS Code, open this directory as a workspace and press
`F5` after installing the VS Code Extension Development host tools.

The extension exposes `OpenSasa: Show Status`, which invokes the local
`opensasa agent status --json` command. Arguments are passed without a shell,
and command output is kept in memory so the extension does not capture or
transmit it.
