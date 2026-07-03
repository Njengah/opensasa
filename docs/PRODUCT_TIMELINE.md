# OpenSasa Product Timeline

This is the working build plan for turning OpenSasa from a CLI-first local tracker into a WakaTime-style product for AI-assisted coding workflows.

The dates are planning estimates, not promises. The plan assumes we keep shipping small, reviewable PRs and merge continuously.

## Product Vision

OpenSasa should become:

> A local-first activity and outcome tracker for AI-assisted coding, similar in spirit to WakaTime, but focused on whether AI coding tools actually helped developers ship useful work.

The CLI remains the engine. The product experience should eventually be:

- a local background collector,
- a local web dashboard,
- editor integrations,
- optional privacy-safe export or sync,
- and later public aggregate insights with confidence labels.

## Current Position

Current stage:

```text
CLI-first local MVP
```

Already working:

- manual session logging,
- local SQLite storage,
- safe metadata validation,
- session listing,
- local report generation,
- report filters,
- report JSON output,
- local inspection,
- no-upload contribution preview,
- local contribution consent state,
- many local report metrics and groupings,
- tests around the CLI, storage, schema, reports, inspection, and bucket helpers.

Still missing for the broader product:

- less manual data capture,
- local dashboard,
- background agent,
- VS Code integration,
- real export/submission workflow,
- install/release packaging,
- public aggregate prototype.

## Timeline Summary

| Phase | Target Duration | Outcome |
| --- | ---: | --- |
| Phase 1: Finish CLI report MVP | 1-2 weeks | Reports are useful, readable, and stable. |
| Phase 2: Local dashboard alpha | 2-3 weeks | Users can view reports without using CLI output. |
| Phase 3: Local agent and capture helpers | 3-5 weeks | Data capture becomes less manual. |
| Phase 4: VS Code extension | 3-5 weeks | First normal-developer workflow, closer to WakaTime. |
| Phase 5: Export and contribution workflow | 2-4 weeks | Privacy-safe sharing path exists. |
| Phase 6: Public beta packaging | 2-3 weeks | Installable v0.1 beta with docs, demo, and release notes. |
| Phase 7: Optional cloud and public aggregate index | 6-12 weeks | Hosted features after local trust loop is proven. |

Practical estimate:

- CLI MVP complete: 2-3 weeks.
- Local dashboard alpha: 4-6 weeks.
- WakaTime-style private beta: 8-12 weeks.
- Public v0.1 beta: 12-16 weeks.
- Cloud/public aggregate product: 4-6 months.

## Phase 1: Finish CLI Report MVP

Goal:

> Make local CLI reports trustworthy, readable, and stable enough to build a dashboard on top.

Expected PRs:

1. Add changed-file-count bucket report grouping.
2. Add lines-added bucket report grouping.
3. Add lines-removed bucket report grouping.
4. Add token estimate summaries to reports.
5. Add duration bucket summaries to reports.
6. Add error count summaries to reports.
7. Improve report section ordering and empty-state readability.
8. Add compact report mode for terminal readability.
9. Add report snapshot tests for stable text output.
10. Add report schema/version metadata to JSON output.
11. Add `opensasa doctor` for local database/config checks.
12. Add demo seed database or fixture generator.

Exit criteria:

- `opensasa report` is useful on real local data.
- JSON report output is stable enough for dashboard consumption.
- Missing values are clearly labeled.
- Documentation explains what every metric means.

## Phase 2: Local Dashboard Alpha

Goal:

> Let users see OpenSasa value without reading terminal reports.

Expected PRs:

1. Add internal report API module reusable by CLI and dashboard.
2. Add local HTTP server command: `opensasa dashboard`.
3. Add dashboard static app scaffold.
4. Add dashboard overview cards.
5. Add model/tool comparison table.
6. Add trend chart by day/week.
7. Add filters in dashboard for provider, model, tool, language, framework, task type, and outcome.
8. Add cost summary charts.
9. Add outcome and verification charts.
10. Add local-only privacy notice in dashboard.
11. Add dashboard empty state with demo instructions.
12. Add Playwright/smoke tests for dashboard rendering.

Exit criteria:

- User can run `opensasa dashboard`.
- Browser opens local report UI.
- Dashboard reads only local SQLite data.
- Dashboard works with no hosted backend.

## Phase 3: Local Agent And Capture Helpers

Goal:

> Reduce manual logging while preserving the privacy boundary.

Expected PRs:

