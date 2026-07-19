# What OpenSasa Shares

OpenSasa is local-first. The CLI and dashboard read the local SQLite database;
they do not upload telemetry or session data.

## Stored locally

Local session records may contain safe workflow metadata such as:

- provider, model ID, tool, task type, language, and framework;
- coarse repository, file, change, token, duration, and cost buckets;
- verification outcomes, retry and error counts, and final outcome;
- project identity hashes and import provenance labels;
- local contribution consent state.

Project identity hashes are one-way SHA-256 hashes. Exact project paths are not
stored. Import provenance identifies a source or integration label; it does not
store the source tool's logs.

## Never collected by default

OpenSasa does not request or store:

- source code or diffs;
- private prompts or model responses;
- exact file paths, repository names, organization names, or customer names;
- secrets, API keys, credentials, or private notes;
- raw terminal output;
- background activity outside an explicit heartbeat command.

## Contribution preview

The current contribution command is a local preview only. It shows what a future
privacy-safe contribution could contain, validates forbidden fields, and does
not upload anything. Consent state is recorded locally, but consent does not
enable an upload path in the current MVP.

Before any future submission feature exists, the payload, destination, consent
flow, and validation rules must be inspectable and documented in a separate
change.

For `v0.1`, the practical sharing boundary is manual export only. OpenSasa can
write a local contribution JSON file, but it does not include an upload
destination, submission workflow, or background transfer path.

## Practical rule

If a value could reveal source content, a private conversation, an exact local
path, an organization, a credential, or raw command output, it is outside the
default OpenSasa metadata boundary.
