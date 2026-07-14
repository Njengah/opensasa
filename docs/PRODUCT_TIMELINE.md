# OpenSasa Product Timeline

This is the working build plan for turning OpenSasa from a CLI-first local tracker into a WakaTime-style product for AI-assisted coding workflows.

The dates are planning estimates, not promises. The plan assumes we keep shipping small, reviewable PRs and merge continuously.

## Tracking Protocol

Use this file as the project checklist.

After a PR is merged:

1. Pull the latest `main`.
2. Find the matching checklist item in this file.
3. Change `[ ]` to `[x]`.
4. Add the merged PR number at the end of the item, for example: `(#52)`.
5. If the next task changes because of what we learned, update the list in the same docs PR.

When the user says "build next", use the first unchecked item in
`Recommended Near-Term PR Order` unless there is a clear blocker or a more urgent
dependency.

## Completed PR Tracker

Use this section when you want the fastest view of where the project is. Checked
items are already merged.

- [x] Contribution preview validation. (#39)
- [x] Local contribution consent state. (#40)
- [x] Seed methodology examples. (#41)
- [x] Provider grouping and provider cost totals in local reports. (#42)
- [x] Tool grouping and tool cost totals in local reports. (#43)
- [x] Language grouping and language cost totals in local reports. (#44)
- [x] Tool and language filters for sessions and reports. (#45)
- [x] Framework and work mode filters for sessions and reports. (#46)
- [x] Framework and work mode grouping in local reports. (#47)
- [x] Cost source grouping in local reports. (#48)
- [x] Repo size bucket grouping in local reports. (#49)
- [x] File count bucket grouping in local reports. (#50)
- [x] Product timeline and PR roadmap. (#51)
- [x] Timeline checklist tracking. (#52)
- [x] Completed PR tracker updates. (#53)
- [x] Changed file count bucket grouping in local reports. (#54)
- [x] Lines added bucket grouping in local reports. (#55)
- [x] Lines removed bucket grouping in local reports. (#56)
- [x] Token estimate summaries in local reports. (#57)
- [x] Duration bucket summaries in local reports. (#58)
- [x] Error count summaries in local reports. (#59)
- [x] Report readability and empty states. (#60)
- [x] JSON report schema version. (#61)
- [x] Demo seed data generator. (#62)

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

- [x] Manual session logging.
- [x] Local SQLite storage.
- [x] Safe metadata validation.
- [x] Session listing.
- [x] Local report generation.
- [x] Report filters.
- [x] Report JSON output.
- [x] Local inspection.
- [x] No-upload contribution preview.
- [x] Local contribution consent state.
- [x] Many local report metrics and groupings.
- [x] Tests around the CLI, storage, schema, reports, inspection, and bucket helpers.

Still missing for the broader product:

- [ ] Less manual data capture.
- [ ] Local dashboard.
- [ ] Background agent.
- [ ] VS Code integration.
- [ ] Real export/submission workflow.
- [ ] Install/release packaging.
- [ ] Public aggregate prototype.

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

- [x] Add changed-file-count bucket report grouping. (#54)
- [x] Add file-count bucket report grouping. (#50)
- [x] Add lines-added bucket report grouping. (#55)
- [x] Add lines-removed bucket report grouping. (#56)
- [x] Add token estimate summaries to reports. (#57)
- [x] Add duration bucket summaries to reports. (#58)
- [x] Add error count summaries to reports. (#59)
- [x] Improve report section ordering and empty-state readability. (#60)
- [x] Add compact report mode for terminal readability. (#63)
- [ ] Add report snapshot tests for stable text output.
- [x] Add report schema/version metadata to JSON output. (#61)
- [ ] Add `opensasa doctor` for local database/config checks.
- [x] Add demo seed database or fixture generator. (#62)

Exit criteria:

- `opensasa report` is useful on real local data.
- JSON report output is stable enough for dashboard consumption.
- Missing values are clearly labeled.
- Documentation explains what every metric means.

## Phase 2: Local Dashboard Alpha

Goal:

> Let users see OpenSasa value without reading terminal reports.

Expected PRs:

- [x] Add internal report API module reusable by CLI and dashboard. (#64)
- [x] Add local HTTP server command: `opensasa dashboard`. (#64)
- [x] Add dashboard static app scaffold. (#65)
- [x] Add dashboard overview cards. (#65)
- [x] Add model/tool comparison table. (#66)
- [x] Add trend chart by day/week. (#67)
- [x] Add filters in dashboard for provider, model, tool, language, framework, task type, and outcome. (#68)
- [x] Add cost summary charts. (#69)
- [x] Add outcome and verification charts. (#70)
- [x] Add local-only privacy notice in dashboard. (#65)
- [x] Add dashboard empty state with demo instructions. (#71)
- [x] Add Playwright/smoke tests for dashboard rendering. (#72)

Exit criteria:

- User can run `opensasa dashboard`.
- Browser opens local report UI.
- Dashboard reads only local SQLite data.
- Dashboard works with no hosted backend.

## Phase 3: Local Agent And Capture Helpers

Goal:

> Reduce manual logging while preserving the privacy boundary.

Expected PRs:

- [x] Add local config file support. (#73)
- [x] Add project identity hashing without storing repo names. (#74)
- [x] Add git metadata helper for coarse repo/file/change buckets. (#75)
- [x] Add command wrapper for test/build/lint outcome capture. (#76)
- [x] Add session draft command. (#77)
- [x] Add session finalize command. (#78)
- [x] Add auto-duration capture for started/finalized sessions. (#78)
- [x] Add local activity heartbeat table. (#79)
- [x] Add privacy-safe terminal command outcome capture. (#76)
- [x] Add import provenance fields to session records. (#80)
- [x] Add agent status command. (#81)
- [x] Add docs for manual, wrapper, and agent modes. (#82)

Exit criteria:

- Users can start and finish sessions with less typing.
- Test/build/lint outcomes can be captured locally.
- No source code, prompts, responses, exact paths, or raw terminal output are stored.

## Phase 4: VS Code Extension

Goal:

> Make OpenSasa usable for normal developers in their editor.

Expected PRs:

- [ ] Create VS Code extension package scaffold. (next PR)
- [ ] Add extension-to-local-CLI communication.
- [ ] Add start session command in VS Code.
- [ ] Add finish session command in VS Code.
- [ ] Add quick-pick fields for task type, outcome, model, and tool.
- [ ] Add status bar item for active OpenSasa session.
- [ ] Add local privacy notice in extension.
- [ ] Add extension config for local database path.
- [ ] Add extension command to open dashboard.
- [ ] Add extension tests or smoke checks.
- [ ] Add extension install/dev docs.
- [ ] Add release packaging workflow for extension.

Exit criteria:

- A developer can use OpenSasa from VS Code without typing CLI log commands.
- Extension writes safe metadata locally.
- Dashboard and CLI can read the same database.

## Phase 5: Export And Contribution Workflow

Goal:

> Let users share only inspected, privacy-safe metadata.

Expected PRs:

- [ ] Add contribution export command that writes a local JSON file.
- [ ] Add explicit consent confirmation for export.
- [ ] Add contribution payload version field.
- [ ] Add contribution validation report.
- [ ] Add red-team tests for forbidden fields.
- [ ] Add contribution bundle preview in dashboard.
- [ ] Add local contribution history.
- [ ] Add contribution revocation state semantics.
- [x] Add docs for what is and is not shared. (#83)
- [ ] Add sample contribution file.
- [ ] Add optional signed export metadata.
- [ ] Decide whether upload exists in v0.1 or remains manual export.

Exit criteria:

- Users can inspect and export safe metadata.
- No silent upload path exists.
- Contribution payloads are versioned and validated.

## Phase 6: Public Beta Packaging

Goal:

> Make OpenSasa easy to install, demo, and evaluate.

Expected PRs:

- [ ] Add npm package metadata and bin validation.
- [ ] Add install docs.
- [ ] Add first release checklist.
- [ ] Add demo walkthrough.
- [ ] Add screenshots or dashboard preview images.
- [ ] Add architecture doc.
- [ ] Add security/privacy FAQ.
- [ ] Add issue templates.
- [ ] Add good-first-issue labels/docs.
- [ ] Add CI release checks.
- [ ] Tag `v0.1.0-beta.1`.
- [ ] Publish launch case study.

Exit criteria:

- A new user can install and try OpenSasa in under 10 minutes.
- The repo clearly explains value, privacy, and limitations.
- The project is credible as portfolio/open-source work.

## Phase 7: Optional Cloud And Public Aggregate Index

Goal:

> Add hosted value only after the local trust loop works.

Expected PRs:

- [ ] Decide hosted architecture.
- [ ] Add public aggregate schema.
- [ ] Add ingestion endpoint for safe contribution payloads.
- [ ] Add server-side validation.
- [ ] Add confidence labels for aggregate views.
- [ ] Add seed-data-only public dashboard.
- [ ] Add real-data dashboard only after enough contributions.
- [ ] Add account system only if needed.
- [ ] Add optional sync.
- [ ] Add organization/team private dashboard design.
- [ ] Add abuse and anti-gaming rules.
- [ ] Add public methodology changelog.

Exit criteria:

- Public views never imply false certainty.
- Every aggregate metric has sample size and confidence labels.
- Hosted features remain optional.

## Recommended Near-Term PR Order

Use this list when asking "build next":

- [x] Add changed-file-count bucket report grouping. (#54)
- [x] Add file-count bucket report grouping. (#50)
- [x] Add lines-added bucket report grouping. (#55)
- [x] Add lines-removed bucket report grouping. (#56)
- [x] Add token estimate summaries. (#57)
- [x] Add duration bucket summaries. (#58)
- [x] Add error count summaries. (#59)
- [x] Improve report readability and empty states. (#60)
- [x] Add JSON report schema version. (#61)
- [x] Add demo seed data generator. (#62)
- [x] Add compact report mode for terminal readability. (#63)
- [x] Start local dashboard server. (#64)
- [x] Add dashboard static app scaffold. (#65)
- [x] Add model/tool comparison table. (#66)
- [x] Add trend chart by day/week. (#67)
- [x] Add dashboard filters. (#68)
- [x] Add cost summary charts. (#69)
- [x] Add outcome and verification charts. (#70)
- [x] Add dashboard empty state. (#71)
- [x] Add dashboard smoke tests. (#72)
- [x] Add local config file support. (#73)
- [x] Add project identity hashing. (#74)
- [x] Add git metadata helper. (#75)
- [x] Add verification command wrapper. (#76)
- [x] Add session draft command. (#77)
- [x] Add session finalize command. (#78)
- [x] Add local activity heartbeat table. (#79)
- [x] Add import provenance fields. (#80)
- [x] Add agent status command. (#81)
- [x] Add workflow mode documentation. (#82)
- [x] Add sharing boundary documentation. (#83)
- [x] Convert product timeline to merge-tracking checklists. (#52)

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

