# OpenSasa Architecture

This document describes the current `v0.1` architecture. OpenSasa is a
local-first tracker: the CLI, local SQLite store, report API, dashboard, and
VS Code extension all operate on data on the developer's machine.

`v0.1` shipped without upload or submission. Phase 7 adds an optional intake
boundary, but it still does not add automatic upload, public aggregate rankings,
account sync, or persisted community data.

## System Shape

The CLI is the product engine. It validates session metadata, writes local
records, calculates reports, builds contribution previews, exports local JSON
files, and starts the dashboard server.

The current runtime shape is:

- developer runs `opensasa` directly or through the VS Code extension;
- CLI validates safe metadata against the local schema;
- CLI writes records to a local SQLite database;
- report code reads that local store and calculates personal aggregates;
- dashboard server exposes local HTTP endpoints backed by the same report and
  contribution-preview code;
- browser dashboard renders those local-only endpoints;
- export writes inspected contribution payloads to local files only.

There is no background sync worker or remote service in this architecture.

## Local SQLite Store

OpenSasa persists sessions in a local SQLite database. The database path is
chosen locally by default, or explicitly with `--db-path` and extension
configuration.

The store contains safe workflow metadata such as provider, model ID, tool,
task type, language, framework, coarse buckets, estimated cost and token
values, verification outcomes, final outcome, and local contribution consent
state. It also records local contribution export history so a developer can
inspect what was exported from this machine.

The store is not a source-code archive. OpenSasa does not upload source code,
prompts, responses, exact paths, raw terminal output, secrets, repository
names, organization names, or customer names.

## Metadata Schema And Validation

Session records are validated before storage. The metadata schema defines
allowed enums, required fields, optional safe fields, timestamp formatting,
coarse bucket values, contribution consent states, and export metadata.

The schema boundary is intentionally narrow. OpenSasa prefers coarse metadata
when exact values could expose private context. Project identity is represented
with hashes rather than exact local paths.

Validation is used in three places:

- before local session records are inserted or updated;
- before local contribution previews are displayed or exported;
- before report and dashboard code consume stored records.

The canonical public schema reference is
[`docs/METADATA_SCHEMA.md`](./METADATA_SCHEMA.md).

## Reports And Dashboard Server

The report module calculates local personal aggregates from stored sessions.
Reports include schema version metadata, outcome rates, verification summaries,
cost and token summaries, retry and error summaries, confidence notes, and
breakdowns by safe metadata fields.

The dashboard command starts a local HTTP server. The dashboard server reads
the same SQLite database as the CLI and exposes local endpoints for report
JSON, contribution bundle preview JSON, and contribution history JSON. The
browser UI renders those local endpoints.

The dashboard is not a hosted dashboard. It does not upload telemetry or
session data. Its contribution bundle section is a preview of what a future
privacy-safe contribution could contain; it is not a submission workflow.

## VS Code Extension Boundary

The VS Code extension is a local workflow wrapper around the CLI. It invokes
the installed or configured `opensasa` command to start sessions, finish
sessions, show local status, and open the local dashboard.

The extension does not implement a separate data plane. It relies on the local
CLI and the same local SQLite database. Its database path setting only selects
where local metadata is stored.

The extension should preserve the same privacy boundary as the CLI: no source
code, private prompts, model responses, exact paths, raw terminal output, or
secrets are uploaded by OpenSasa.

## Contribution Preview And Export Boundary

Contribution support in `v0.1` is local and inspectable.

`opensasa inspect --contribution` builds a sanitized preview from a local
session. `opensasa export` writes a sanitized contribution payload, and
optionally detached export metadata, to local JSON files. Export requires
explicit local consent on the session.

Manual export remains the default sharing boundary. OpenSasa can write files
that a developer may inspect and decide how to use. The optional Phase 7 intake
endpoint can validate an explicitly submitted safe payload, but it does not
persist accepted payloads yet. OpenSasa still does not include:

- an upload destination;
- a submission API;
- background transfer;
- public ranking updates;
- public aggregate dashboards based on real contributed data.

Future persisted contribution submission must be designed and reviewed
separately, with documented payloads, destinations, consent flow, validation,
and revocation behavior.

The Phase 7 hosted boundary is captured in
[`docs/HOSTED_ARCHITECTURE.md`](./HOSTED_ARCHITECTURE.md). It keeps hosted
features optional, treats local SQLite as the personal source of truth, and
allows hosted intake only for validated contribution-safe payloads. The first
intake implementation validates `POST /api/contributions` payloads and returns
accepted or rejected responses, but it does not persist accepted payloads.
The account-system decision gate is captured in
[`docs/ACCOUNT_SYSTEM_DECISION.md`](./ACCOUNT_SYSTEM_DECISION.md); hosted
accounts remain disabled until a separate identity-dependent feature is
approved.
The optional-sync decision gate is captured in
[`docs/OPTIONAL_SYNC_DECISION.md`](./OPTIONAL_SYNC_DECISION.md); background sync
and automatic upload remain disabled until a separate sync-specific consent,
identity, retention, deletion, and conflict-resolution model is approved.
The organization/team private dashboard design gate is captured in
[`docs/TEAM_PRIVATE_DASHBOARD_DESIGN.md`](./TEAM_PRIVATE_DASHBOARD_DESIGN.md);
hosted private dashboards remain disabled until account, membership,
access-control, sync or upload, private storage, and audit requirements are
approved separately.

## Out Of Scope For v0.1

The following are future work and should not be implied by current docs or UI:

- hosted OpenSasa accounts;
- hosted private dashboards;
- public aggregate model rankings;
- real-data public dashboards;
- automatic contribution upload;
- team or organization analytics;
- background collection outside explicit local commands.

Those features may be added later only after the local-first privacy boundary,
metadata schema, consent model, and public methodology are updated to match the
new behavior.
