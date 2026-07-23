# Organization And Team Private Dashboard Design

Status: design gate only.

OpenSasa should not build hosted organization or team private dashboards yet.
This document defines the prerequisites and safe shape for that future feature
without adding accounts, sync, organization membership, hosted private storage,
or access-controlled dashboard code.

## Decision

Keep organization and team private dashboards as a separate future feature.
They must not be bundled into public aggregate dashboards, hosted intake,
account decisions, or optional sync decisions.

This document is the first design gate. It is allowed to name team or
organization dashboards as a reason to reconsider accounts or sync, but it does
not approve implementation. A future implementation PR must come only after the
project has approved:

- an account system with identity, retention, deletion, recovery, and abuse
  rules;
- organization or team membership and role-based access control;
- optional sync or explicit upload rules for the exact records shown;
- private hosted storage and encryption requirements;
- an audit trail for who viewed, changed, exported, or deleted shared data;
- a policy for whether contribution records can be linked to a team,
  organization, or individual contributor.

## Current Boundary

The current local dashboard remains personal and local-only:

- it reads the developer's local SQLite database;
- it does not upload local sessions;
- it does not create organizations or teams;
- it does not provide shared access;
- it does not expose private hosted dashboards.

Public aggregate dashboards remain separate. They show aggregate records with
sample size, confidence, provenance, schema version, and methodology version;
they must not become a private team analytics surface.

## Future Dashboard Scope

If approved later, an organization or team private dashboard may show only
records that were explicitly shared into that private workspace. It should
separate:

- personal local records that never leave the developer's machine;
- contribution-safe records submitted to public aggregate intake;
- private workspace records shared under organization or team policy.

The UI should clearly label:

- workspace name;
- member role;
- data provenance;
- sync or upload state;
- retention policy;
- sample size and confidence for any aggregate metric;
- whether a record is personal, public aggregate, or private workspace data.

## Access-Control Questions

Before implementation, a separate PR must answer:

- who can create a workspace;
- who can invite, remove, or change members;
- which roles can view raw private records;
- which roles can view aggregate-only metrics;
- whether admins can export private workspace data;
- how revoked members lose access;
- how deleted users and deleted workspaces are handled;
- how audit logs are stored and retained.

## Non-Goals

This decision does not add:

- hosted private dashboard routes;
- organization or team membership;
- role-based access control;
- workspace storage;
- account login;
- background sync;
- automatic upload;
- billing or seats.

Until those prerequisites are approved, OpenSasa should keep the shipped
dashboard local-only and keep public dashboards aggregate-only.
