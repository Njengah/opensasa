# MVP Issues

This document defines the initial implementation issue list for the OpenSasa MVP.

It translates `docs/MVP_WORKFLOW.md` and `docs/CLI_FIRST_DECISION.md` into small, reviewable product PRs.

## Scope

The MVP is a CLI-first manual local tracker.

It should include:

- CLI scaffold,
- schema validation,
- local SQLite storage,
- manual session logging,
- session listing,
- local reports,
- inspect and contribution preview.

It should not include:

- public uploads,
- public rankings,
- hosted backend,
- public index,
- web dashboard,
- AI coding tool imports,
- source-code capture,
- prompt capture,
- model-response capture,
- exact path tracking,
- raw terminal output capture.

## Issue 1: CLI Scaffold

Goal:

> Create the smallest runnable OpenSasa CLI.

Deliverables:

- package setup,
- TypeScript setup,
- executable CLI entrypoint,
- help output,
- version output,
- basic test command.

Initial commands:

```bash
opensasa --help
opensasa --version
```

Acceptance criteria:

- CLI can be run locally,
- help output lists planned commands,
- version output works,
- no network or upload behavior exists,
- test command runs.

Verification:

```bash
npm test
npm run build
node ./dist/index.js --help
```

Notes:

- Do not add database logic in this PR.
- Do not create a web app.

## Issue 2: Metadata Schema Validation

Goal:

> Implement shared validation for local session metadata.

Deliverables:

- Zod schemas for MVP session records,
- enums aligned with `docs/METADATA_SCHEMA.md`,
- derived `verified_success` helper,
- validation tests for valid and invalid records.

Acceptance criteria:

- required fields are enforced,
- optional fields are accepted,
- invalid enum values fail validation,
- unknown outcomes are represented explicitly,
- validation does not require source code, prompts, responses, exact file paths, or terminal output.

Verification:

```bash
npm test
npm run build
```

Notes:

- Keep schemas close to the documented MVP fields.
- Avoid implementing contribution upload.

## Issue 3: Local SQLite Storage

Goal:

> Store validated session metadata locally.

Deliverables:

- local database module,
- SQLite setup,
- sessions table,
- migration mechanism,
- default local path handling,
- tests for create/read behavior.

Suggested path:

```text
~/.opensasa/opensasa.db
```

Acceptance criteria:

- database initializes locally,
- sessions can be inserted and read,
- storage path can be overridden for tests,
- no network calls occur,
- excluded fields are not required by storage.

Verification:

```bash
npm test
npm run build
```

Notes:

- Keep the data access layer small.
- Do not add report calculations in this PR.

## Issue 4: Manual Session Logging

Goal:

> Implement `opensasa log` for manual session entry.

Deliverables:

- `opensasa log` command,
- required field collection,
- optional field support,
- validation before write,
- local persistence,
- success output with session ID.

Required MVP fields:

- provider,
- model ID,
- task type,
- final outcome,
- timestamp,
- work mode.

Acceptance criteria:

- developer can log a valid session,
- invalid fields are rejected before write,
- optional fields can be omitted,
- session ID is shown after save,
- command does not ask for source code, prompts, responses, exact paths, or raw terminal output.

Verification:

```bash
npm test
npm run build
opensasa log --help
```

Notes:

- Prompt-based UX and flag-based UX can be decided in implementation, but the command must be fast enough for manual use.

## Issue 5: Session Listing

Goal:

> Implement `opensasa sessions` for local session history.

Deliverables:

- `opensasa sessions` command,
- table or readable list output,
- empty-state output,
- basic sorting by timestamp.

List fields:

- session ID,
- timestamp,
- provider,
- model ID,
- task type,
- final outcome,
- verified success if known,
- estimated cost if known.

Acceptance criteria:

- command shows saved sessions,
- empty database has a clear empty state,
- output does not expose private data,
- command works without network access.

Verification:

```bash
npm test
npm run build
opensasa sessions --help
```

## Issue 6: Local Report

Goal:

> Implement `opensasa report` for personal local insights.

Deliverables:

- `opensasa report` command,
- report calculation module,
- text report output,
- tests for report calculations.

First report metrics:

- total sessions,
- sessions by model,
- sessions by task type,
- accepted and partially accepted count,
- rejected count,
- unknown outcome count,
- estimated total cost,
- cost by model,
- retry summary,
- verification outcome summary,
- useful outcome rate,
- verified success rate.

Acceptance criteria:

- report is generated from local data only,
- missing or unknown data is labeled clearly,
- task success and verified success are separate,
- calculations align with `docs/METHODOLOGY.md`,
- command works without public contribution.

Verification:

```bash
npm test
npm run build
opensasa report --help
```

## Issue 7: Inspect And Contribution Preview

Goal:

> Implement local inspection and no-upload contribution preview.

Deliverables:

- `opensasa inspect <session-id>`,
- `opensasa inspect --contribution <session-id>`,
- included fields list,
- excluded fields list,
- bucketed or anonymized preview values,
- schema version display,
- data source display,
- consent status display,
- no-upload notice.

Acceptance criteria:

- local session inspection works,
- contribution preview is generated locally,
- preview includes only allowed contribution fields,
- excluded fields are named clearly,
- no upload occurs,
- output states that upload is not enabled in the MVP.

Verification:

```bash
npm test
npm run build
opensasa inspect --help
```

## Issue 8: README Local Workflow Update

Goal:

> Document the implemented local MVP workflow honestly.

Deliverables:

- README section for local CLI usage,
- command examples,
- privacy reminder,
- MVP limitations,
- link to `docs/MVP_WORKFLOW.md`.

Acceptance criteria:

- README does not overclaim product maturity,
- commands match implementation,
- limitations are clear,
- no public upload or ranking is implied.

Verification:

```bash
npm test
npm run build
```

## Cross-Issue Requirements

Every implementation PR should preserve:

- local-first behavior,
- no silent telemetry,
- no source-code capture,
- no private prompt capture,
- no model-response capture,
- no exact path tracking,
- no raw terminal output capture,
- no public upload,
- no hosted backend requirement.

Every implementation PR should include:

- tests where behavior exists,
- build verification,
- clear PR summary,
- known limitations,
- privacy impact note.

## MVP Complete

The MVP is complete when all issues above are merged and:

- a developer can run the CLI locally,
- a developer can log a session,
- session data validates against the schema,
- session data is stored locally,
- previous sessions can be listed,
- local reports can be generated,
- contribution previews can be inspected,
- no data uploads occur,
- excluded fields are not part of contribution previews,
- tests cover schema validation and report calculations,
- and the README explains the local workflow.

