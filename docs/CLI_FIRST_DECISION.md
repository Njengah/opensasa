# CLI-First Decision

This document records the first implementation surface decision for OpenSasa.

## Decision

OpenSasa should build the CLI first.

The public site should start as documentation and project narrative only. Product implementation should begin with the local CLI workflow defined in `docs/MVP_WORKFLOW.md`.

## Why CLI First

The first product risk is workflow usefulness, not public presentation.

A CLI-first MVP lets OpenSasa prove:

- manual session logging,
- local-only storage,
- schema validation,
- personal reports,
- contribution preview,
- inspect-before-share behavior,
- and privacy-safe metadata boundaries.

This matches the product principle:

> Prove the workflow before automating the collection.

## What CLI First Means

The first implementation should prioritize:

- `opensasa log`,
- `opensasa sessions`,
- `opensasa report`,
- `opensasa inspect`,
- local SQLite storage,
- Zod schema validation,
- no-upload contribution preview,
- and tests for schema validation and report calculations.

The CLI should be useful without a public account, public index, hosted backend, or web dashboard.

## What Public Site First Would Mean

A public-site-first approach would prioritize:

- marketing pages,
- public methodology pages,
- public model tables,
- shareable cards,
- seed-data dashboards,
- hosted infrastructure.

Those are useful later, but they do not prove the local workflow. They also increase the risk of appearing like a leaderboard before OpenSasa has real contribution data, confidence thresholds, or a complete local trust loop.

## Public Site Scope For Now

Before the tracker exists, the public site should be limited to:

- README and docs,
- launch narrative,
- privacy principles,
- metadata schema,
- methodology,
- roadmap,
- contribution rules.

The public site should not yet include:

- public rankings,
- live model index,
- vendor comparisons,
- real-data claims,
- contribution upload,
- hosted dashboards.

## Technical Direction

The first implementation should use:

- TypeScript,
- Node.js,
- a CLI framework such as `commander` or `clipanion`,
- Zod for schema validation,
- SQLite via `better-sqlite3` or `libsql`.

The first structure should be smaller than the future monorepo. Avoid creating `apps/web` or public API packages before the CLI workflow is proven.

## Tradeoffs

### Benefits

- fastest path to a usable developer workflow,
- strongest alignment with local-first privacy,
- no hosted backend needed,
- easy to test with real developer sessions,
- keeps public claims modest,
- creates data shape before dashboards.

### Costs

- less visually shareable at first,
- no public index in the first product release,
- manual logging may feel tedious,
- public narrative has fewer screenshots or charts early.

These costs are acceptable because the first milestone is trust and workflow validation.

## Implementation Implications

The first product PRs should follow this order:

1. CLI scaffold.
2. Shared schema validation.
3. Local SQLite storage.
4. Manual session logging.
5. Session listing.
6. Local report generation.
7. Inspect and contribution preview.

Do not start with:

- Next.js app,
- public index backend,
- hosted database,
- public rankings,
- integration imports,
- shareable report images,
- vendor participation flows.

## Decision Status

Status:

```text
accepted
```

This decision should be revisited after the MVP can:

- log sessions locally,
- generate local reports,
- preview contribution payloads,
- and demonstrate that developers find the manual workflow tolerable.

