# Changelog

All notable changes to OpenSasa will be documented in this file.

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
