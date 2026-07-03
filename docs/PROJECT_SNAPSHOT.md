# OpenSasa Project Snapshot

This snapshot is a quick orientation note for returning to the project after time away.

## What We Are Building

OpenSasa is a local-first CLI for tracking real-world AI coding sessions using safe metadata.

The near-term product is not a public leaderboard or hosted dashboard. It is a private local tracker that helps a developer answer:

- which AI models were used,
- what kind of work they were used for,
- whether the result was accepted or rejected,
- whether checks passed,
- how much the work cost,
- how many retries were needed,
- and how quickly useful output was reached.

The privacy boundary is central: no source code, private prompts, model responses, exact file paths, secrets, repository names, or raw terminal output are stored or uploaded by default.

## What Runs Today

The runnable product is a Node.js CLI backed by local SQLite storage.

Build it:

```bash
npm install
npm run build
```

Show available commands:

```bash
node ./dist/index.js --help
```

Run tests:

```bash
npm test
```

Use a temporary database while experimenting:

```bash
node ./dist/index.js log \
  --db-path ./opensasa-dev.db \
  --provider OpenAI \
  --model-id gpt-5 \
  --task-type feature \
  --final-outcome accepted \
  --tests-outcome passed \
  --duration-seconds 300 \
  --retry-count 1 \
  --estimated-cost-usd 0.42
```

Then inspect the data:

```bash
node ./dist/index.js sessions --db-path ./opensasa-dev.db
node ./dist/index.js report --db-path ./opensasa-dev.db
```

Preview the no-upload contribution payload for one session:

```bash
node ./dist/index.js inspect <session-id> --contribution --db-path ./opensasa-dev.db
```

## Implemented CLI Commands

- `opensasa log` records a manual AI coding session.
- `opensasa update` edits safe metadata for an existing session.
- `opensasa delete` removes a local session after explicit `--yes` confirmation.
- `opensasa sessions` lists local sessions with filters, limits, date ranges, and JSON output.
- `opensasa report` generates local personal metrics with filters, limits, date ranges, and JSON output.
- `opensasa inspect` shows one local record or a sanitized contribution preview.

## Report Metrics Implemented

Local reports currently include:

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
- accepted or partially accepted count,
- rejected count,
- unknown outcome count,
- estimated total cost,
- cost by provider,
- cost by model,
- cost by tool,
- cost by language,
- cost by framework,
- cost by work mode,
- cost by cost source,
- cost by repo size bucket,
- cost by file count bucket,
- cost per useful task,
- failure cost,
- speed to useful output,
- retry burden for useful sessions,
- failure retry burden for rejected sessions,
- confidence summary labels,
- verification outcome summary,
- useful outcome rate,
- unknown outcome rate,
- and verified success rate.

## Recent Build Path

Recent PRs focused on hardening the local CLI workflow:

- session and report JSON output,
- session update and delete commands,
- session/report filters and limits,
- tool, language, framework, and work mode filters for sessions and reports,
- timestamp range filters and instant-aware timestamp comparisons,
- expanded report methodology metrics,
- local inspection and no-upload contribution preview,
- local contribution consent state,
- seed methodology examples,
- provider, tool, language, framework, work mode, cost source, repo size, and file count grouping in local reports.

## Where We Are In The Roadmap

Current stage: local CLI-first MVP.

Completed:

- manual local tracker,
- local SQLite storage,
- safe metadata validation,
- local reports,
- local inspection,
- no-upload contribution preview,
- local contribution consent state,
- README workflow documentation.

Still out of scope:

- public uploads,
- public rankings,
- hosted backend,
- web dashboard,
- automatic imports from coding tools,
- real contribution submission.

## Good Next Work

The next useful work should stay local-first and privacy-safe. Good candidates:

- refine report clarity and methodology labels,
- add more local report filters or grouping,
- or add import/wrapper experiments only if they do not collect private content.

