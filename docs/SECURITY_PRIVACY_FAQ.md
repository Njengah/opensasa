# Security And Privacy FAQ

This FAQ describes the practical security and privacy behavior of OpenSasa
`v0.1`. It is not a legal privacy policy, and it does not describe future hosted
features.

## Is OpenSasa local-first in v0.1?

Yes. The `v0.1` CLI, local dashboard, and VS Code extension workflow are
designed around local metadata capture. Session records are written to a local
SQLite database. The shipped beta did not include upload or submission; Phase 7
adds an optional ingestion endpoint that validates safe payloads but does not
store them yet.

The ingestion endpoint binds to `127.0.0.1` by default. If you override
`--host` to `0.0.0.0` or another non-loopback address, you expose an
unauthenticated HTTP intake endpoint. Use that only for deliberate testing on a
trusted network.

## What is stored locally?

OpenSasa stores safe workflow metadata that helps you understand AI-assisted
coding sessions. Depending on the command and fields you provide, local records
can include:

- provider and model ID;
- model version, coding tool, language, framework, work mode, and task type;
- coarse buckets for repository size, file count, changed files, changed lines,
  duration, token estimates, and cost;
- verification outcomes, retry count, error count, confidence, and final
  outcome;
- local contribution consent state;
- import provenance labels;
- optional project identity hash.

By default, the database path is `~/.opensasa/opensasa.db`. You can override it
with `--db-path`, `OPENSASA_DB_PATH`, or the local OpenSasa config file.

## What is excluded by default?

OpenSasa does not collect or upload source code, diffs, private prompts, model
responses, exact source or project paths, raw terminal output, repository
names, company names, customer names, secrets, API keys, credentials, or
private notes by default.

One practical exception is local export bookkeeping: when you run
`opensasa export`, OpenSasa records the output path you explicitly chose in
local contribution history so you can review what was exported from this
machine. Treat export and metadata output paths as local record data, and avoid
placing private project names in those filenames if that matters for your
workflow.

The intended metadata boundary is simple: if a value could reveal source
content, a private AI conversation, an exact local path, an organization, a
credential, or raw command output, it is outside the default `v0.1` capture
boundary.

## How does project identity hashing work?

When you pass `--project-path`, OpenSasa can associate sessions with a project
without storing the project name or exact path. It stores a one-way SHA-256
identity hash derived from the supplied path.

The hash is useful for grouping local sessions from the same project, but it is
not a claim of anonymity against every possible attacker. Treat it as a privacy
reduction measure, not as a substitute for careful handling of private project
metadata.

## What is the command verification privacy boundary?

`opensasa verify` runs a local command that you explicitly provide and writes
only the resulting verification outcome back to the session record. The command
text and raw terminal output are not stored in the OpenSasa session record by
default.

Use the same caution you would use when running any local command. If the
command itself writes logs, files, or network traffic outside OpenSasa, that
behavior belongs to the command and its tools, not to OpenSasa's metadata
storage.

## What is the VS Code extension boundary?

The VS Code extension is a local workflow wrapper around the CLI. In `v0.1`, it
is not a hosted telemetry client and it does not add a separate upload path for
source code, prompts, model responses, exact paths, or raw terminal output.

Extension actions should be evaluated using the same local CLI boundary: safe
metadata can be recorded locally, while private coding content is excluded by
default.

## Does the dashboard upload anything?

No. The current dashboard is local-only. It reads the local SQLite database and
serves report views from your machine. It does not upload sessions, send
telemetry, or publish rankings.

By default, the dashboard binds to `127.0.0.1`. If you override the host with a
non-loopback address, you may expose local report, contribution preview, and
contribution history endpoints to other devices that can reach that interface.
Only do that on a trusted network and with a clear reason.

The dashboard can preview local contribution bundles and local contribution
history, but previewing those views does not create a hosted submission.

## What happens during manual export?

Manual export is the current sharing boundary. `opensasa export` writes a
sanitized contribution payload to a local JSON file that you explicitly choose.
It requires an explicit output path, a local session consent state of
`granted`, and a `--yes` confirmation.

Export does not upload the file. You decide whether to share the exported file
outside your machine.

## What is in the optional export metadata and signing sidecar?

When `--metadata-out` is supplied, OpenSasa writes a detached local metadata
sidecar for the exported payload. The sidecar can include metadata such as the
payload hash, byte size, export timestamp, and validation status.

When `--signing-key-env` is also supplied, OpenSasa signs that sidecar with an
HMAC-SHA256 signature derived from the named local environment variable. The
signing key is read locally from your environment; do not put signing secrets in
source control or shared logs.

## What do deletion and consent revocation mean?

`opensasa delete <session-id> --yes` removes that local session record from the
local SQLite database you are using. If you exported a JSON file earlier,
deleting the local record does not delete copies of that exported file or any
copies you shared elsewhere.

Contribution consent is stored locally as session metadata and can be changed
to `granted`, `not_granted`, or `revoked`. Revocation affects the current local
state and future local review. It cannot recall an exported file that already
left your machine.

## How should I report issues or suspected leaks?

If you believe OpenSasa stored, displayed, exported, or exposed data outside
the documented boundary, stop using the affected database or exported payload
until you review it.

When reporting an issue, do not paste secrets, source code, private prompts,
model responses, exact paths, or raw terminal output into a public issue. Share
only the minimum safe reproduction details, such as the command name, OpenSasa
version, operating system, field names involved, and whether a local database,
dashboard view, or exported file was affected.

Use the repository issue tracker for product bugs. For sensitive reports, ask
for a private disclosure path before sending details.
