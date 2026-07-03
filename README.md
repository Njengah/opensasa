# OpenSasa

OpenSasa is an early-stage open-source project for real-world AI coding intelligence.

The goal is to help developers understand which AI models actually work in software engineering workflows, not only which models perform well on static benchmarks or vendor-published charts.

## Rationale

AI coding models are changing quickly. New models ship, pricing changes, context windows expand, benchmarks move, and developers keep asking the same practical questions:

- Which model is best for this kind of coding task?
- How much does it cost to get a useful result?
- Which models waste the most retries?
- Which models produce changes that pass tests?
- Which models are improving or getting worse after releases?
- Which tools and agents work best in real repositories?

Benchmarks are useful, but they do not fully capture what happens in everyday development: failed patches, accepted changes, retries, task complexity, cost per useful outcome, verification results, and model drift over time.

OpenSasa is built around a simple belief:

> If AI models are going to shape software engineering, software engineers should help define how they are measured.

## Project Scope

OpenSasa is intended to become a privacy-first system for tracking and comparing AI coding workflows using safe, opt-in developer metadata.

The long-term product direction includes:

- a local tracker for AI coding sessions,
- a private developer dashboard,
- a public AI coding model index,
- transparent scoring methodology,
- model release drift tracking,
- cost-per-useful-outcome reporting,
- and shareable reports for the developer community.

## Project Boundaries

OpenSasa is not:

- another generic LLM leaderboard,
- a vendor ranking page,
- a benchmark-only aggregator,
- a coding-hours vanity board,
- a source-code harvesting tool,
- or a closed analytics product with unverifiable methodology.

The project should be useful to individual developers first, and only then contribute to a broader public index through explicit opt-in.

## Privacy Principles

OpenSasa should be local-first and privacy-first by default.

The intended default is:

> No source code uploaded. No private prompts exposed. Developers choose what they share.

Safe metadata may include information such as model name, provider, coding tool, task type, language, estimated tokens, estimated cost, duration, retry count, check outcomes, and accepted or rejected status.

Data excluded by default should include source code, private prompts, model responses, exact file paths, repository names, company names, secrets, and terminal output that could contain private information.

## Project Status

This repository now contains the first CLI-first MVP workflow for local manual
tracking.

Implemented local commands:

- `opensasa log`
- `opensasa update`
- `opensasa delete`
- `opensasa sessions`
- `opensasa report`
- `opensasa inspect`

The current product is intentionally local-only. It can log safe AI coding
session metadata, store records in a local SQLite database, update or delete
local records, list previous sessions, generate a personal report, and preview
a sanitized contribution payload. It does not upload data or publish rankings.

The public development and versioning approach is described in
[Development Cycle](./docs/DEVELOPMENT_CYCLE.md). The MVP workflow is described
in [MVP Workflow](./docs/MVP_WORKFLOW.md).
Seed-only methodology examples are available in
[Methodology Examples](./docs/METHODOLOGY_EXAMPLES.md).

For a quick reminder of what currently runs and where development stopped, see
[Project Snapshot](./docs/PROJECT_SNAPSHOT.md).

## Local CLI Usage

Install dependencies and build the CLI:

```bash
npm install
npm run build
```

Run the CLI locally:

```bash
node ./dist/index.js --help
```

When installed as a package, the executable name is:

```bash
opensasa
```

### Log A Session

`opensasa log` records one AI-assisted coding session manually.

Required fields:

- provider,
- model ID,
- task type,
- final outcome.

Example:

```bash
node ./dist/index.js log \
  --provider OpenAI \
  --model-id gpt-5 \
  --task-type bug_fix \
  --final-outcome accepted \
  --tests-outcome passed \
  --estimated-cost-usd 0.42
```

The command stores the record locally and prints the generated session ID.

Use JSON output for scripting:

```bash
node ./dist/index.js log \
  --json \
  --provider OpenAI \
  --model-id gpt-5 \
  --task-type bug_fix \
  --final-outcome accepted
```

Useful optional fields include:

- `--timestamp`
- `--model-version`
- `--tool`
- `--language`
- `--framework`
- `--duration-seconds`
- `--retry-count`
- `--error-count`
- `--input-tokens-estimate`
- `--output-tokens-estimate`
- `--cached-tokens-estimate`
- `--cost-source`
- `--repo-size-bucket`
- `--file-count-bucket`
- `--changed-file-count-bucket`
- `--lines-added-bucket`
- `--lines-removed-bucket`
- `--tests-outcome`
- `--build-outcome`
- `--lint-outcome`
- `--typecheck-outcome`
- `--manual-review-outcome`
- `--contribution-consent`

For tests or temporary runs, override the database path:

