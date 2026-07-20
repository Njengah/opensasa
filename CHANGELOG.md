# Changelog

All notable changes to OpenSasa will be documented in this file.

## 0.1.0-beta.1 - 2026-07-20

### Added

- Local dashboard alpha with overview cards, model and tool comparisons, daily
  trend, cost summary, verification and outcome views, contribution bundle
  preview, and contribution history.
- Local workflow helpers for config, project identity hashing, coarse git
  metadata, verification command capture, session drafts, finalization,
  activity heartbeats, and agent status.
- VS Code extension workflow for starting and finishing local sessions, opening
  the local dashboard, showing local status, and configuring the local database
  path.
- Manual contribution export workflow with explicit consent, payload validation,
  local contribution history, optional detached export metadata, and optional
  HMAC signing.
- Public beta packaging docs: install guide, release checklist, demo
  walkthrough, dashboard preview image, architecture overview, security/privacy
  FAQ, issue templates, good-first-issue guidance, and release checks workflow.
- Public beta launch case study covering the local-first product loop, privacy
  boundary, shipped scope, and current limitations.

### Changed

- Version advanced from `0.1.0-alpha.1` to `0.1.0-beta.1` for the CLI package
  and VS Code extension package.

### Privacy

- The beta remains local-first. It does not include uploads, contribution
  submission, hosted backend behavior, telemetry, or public rankings from real
  contributed data.
- Dashboard and VS Code workflows use the same local SQLite database boundary
  as the CLI.
- Manual export writes local files only and requires explicit consent and
  confirmation.

### Known Limitations

- Public contribution upload is not implemented.
- Hosted dashboards, team analytics, public aggregate rankings, and account
  features are not included.
- The beta tag should be created on `main` only after release checks pass.

## 0.1.0-alpha.1 - 2026-06-18

### Added

- `opensasa report --json` for script-friendly local report output.
- `opensasa sessions --json` for script-friendly local session summaries.
- `opensasa inspect --json` and `opensasa inspect --contribution --json` for
  script-friendly inspection output.
- `opensasa log --json` for script-friendly local session creation output.
- `opensasa sessions --limit <count>` for limiting local session history output.
- `opensasa sessions` filters for provider, model ID, task type, and final outcome.
- `opensasa sessions` filters for tool, language, framework, and work mode.
- `opensasa sessions` timestamp range filters with `--since` and `--until`.
- `opensasa report` filters for provider, model ID, task type, and final outcome.
- `opensasa report` filters for tool, language, framework, and work mode.
- `opensasa report` timestamp range filters with `--since` and `--until`.
- `opensasa report --limit <count>` for calculating reports from the newest
  matching local sessions.
- Provider grouping and provider cost totals in local reports.
- Tool grouping and tool cost totals in local reports.
- Language grouping and language cost totals in local reports.
- Framework grouping and framework cost totals in local reports.
- Work mode grouping and work mode cost totals in local reports.
- Cost source grouping and cost source cost totals in local reports.
- Repository size bucket grouping and repository size cost totals in local reports.
- File count bucket grouping and file count cost totals in local reports.
- Changed file count bucket grouping and changed file count cost totals in local reports.
- Lines added bucket grouping and lines added cost totals in local reports.
- Lines removed bucket grouping and lines removed cost totals in local reports.
- Duration bucket grouping and duration bucket cost totals in local reports.
- Token estimate summaries in local reports.
- Error count summaries in local reports.
- Clearer local report section ordering and empty-state text.
- Report schema and metadata schema versions in local report JSON output.
- `opensasa demo-seed` for creating safe synthetic local sessions.
- Cost per useful task and failure cost metrics in local reports.
- Speed to useful output metric in local reports.
- Unknown outcome rate metric in local reports.
- Failure retry burden metric in local reports.
- Confidence summary labels in local reports.
- Contribution preview validation status for forbidden raw fields.
- Local contribution consent state on sessions.
- Seed-only methodology examples for interpreting local report metrics.
- `opensasa update <session-id>` for editing safe local session metadata.
- `opensasa delete <session-id> --yes` for explicitly deleting a local session.
- CLI scaffold with `opensasa --help` and `opensasa --version`.
- Local session metadata validation with Zod schemas and MVP enum values.
- Local SQLite storage at `~/.opensasa/opensasa.db` with migration support.
- `opensasa log` for flag-based manual session entry.
- `opensasa sessions` for local session history.
- `opensasa report` for personal local report metrics.
- `opensasa inspect <session-id>` for local session inspection.
- `opensasa inspect <session-id> --contribution` for a no-upload contribution preview.
- README documentation for the implemented local CLI workflow.

### Fixed

- Timestamp range filters now compare timestamp instants instead of raw strings,
  so valid timezone offsets are handled consistently.

### Privacy

- No uploads, telemetry, hosted backend, or public contribution behavior is included.
- The CLI does not request or store source code, private prompts, model responses,
  exact file paths, repository names, secrets, or raw terminal output.
- Contribution previews are local-only and show the stored local consent state.
- Contribution previews validate that forbidden raw fields are not present.

### Methodology

- Report metrics follow the draft methodology separation between useful outcome
  rate and verified success rate.
- Missing cost and unknown outcome data are labeled directly in report output.

### Known Limitations

- Contribution upload is not implemented.
- Bucket thresholds are early implementation defaults and may change as the
  methodology matures.
