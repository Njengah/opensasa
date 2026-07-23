# Hosted Architecture Decision

Status: decided for Phase 7 planning.

OpenSasa may add hosted features only after the local-first trust loop remains
useful on its own. Hosted systems must extend the current privacy boundary; they
must not replace local ownership of session metadata.

## Decision

Use an optional contribution-intake architecture:

- the CLI, dashboard, and VS Code extension remain local-first clients;
- developers inspect and export contribution-safe payloads locally before any
  upload exists;
- a hosted intake API may accept only validated contribution payloads;
- server-side validation must reject excluded fields before storage;
- public views are built from aggregate records, not raw local sessions;
- every public aggregate metric must show sample size and confidence labels;
- account, sync, organization, and private hosted dashboard features stay
  optional and should be designed separately.

The hosted service is not the source of truth for a developer's personal
workflow history. The local SQLite database remains the personal record.

## Data Flow

The intended Phase 7 flow is:

1. A developer records sessions locally.
2. The local client builds a contribution preview from safe metadata.
3. The developer explicitly consents to share a payload.
4. The client submits only the contribution payload to hosted intake.
5. Hosted intake validates schema version, required fields, allowed enums, and
   excluded-field rules.
6. Accepted payloads may be stored as contribution records only after a
   separate persistence PR is approved.
7. Aggregate jobs calculate public metrics from accepted records after
   persistence exists.
8. Public dashboards display aggregate metrics with sample size, confidence,
   methodology version, and data-quality labels.

Rejected payloads should not be stored as contribution records. Validation
failures may be counted operationally, but they must not expose rejected payload
contents in public logs or dashboards.

## Service Boundaries

The first hosted slice should be small:

- contribution intake API;
- contribution validation;
- append-only accepted contribution store after a separate persistence decision;
- aggregate materialization job after a separate persistence decision;
- seed-data-only public dashboard until real contribution volume is sufficient;
- methodology and schema version metadata on every public aggregate.

Do not combine the first hosted slice with accounts, team dashboards, automatic
sync, vendor portals, billing, or private cloud analytics. Those features add
different consent, retention, access-control, and threat-model requirements.
The account-system boundary is documented in
[`docs/ACCOUNT_SYSTEM_DECISION.md`](./ACCOUNT_SYSTEM_DECISION.md); accounts stay
disabled until a separate feature needs identity and the project has documented
retention, deletion, access-control, and abuse rules.
The optional-sync boundary is documented in
[`docs/OPTIONAL_SYNC_DECISION.md`](./OPTIONAL_SYNC_DECISION.md); sync stays
disabled until a separate feature needs background data movement and the project
has documented consent, identity, deletion, recovery, and conflict-resolution
rules.

The initial implementation exposes `opensasa ingest`, a small HTTP intake
server with `GET /health` and `POST /api/contributions`. It validates incoming
safe contribution payloads at the boundary and returns accepted or rejected
responses, but it does not persist accepted payloads yet. Persistence,
aggregation, and public dashboards remain separate reviewable steps.

## Privacy Rules

Hosted OpenSasa must never require or silently collect:

- source code;
- private prompts;
- model responses;
- exact file paths;
- repository names;
- organization names;
- customer names;
- secrets;
- API keys;
- raw terminal output;
- private local notes.

If a future payload field can identify a project, person, company, customer, or
private implementation detail, it must be excluded, bucketed, hashed, or removed
before hosted intake accepts it.

## Public Aggregate Rules

Public aggregate views should not imply certainty before enough data exists.
Every metric should include:

- sample size;
- confidence label;
- methodology version;
- schema version;
- filters used to calculate the view;
- whether the data is seed, test, vendor-submitted, or community-contributed.

The public dashboard should start with seed data only. Real-data views should
remain hidden or clearly disabled until sample-size and confidence thresholds
are met.

The first seed-only implementation is documented in
[`docs/PUBLIC_DASHBOARD.md`](./PUBLIC_DASHBOARD.md). It exposes `/public` and
`/api/public/aggregates` from the local dashboard server, and every returned
record is labeled as seed data with insufficient confidence. The response also
includes a real-data gate that must keep real contribution dashboards disabled
until at least one non-seed aggregate record meets sample-size and confidence
thresholds.

The public aggregate record shape is defined in
[`docs/PUBLIC_AGGREGATE_SCHEMA.md`](./PUBLIC_AGGREGATE_SCHEMA.md).

## Non-Goals

This decision does not approve:

- automatic upload;
- background sync;
- hosted private dashboards;
- account systems;
- organization analytics;
- public rankings without confidence labels;
- vendor ranking programs;
- retention policy for user accounts;
- moderation or abuse workflow details.

Those are separate decisions and should become separate PRs if Phase 7 proceeds.

## Current Phase 7 Sequence

The initial Phase 7 sequence now includes:

1. hosted architecture decision;
2. public aggregate schema;
3. safe contribution ingestion endpoint;
4. server-side validation rules;
5. aggregate confidence labels;
6. seed-only public dashboard;
7. real-data public dashboard gate;
8. account-system decision gate;
9. optional-sync decision gate.

The next separate decisions are organization or team private dashboard design,
abuse and anti-gaming rules, and public methodology changelog.
