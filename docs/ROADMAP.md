# Roadmap

This roadmap describes the intended build path for OpenSasa.

OpenSasa is a privacy-first system for measuring real-world AI coding outcomes. The product should become useful to individual developers before it contributes to a public model index.

The roadmap is intentionally staged. Trust, schema, privacy, and methodology work should come before product implementation and public rankings.

For the current week-by-week product timeline and PR backlog, see
[`docs/PRODUCT_TIMELINE.md`](./PRODUCT_TIMELINE.md).

## Roadmap Principles

OpenSasa should:

- be local-first by default,
- provide value before public contribution,
- avoid source-code, prompt, response, and exact-path upload by default,
- make contribution payloads inspectable before sharing,
- publish methodology before rankings,
- show confidence labels on public aggregate views,
- and avoid fake scale or vendor-controlled methodology.

## Current Status

OpenSasa has completed the foundation stage and now has a first CLI-first local
MVP workflow.

Completed foundation work:

- project README,
- development cycle,
- privacy principles,
- metadata schema draft,
- methodology draft,
- public roadmap,
- contribution rules,
- first public launch post draft,
- first MVP workflow decision,
- CLI-first decision.

Implemented MVP workflow:

- CLI scaffold,
- local metadata schema validation,
- local SQLite storage,
- manual session logging,
- session listing,
- local personal report,
- local session inspection,
- no-upload contribution preview,
- README local workflow documentation.

Current release target:

```text
v0.1.0-alpha.1
```

Next work should harden the local workflow, refine methodology and bucket
definitions, and prepare contribution rules before any upload or public index
behavior exists.

## Milestone 0: Foundation

Goal:

> Establish trust, direction, and reviewable project history before implementation.

Expected deliverables:

- public positioning,
- privacy principles,
- metadata schema,
- scoring methodology,
- roadmap,
- contribution rules,
- public launch narrative,
- initial issue list for the MVP.

Exit criteria:

- privacy boundary is documented,
- safe metadata schema is documented,
- scoring and confidence rules are documented,
- first MVP workflow is chosen,
- and implementation scope is small enough for reviewable PRs.

Suggested version:

```text
v0.0.1-foundation
```

## Milestone 1: Manual Local Tracker

Goal:

> Let a developer record an AI coding session without requiring tool integrations.

Expected deliverables:

- CLI project scaffold,
- local configuration,
- manual session logging,
- session list,
- local-only data storage,
- schema validation,
- basic outcome entry,
- basic verification outcome entry.

Possible commands:

```bash
opensasa log
opensasa sessions
opensasa inspect
```

Privacy requirements:

- no uploads,
- no source code storage,
- no private prompt storage,
- no model response storage,
- no exact file path contribution.

Exit criteria:

- a developer can manually log a complete session,
- the session is stored locally,
- the stored data validates against the metadata schema,
- and the user can inspect the local record.

Suggested version:

```text
v0.1.0-alpha.1
```

Status:

```text
implemented
```

## Milestone 2: Local Reports

Goal:

> Make OpenSasa useful even when the developer never contributes public data.

Expected deliverables:

- personal model usage summary,
- estimated AI coding spend summary,
- cost by task type,
- accepted and rejected outcome summary,
- retry burden summary,
- verification status summary,
- useful outcome rate,
- verified success rate,
- local report command.

Possible command:

```bash
opensasa report
```

Exit criteria:

- reports are generated from local data only,
- reports do not require public contribution,
- unknown or missing data is labeled clearly,
- and metrics align with `docs/METHODOLOGY.md`.

Suggested version:

```text
v0.1.0-alpha.2
```

Status:

```text
implemented in the first local MVP; future work may refine report output,
filters, and methodology thresholds.
```

## Milestone 3: Public Methodology Package

Goal:

> Make the public scoring system inspectable before rankings matter.

Expected deliverables:

