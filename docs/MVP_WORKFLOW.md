# MVP Workflow

This document defines the first OpenSasa MVP workflow.

The goal is to make implementation narrow, reviewable, and aligned with the privacy, metadata, methodology, and roadmap docs.

## Decision

The first MVP should be a CLI-first, manual local tracker with local reports and contribution preview.

OpenSasa should prove the workflow before automating data collection from AI coding tools.

## MVP Goal

> Let a developer manually record an AI coding session, store safe metadata locally, generate a personal report, and inspect what would be shared before any contribution exists.

The MVP should provide value even if the developer never contributes data publicly.

## Product Loop

The first complete loop:

1. Developer logs an AI coding session manually.
2. OpenSasa validates the record against the metadata schema.
3. OpenSasa stores the record locally.
4. Developer lists previous sessions.
5. Developer generates a local personal report.
6. Developer previews a sanitized contribution payload.
7. Developer sees included fields, excluded fields, bucketed values, and consent status.

The MVP should not upload data.

## Primary User

The first user is an individual developer who uses AI coding tools and wants to understand:

- which models they use,
- what tasks they use them for,
- how much they estimate spending,
- how many retries they need,
- how often outputs are useful,
- whether useful outputs were verified,
- and what would be safe to contribute later.

## First Commands

Initial CLI commands:

```bash
opensasa log
opensasa sessions
opensasa report
opensasa inspect
```

### `opensasa log`

Creates a session record through manual prompts or flags.

Required first-version fields:

- provider,
- model ID,
- task type,
- final outcome,
- started or completed timestamp,
- work mode.

Optional first-version fields:

- model version,
- tool,
- language,
- framework,
- duration,
- retry count,
- error count,
- token estimates,
- estimated cost,
- cost source,
- verification outcomes,
- repo size bucket,
- file count bucket,
- changed file count bucket,
- lines added bucket,
- lines removed bucket.

The command should prefer fast entry. Optional fields can be skipped or filled later.

### `opensasa sessions`

Lists local sessions.

The first list view should show:

- session ID,
- timestamp,
- provider,
- model ID,
- task type,
- final outcome,
- verified success if known,
- estimated cost if known.

### `opensasa report`

Generates a local personal report.

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

Reports should label missing or unknown data clearly.

### `opensasa inspect`

Shows a local session record or contribution preview.

First inspect modes:

```bash
opensasa inspect <session-id>
opensasa inspect --contribution <session-id>
```

The contribution preview should show:

- included fields,
- excluded fields,
- bucketed or anonymized values,
- schema version,
- data source,
- consent status,
- and a clear note that uploads are not enabled in the MVP.

## Local Storage Decision

The first implementation should use SQLite for local storage.

Suggested local path:

```text
~/.opensasa/opensasa.db
```

Reasons:

- local-first,
- inspectable,
- portable,
- reliable enough for session metadata,
- suitable for reports,
- easy to migrate later.

The implementation should keep storage behind a small local data access layer so future schema migrations are manageable.

## Technical Direction

Recommended first implementation stack:

- TypeScript,
- Node.js,
- CLI command framework such as `commander` or `clipanion`,
- Zod for schema validation,
- SQLite via `better-sqlite3` or `libsql`.

The first code structure can be smaller than the future monorepo. Avoid creating a broad app structure before the workflow is proven.

## Privacy Requirements

The MVP must preserve local-first behavior.

It must not upload:

- source code,
- private prompts,
- model responses,
- exact file paths,
- repository names,
- organization names,
- company names,
- customer names,
- secrets,
- API keys,
- raw terminal output,
- private local notes.

The MVP should not silently collect telemetry from the CLI.

## Contribution Preview Scope

The MVP should generate a contribution preview but should not submit it.

The preview exists to prove the trust workflow:

- what would be included,
- what would be excluded,
- how values are bucketed,
- what schema version is used,
- whether consent is enabled,
- and why upload is unavailable in the MVP.

Actual upload should wait until contribution rules, validation, backend destination, and consent behavior are implemented and reviewed.

## Verification Rules

For the MVP, verified success should be derived from:

```text
useful outcome + passing verification evidence
```

Useful outcome means:

- `accepted`, or
- `partially_accepted`.

Passing verification evidence may include:

- tests passed,
- build passed,
- lint passed,
- typecheck passed,
- or manual review accepted.

Reports should show task success and verified success separately.

## Out Of Scope

The MVP should not include:

- automatic Claude Code, Codex, Cursor, Windsurf, OpenCode, or Gemini CLI imports,
- public uploads,
- public rankings,
- public index backend,
- web dashboard,
- team dashboard,
- vendor submission flow,
- source-code analysis,
- prompt capture,
- model response capture,
- exact path tracking,
- raw terminal output capture,
- enterprise features.

## Implementation Slices

Suggested first implementation PRs:

1. **CLI scaffold**
   - package setup,
   - executable command,
   - help output,
   - basic test command.

2. **Schema validation**
   - Zod schema based on `docs/METADATA_SCHEMA.md`,
   - enum definitions,
   - validation tests.

3. **Local database**
   - SQLite setup,
   - sessions table,
   - migration mechanism,
   - local path handling.

4. **Manual logging**
   - `opensasa log`,
   - required fields,
   - optional fields,
   - validation before write.

5. **Session listing**
   - `opensasa sessions`,
   - basic table output,
   - empty-state output.

6. **Local report**
   - `opensasa report`,
   - first metrics,
   - unknown-data labeling.

7. **Inspect and contribution preview**
   - `opensasa inspect <session-id>`,
   - `opensasa inspect --contribution <session-id>`,
   - included/excluded fields,
   - no-upload notice.

## MVP Exit Criteria

The MVP is complete when:

- a developer can install or run the CLI locally,
- a developer can manually log a session,
- the record validates against the schema,
- the record is stored locally,
- previous sessions can be listed,
- a local report can be generated,
- a contribution preview can be inspected,
- no data uploads occur,
- excluded fields are not part of contribution previews,
- tests cover schema validation and report calculations,
- and the README explains the local workflow honestly.

## Open Questions

- Should `opensasa log` be prompt-based first, flag-based first, or support both?
- Should `manual_review_outcome` count as verification in public methodology, or only in personal reports?
- What bucket ranges should be used for cost, duration, retries, tokens, repo size, and lines changed?
- Should the MVP support editing a session after logging?
- Should reports output plain text first, JSON first, or both?
- Should the first contribution preview operate on one session or all sessions?

