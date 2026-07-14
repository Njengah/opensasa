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

The current scaffold exposes `OpenSasa: Show Status` as a safe activation
smoke check. It does not capture, transmit, or persist any data yet.