- finalized first scoring draft,
- confidence level rules,
- data-quality weighting draft,
- anti-gaming rules,
- contribution quality criteria,
- public examples using seed data only,
- methodology changelog process.

Exit criteria:

- public index metrics are traceable to documented formulas,
- confidence labels are defined,
- seed and synthetic examples are labeled,
- and public claims avoid implying real scale before real data exists.

Suggested version:

```text
v0.1.0-beta.1
```

## Milestone 4: Contribution Preview

Goal:

> Let developers inspect anonymized metadata before sharing.

Expected deliverables:

- contribution payload generator,
- inspect-before-share preview,
- included fields list,
- excluded fields list,
- bucketed/anonymized values,
- explicit consent confirmation,
- local contribution state,
- validation against excluded fields.

Possible command:

```bash
opensasa inspect --contribution
```

Privacy requirements:

- no silent uploads,
- no contribution without explicit consent,
- no source code,
- no private prompts,
- no model responses,
- no exact file paths,
- no repository names,
- no secrets,
- no raw terminal output.

Exit criteria:

- users can preview exactly what would be shared,
- users can cancel before sharing,
- contribution payloads validate against `docs/METADATA_SCHEMA.md`,
- and excluded fields are rejected before contribution.

Suggested version:

```text
v0.2.0
```

Status:

```text
preview implemented locally; upload, consent flow, destination handling, and
contribution submission remain out of scope.
```

Decision for `v0.1`:

```text
manual export only; no upload or submission path ships in the beta release.
```

## Milestone 5: Public Index Prototype

Goal:

> Show public aggregate signal without pretending scale.

Expected deliverables:

- public index prototype,
- task-specific model tables,
- cost per useful outcome views,
- verified success rate views,
- retry burden views,
- sample size labels,
- confidence labels,
- methodology links,
- clearly labeled seed or early data.

Exit criteria:

- every public comparison has a confidence label,
- seed and early data are clearly labeled,
- public methodology is linked,
- no universal best-model claim is made from limited data,
- and public aggregate views do not expose private contributor data.

Suggested version:

```text
v0.3.0
```

## Milestone 6: Tool Integrations

Goal:

> Reduce manual logging by importing or wrapping AI coding workflow metadata.

Possible integrations:

- Claude Code logs,
- Codex session metadata,
- Cursor or Windsurf where available,
- OpenCode logs,
- Gemini CLI logs,
- git diff metadata,
- test/build/lint command wrappers.

Expected deliverables:

- integration-specific importers,
- source labeling,
- provenance metadata,
- validation against the shared schema,
- local-only default behavior,
- integration documentation.

Exit criteria:

- integrations reduce manual input without weakening privacy,
- imported data is clearly labeled,
- users can inspect imported metadata,
- and integrations do not upload private code, prompts, responses, or exact paths by default.

Suggested version:

```text
v0.4.0+
```

## Later Directions

Future work may include:

- model-vs-model comparison cards,
- model release drift analysis,
- shareable personal AI coding reports,
- team-level private dashboards,
- organization policy controls,
- enterprise privacy controls,
- research exports using privacy-safe aggregate data.

These should come after the local tracker, reports, contribution preview, and methodology are stable.

## Near-Term Decisions

Before upload or public index work starts, the project should decide:

- how bucket ranges are defined and versioned,
- whether reports should add JSON output,
- whether sessions can be edited after logging,
- what contribution consent flow is required before any future upload exists,
- how contribution payload validation should reject excluded fields,
- how methodology changelogs should be published,
- and whether the public site starts as documentation, seed-data dashboard, or later index.

## Not In Scope Yet

The early roadmap should not include:

- automatic monitoring of every coding tool,
- enterprise analytics,
- vendor ranking programs,
- public rankings without confidence labels,
- source-code analysis uploads,
- prompt or model-response collection,
- or a broad agent observability platform.

OpenSasa should prove the narrow local workflow first.

