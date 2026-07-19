# Demo Walkthrough

This walkthrough is the fastest way to evaluate OpenSasa without recording any
real project activity.

It uses `opensasa demo-seed` to create synthetic local sessions, then walks
through the main `v0.1` flow: sessions, report, inspect, contribution preview,
export, and dashboard.

For installation steps first, see [`docs/INSTALL.md`](./INSTALL.md).

## 1. Prepare A Local Demo Checkout

From the repo root:

```bash
npm install
npm run build
npm link
```

Verify the CLI is available:

```bash
opensasa --help
```

## 2. Create A Demo Database

Seed safe synthetic sessions into a local demo database:

```bash
opensasa demo-seed --db-path ./opensasa-demo.db
```

This creates local-only demo sessions. It does not store source code, prompts,
model responses, exact paths, or raw terminal output.

If you want the created session IDs in machine-readable form:

```bash
opensasa demo-seed --db-path ./opensasa-demo.db --json
```

## 3. Review The Demo Sessions

List the seeded sessions:

```bash
opensasa sessions --db-path ./opensasa-demo.db
```

Or inspect a compact JSON list:

```bash
opensasa sessions --db-path ./opensasa-demo.db --json --limit 3
```

Copy one `session_id` from that output for the next steps.

## 4. Generate A Local Report

See the headline report:

```bash
opensasa report --db-path ./opensasa-demo.db --compact
```

Or open the full report:

```bash
opensasa report --db-path ./opensasa-demo.db
```

This gives you the private local view of cost, outcomes, verification, and
useful-session metrics without uploading anything.

## 5. Inspect One Demo Session

Replace `<session-id>` with one of the IDs from `opensasa sessions`:

```bash
opensasa inspect <session-id> --db-path ./opensasa-demo.db
```

For JSON output:

```bash
opensasa inspect <session-id> --db-path ./opensasa-demo.db --json
```

## 6. Preview A Contribution Payload

Inspect the sanitized contribution preview for that same session:

```bash
opensasa inspect <session-id> --contribution --db-path ./opensasa-demo.db
```

For JSON output:

```bash
opensasa inspect <session-id> --contribution --db-path ./opensasa-demo.db --json
```

The preview remains local. In `v0.1`, OpenSasa does not upload the payload.

## 7. Export A Local Contribution File

If the selected session already has contribution consent granted, export it:

```bash
opensasa export <session-id> --db-path ./opensasa-demo.db --out ./contribution.json --yes
```

Or include detached metadata:

```bash
opensasa export <session-id> --db-path ./opensasa-demo.db --out ./contribution.json --metadata-out ./contribution.metadata.json --yes
```

This writes local JSON files only. There is no upload destination or submission
workflow in `v0.1`.

## 8. Open The Local Dashboard

Start the local dashboard against the demo database:

```bash
opensasa dashboard --db-path ./opensasa-demo.db --port 3210
```

Then open:

```text
http://127.0.0.1:3210
```

The dashboard reads only the local SQLite file and does not send telemetry or
session data anywhere.

## 9. Reset The Demo

To start over, delete the demo database file and seed it again:

```bash
rm ./opensasa-demo.db
opensasa demo-seed --db-path ./opensasa-demo.db
```

On Windows PowerShell:

```powershell
Remove-Item .\opensasa-demo.db
opensasa demo-seed --db-path .\opensasa-demo.db
```

## What This Proves

In under 10 minutes, the walkthrough shows that OpenSasa can:

- record or seed safe local sessions,
- summarize them with local reports,
- inspect one session in detail,
- preview a contribution payload before export,
- export local JSON artifacts,
- and serve a local-only dashboard.