```bash
node ./dist/index.js log \
  --db-path ./opensasa-dev.db \
  --provider OpenAI \
  --model-id gpt-5 \
  --task-type feature \
  --final-outcome partially_accepted
```

### Update A Session

```bash
node ./dist/index.js update <session-id> \
  --final-outcome accepted \
  --tests-outcome passed \
  --retry-count 2 \
  --contribution-consent granted
```

Use JSON output for scripting:

```bash
node ./dist/index.js update <session-id> \
  --json \
  --final-outcome accepted
```

The update command accepts the same safe metadata fields as `log`. It validates
the full session before writing and does not add prompts, source code, model
responses, exact paths, secrets, or terminal output.

### Delete A Session

```bash
node ./dist/index.js delete <session-id> --yes
```

Use JSON output for scripting:

```bash
node ./dist/index.js delete <session-id> --yes --json
```

The delete command removes one local session record from the local SQLite
database. It requires `--yes` so deletion is explicit.

### List Sessions

```bash
node ./dist/index.js sessions
```

Use JSON output for scripting:

```bash
node ./dist/index.js sessions --json
```

Limit the list to the newest sessions:

```bash
node ./dist/index.js sessions --limit 10
```

Filter the list by safe metadata fields:

```bash
node ./dist/index.js sessions \
  --provider OpenAI \
  --model-id gpt-5 \
  --tool Codex \
  --language TypeScript \
  --framework Node.js \
  --work-mode manual_log \
  --task-type bug_fix \
  --final-outcome accepted
```

Filter the list by timestamp range:

```bash
node ./dist/index.js sessions \
  --since 2026-06-01T00:00:00.000Z \
  --until 2026-06-30T23:59:59.999Z
```

The list output shows:

- session ID,
- timestamp,
- provider,
- model ID,
- task type,
- final outcome,
- verified success status,
- estimated cost when known.

### Generate A Local Report

```bash
node ./dist/index.js report
```

Use JSON output for scripting:

```bash
node ./dist/index.js report --json
```

Limit the report to the newest sessions:

```bash
node ./dist/index.js report --limit 10
```

Filter the report by safe metadata fields:

```bash
node ./dist/index.js report \
  --provider OpenAI \
  --model-id gpt-5 \
  --tool Codex \
  --language TypeScript \
  --framework Node.js \
  --work-mode manual_log \
  --task-type bug_fix \
  --final-outcome accepted
```

Filter the report by timestamp range:

```bash
node ./dist/index.js report \
  --since 2026-06-01T00:00:00.000Z \
  --until 2026-06-30T23:59:59.999Z
```

The report is generated from local data only. It includes:

- total sessions,
- sessions by provider,
- sessions by model,
- sessions by tool,
- sessions by language,
- sessions by framework,
- sessions by work mode,
- sessions by cost source,
- sessions by repo size bucket,
- sessions by file count bucket,
- sessions by task type,
- accepted and partially accepted count,
- rejected count,
- unknown outcome count,
- estimated total cost,
- cost per useful task,
- failure cost,
- cost by provider,
- cost by model,
- cost by tool,
- cost by language,
- cost by framework,
- cost by work mode,
- cost by cost source,
- cost by repo size bucket,
- cost by file count bucket,
- speed to useful output,
- retry summary,
- failure retry burden,
- confidence summary,
- verification outcome summary,
- useful outcome rate,
- unknown outcome rate,
- verified success rate.

Unknown or missing data is labeled directly.

### Inspect A Session

```bash
node ./dist/index.js inspect <session-id>
```

Use JSON output for scripting:

```bash
node ./dist/index.js inspect <session-id> --json
```

This shows the local record for one session and repeats the privacy boundary.

### Preview A Contribution Payload

```bash
node ./dist/index.js inspect <session-id> --contribution
```

Use JSON output for scripting:

```bash
node ./dist/index.js inspect <session-id> --contribution --json
```

This generates a local preview of what a future contribution payload could
include. The preview shows included fields, excluded fields, bucketed values,
schema version, data source, consent status, validation status, and no-upload
status.

Contribution consent is stored locally as `not_granted`, `granted`, or
`revoked`. Setting it does not enable uploads in the MVP.

Uploads are not enabled in the MVP.

## Local Storage

By default, OpenSasa stores records at:

```text
~/.opensasa/opensasa.db
```

The database path can be overridden with `--db-path` or `OPENSASA_DB_PATH`.

## Current Limitations

The MVP does not include:

- public uploads,
- public rankings,
- hosted backend,
- web dashboard,
- team dashboard,
- automatic imports from AI coding tools,
- contribution submission.

Bucket thresholds and report formatting are early implementation defaults and
may change as the methodology matures.

## Positioning

> OpenSasa is real-world intelligence for AI coding.

More specifically:

> OpenSasa helps developers and teams understand which AI models actually work in real software engineering workflows.