1. Add local config file support.
2. Add project identity hashing without storing repo names.
3. Add git metadata helper for coarse repo/file/change buckets.
4. Add command wrapper for test/build/lint outcome capture.
5. Add session draft command.
6. Add session finalize command.
7. Add auto-duration capture for started/finalized sessions.
8. Add local activity heartbeat table.
9. Add privacy-safe terminal command outcome capture.
10. Add import provenance fields to session records.
11. Add agent status command.
12. Add docs for manual, wrapper, and agent modes.

Exit criteria:

- Users can start and finish sessions with less typing.
- Test/build/lint outcomes can be captured locally.
- No source code, prompts, responses, exact paths, or raw terminal output are stored.

## Phase 4: VS Code Extension

Goal:

> Make OpenSasa usable for normal developers in their editor.

Expected PRs:

1. Create VS Code extension package scaffold.
2. Add extension-to-local-CLI communication.
3. Add start session command in VS Code.
4. Add finish session command in VS Code.
5. Add quick-pick fields for task type, outcome, model, and tool.
6. Add status bar item for active OpenSasa session.
7. Add local privacy notice in extension.
8. Add extension config for local database path.
9. Add extension command to open dashboard.
10. Add extension tests or smoke checks.
11. Add extension install/dev docs.
12. Add release packaging workflow for extension.

Exit criteria:

- A developer can use OpenSasa from VS Code without typing CLI log commands.
- Extension writes safe metadata locally.
- Dashboard and CLI can read the same database.

## Phase 5: Export And Contribution Workflow

Goal:

> Let users share only inspected, privacy-safe metadata.

Expected PRs:

1. Add contribution export command that writes a local JSON file.
2. Add explicit consent confirmation for export.
3. Add contribution payload version field.
4. Add contribution validation report.
5. Add red-team tests for forbidden fields.
6. Add contribution bundle preview in dashboard.
7. Add local contribution history.
8. Add contribution revocation state semantics.
9. Add docs for what is and is not shared.
10. Add sample contribution file.
11. Add optional signed export metadata.
12. Decide whether upload exists in v0.1 or remains manual export.

Exit criteria:

- Users can inspect and export safe metadata.
- No silent upload path exists.
- Contribution payloads are versioned and validated.

## Phase 6: Public Beta Packaging

Goal:

> Make OpenSasa easy to install, demo, and evaluate.

Expected PRs:

1. Add npm package metadata and bin validation.
2. Add install docs.
3. Add first release checklist.
4. Add demo walkthrough.
5. Add screenshots or dashboard preview images.
6. Add architecture doc.
7. Add security/privacy FAQ.
8. Add issue templates.
9. Add good-first-issue labels/docs.
10. Add CI release checks.
11. Tag `v0.1.0-beta.1`.
12. Publish launch case study.

Exit criteria:

- A new user can install and try OpenSasa in under 10 minutes.
- The repo clearly explains value, privacy, and limitations.
- The project is credible as portfolio/open-source work.

## Phase 7: Optional Cloud And Public Aggregate Index

Goal:

> Add hosted value only after the local trust loop works.

Expected PRs:

1. Decide hosted architecture.
2. Add public aggregate schema.
3. Add ingestion endpoint for safe contribution payloads.
4. Add server-side validation.
5. Add confidence labels for aggregate views.
6. Add seed-data-only public dashboard.
7. Add real-data dashboard only after enough contributions.
8. Add account system only if needed.
9. Add optional sync.
10. Add organization/team private dashboard design.
11. Add abuse and anti-gaming rules.
12. Add public methodology changelog.

Exit criteria:

- Public views never imply false certainty.
- Every aggregate metric has sample size and confidence labels.
- Hosted features remain optional.

## Recommended Near-Term PR Order

Use this list when asking "build next":

1. Add changed-file-count bucket report grouping.
2. Add lines-added bucket report grouping.
3. Add lines-removed bucket report grouping.
4. Add token estimate summaries.
5. Add duration bucket summaries.
6. Add error count summaries.
7. Improve report readability and empty states.
8. Add JSON report schema version.
9. Add demo seed data generator.
10. Start local dashboard server.

## Career/Portfolio Goal

By public beta, the project should demonstrate:

- CLI engineering,
- local-first product architecture,
- privacy-safe metadata design,
- TypeScript and SQLite implementation,
- report and analytics design,
- testing discipline,
- developer-experience thinking,
- and product strategy around AI coding workflows.

The strongest positioning:

> OpenSasa is a privacy-first WakaTime-style tracker for AI-assisted coding outcomes.

