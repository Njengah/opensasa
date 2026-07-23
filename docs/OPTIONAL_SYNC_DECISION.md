# Optional Sync Decision

Status: not needed for the current Phase 7 slice.

OpenSasa should not add automatic sync yet. The current product remains useful
with a local SQLite database, explicit contribution export, optional hosted
intake validation, accountless public aggregate gates, and no background
transfer.

## Decision

Keep sync disabled until a later PR proves a concrete user need and documents
the consent, identity, conflict-resolution, deletion, and recovery model.

The current flow works without sync:

- the local SQLite database remains the personal source of truth;
- `opensasa export` writes inspected contribution-safe files only when the user
  explicitly runs the command;
- hosted intake can validate a submitted payload without continuously reading
  local state;
- public aggregate dashboards use accepted aggregate records, not a user's
  private local database;
- account and sync decisions remain separate so identity is not introduced just
  to move data.

## Why Not Now

Sync would change OpenSasa from a local-first tracker into a hosted data
movement product. That requires decisions this project has not approved:

- opt-in and opt-out UX;
- which records sync and which records never sync;
- whether sync includes contribution history, verification outcomes, or
  project identity hashes;
- conflict resolution across devices;
- deletion propagation and revocation behavior;
- offline behavior and retry policy;
- encryption, key management, and recovery;
- abuse, rate-limit, and operational monitoring rules.

Without those decisions, sync would create privacy and support risk before the
hosted workflow has proven enough value.

## Triggers For Reconsidering

Optional sync can be reconsidered only when at least one of these features is
approved as a separate PR:

- cross-device private dashboard continuity;
- signed-in developer backup or restore;
- team or organization private dashboards;
- contributor-managed hosted history;
- explicit user demand that cannot be satisfied by export/import.

Before implementation, the sync PR must document:

- the exact synced record types and excluded fields;
- the user consent flow and default disabled state;
- account or identity requirements;
- retention and deletion propagation;
- conflict resolution rules;
- encryption and key-management behavior;
- how to inspect, pause, disable, and delete synced data.

## Non-Goals

This decision does not add:

- background sync;
- automatic upload;
- account sync;
- hosted backup;
- cross-device restore;
- private hosted dashboards;
- organization data sharing.

Until one of the reconsideration triggers is approved, OpenSasa should keep all
sync behavior disabled and continue using explicit local export/import
boundaries.
