# Changelog

All notable changes to OpenSasa will be documented in this file.

## 0.1.0-alpha.1 - 2026-06-18

### Added

- `opensasa report --json` for script-friendly local report output.
- CLI scaffold with `opensasa --help` and `opensasa --version`.
- Local session metadata validation with Zod schemas and MVP enum values.
- Local SQLite storage at `~/.opensasa/opensasa.db` with migration support.
- `opensasa log` for flag-based manual session entry.
- `opensasa sessions` for local session history.
- `opensasa report` for personal local report metrics.
- `opensasa inspect <session-id>` for local session inspection.
- `opensasa inspect <session-id> --contribution` for a no-upload contribution preview.
- README documentation for the implemented local CLI workflow.

### Privacy

- No uploads, telemetry, hosted backend, or public contribution behavior is included.
- The CLI does not request or store source code, private prompts, model responses,
  exact file paths, repository names, secrets, or raw terminal output.
- Contribution previews are local-only and label consent as not granted.

### Methodology

- Report metrics follow the draft methodology separation between useful outcome
  rate and verified success rate.
- Missing cost and unknown outcome data are labeled directly in report output.

### Known Limitations

- Only `opensasa report` supports JSON output.
- Sessions cannot be edited after logging.
- Reports do not yet support filtering or pagination.
- Contribution upload is not implemented.
- Bucket thresholds are early implementation defaults and may change as the
  methodology matures.
