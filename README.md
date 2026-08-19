# OpenSasa

Local-first CLI that records **safe metadata** about AI coding sessions so you can see which models actually work in your repos — cost, retries, verification, accepted vs rejected — without uploading source code or prompts.

It is not a public leaderboard and not a vendor benchmark page.

## What runs today

- CLI: `log`, `update`, `delete`, `demo-seed`, `sessions`, `report`, `inspect`, `export`, `doctor`, `verify`, `draft`, `finalize`, `heartbeat`, `dashboard`
- Storage: local SQLite (`~/.opensasa/opensasa.db` by default)
- Local dashboard on `127.0.0.1` (overview, model/tool comparison, cost, verification). **No upload.**
- Optional sanitized contribution JSON export (consent + `--yes` required). No automatic sync.

## Install

```bash
npm install
npm run build
node ./dist/index.js --help
```

Package name when linked: `opensasa`. Full install: [docs/INSTALL.md](./docs/INSTALL.md).

## Demo (no real project data)

```bash
node ./dist/index.js demo-seed --db-path ./opensasa-demo.db
node ./dist/index.js sessions --db-path ./opensasa-demo.db
node ./dist/index.js report --db-path ./opensasa-demo.db --compact
node ./dist/index.js dashboard --db-path ./opensasa-demo.db
```

## Dashboard Preview

The dashboard prints a local URL. It does not upload session data. Walkthrough: [docs/DEMO_WALKTHROUGH.md](./docs/DEMO_WALKTHROUGH.md).

## Log a session

```bash
node ./dist/index.js log \
  --provider Anthropic \
  --model-id claude-opus-4 \
  --task-type bug_fix \
  --final-outcome accepted \
  --tests-outcome passed \
  --estimated-cost-usd 0.42
```

`--db-path` or `OPENSASA_DB_PATH` overrides the default database.

## Privacy

Default: **no source code, no prompts, no model responses, no exact paths, no repo names, no secrets, no raw terminal output.**

Stored fields are things like model, provider, tool, task type, duration, retries, token estimates, cost, and check outcomes. Project identity is a one-way SHA-256 hash when you pass `--project-path`. Details: [docs/SHARING_BOUNDARY.md](./docs/SHARING_BOUNDARY.md).

## Tests

```bash
npm test
```

## Not in this repo yet

- Public uploads or rankings
- Hosted backend or team accounts
- Automatic import from Cursor / Claude Code / Copilot

Those are documented as future gates, not shipped features. An optional Phase 7 ingestion endpoint validates safe payloads but does not store them yet.

## Docs

- [docs/INSTALL.md](./docs/INSTALL.md)
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [docs/SECURITY_PRIVACY_FAQ.md](./docs/SECURITY_PRIVACY_FAQ.md)
- [docs/GOOD_FIRST_ISSUES.md](./docs/GOOD_FIRST_ISSUES.md)
- [vscode-extension/README.md](./vscode-extension/README.md)
- [docs/FIRST_RELEASE_CHECKLIST.md](./docs/FIRST_RELEASE_CHECKLIST.md)
- [docs/LAUNCH_CASE_STUDY.md](./docs/LAUNCH_CASE_STUDY.md)
- [docs/HOSTED_ARCHITECTURE.md](./docs/HOSTED_ARCHITECTURE.md)
- [docs/ACCOUNT_SYSTEM_DECISION.md](./docs/ACCOUNT_SYSTEM_DECISION.md)
- [docs/OPTIONAL_SYNC_DECISION.md](./docs/OPTIONAL_SYNC_DECISION.md)
- [docs/TEAM_PRIVATE_DASHBOARD_DESIGN.md](./docs/TEAM_PRIVATE_DASHBOARD_DESIGN.md)
- [docs/ABUSE_AND_ANTI_GAMING.md](./docs/ABUSE_AND_ANTI_GAMING.md)
- [docs/METHODOLOGY_CHANGELOG.md](./docs/METHODOLOGY_CHANGELOG.md)
- [docs/INGESTION_ENDPOINT.md](./docs/INGESTION_ENDPOINT.md)
- [docs/SERVER_SIDE_VALIDATION.md](./docs/SERVER_SIDE_VALIDATION.md)
- [docs/PUBLIC_DASHBOARD.md](./docs/PUBLIC_DASHBOARD.md)

## License

MIT. See [`LICENSE`](./LICENSE).
