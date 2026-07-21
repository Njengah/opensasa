# Install OpenSasa

This guide covers the supported `v0.1` install path for OpenSasa.

For `v0.1`, OpenSasa is a local-first CLI with manual export only. Current Phase
7 work adds an optional ingestion endpoint for safe payload validation, but
there is no automatic upload or account sync to configure.

## Prerequisites

- Node.js `20.x` or newer from the supported range in [`package.json`](../package.json)
- npm
- Git

Check your local versions:

```bash
node --version
npm --version
git --version
```

## Install From A Local Checkout

Clone the repository and enter it:

```bash
git clone https://github.com/Njengah/opensasa.git
cd opensasa
```

Install dependencies and build the CLI:

```bash
npm install
npm run build
```

Link the local package so the `opensasa` command is available in your shell:

```bash
npm link
```

Verify the command works:

```bash
opensasa --help
```

You can also run the built CLI directly without linking:

```bash
node ./dist/index.js --help
```

## First Run

Try the local-only workflow with a temporary database:

```bash
opensasa log \
  --db-path ./opensasa-dev.db \
  --provider OpenAI \
  --model-id gpt-5 \
  --task-type bug_fix \
  --final-outcome accepted \
  --tests-outcome passed \
  --estimated-cost-usd 0.42
```

Then inspect what was recorded:

```bash
opensasa sessions --db-path ./opensasa-dev.db
opensasa report --db-path ./opensasa-dev.db
```

## Local Database Path

By default, OpenSasa stores data at:

```text
~/.opensasa/opensasa.db
```

Override that path per command:

```bash
opensasa report --db-path ./opensasa-dev.db
```

Or set a persistent local override in:

```text
~/.opensasa/config.json
```

Example:

```json
{
  "db_path": "/path/to/opensasa.db"
}
```

## Update Or Remove The Linked CLI

After pulling new changes:

```bash
git pull
npm install
npm run build
```

Remove the linked command when you are done:

```bash
npm unlink -g opensasa
```

## Current Scope Reminder

- OpenSasa runs locally.
- The dashboard reads only the local SQLite database.
- Contribution export writes local JSON files.
- `v0.1` does not include uploads or contribution submission.

After installation, try the seeded end-to-end flow in
[`docs/DEMO_WALKTHROUGH.md`](./DEMO_WALKTHROUGH.md).
