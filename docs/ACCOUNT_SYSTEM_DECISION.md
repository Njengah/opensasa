# Account System Decision

Status: not needed for the current Phase 7 slice.

OpenSasa should not add hosted user accounts yet. The current product can
continue with local-first storage, explicit manual export, optional hosted
intake validation, seed public dashboards, and gated real-data aggregate views
without login, authentication sessions, billing identity, or hosted profile
records.

## Decision

Do not add an account system until a later feature has a concrete need for
identity, access control, retention policy, and user-facing recovery behavior.

The current flow works without accounts:

- the local SQLite database remains the personal source of truth;
- contribution export remains explicit and consent-based;
- hosted intake can validate contribution-safe payloads without storing a user
  profile;
- public dashboards read aggregate records, not private local sessions;
- seed and real-data public dashboard gates do not require a logged-in user.

## Why Not Now

Adding accounts too early would expand the threat model before the hosted value
is proven. It would require decisions this project has intentionally deferred:

- authentication provider and session management;
- account deletion and data retention;
- email or identity verification;
- abuse, rate-limit, and moderation workflows;
- support and recovery paths;
- privacy policy updates for hosted identity data.

Without those decisions, accounts would create risk without improving the
current local-first workflow.

## Triggers For Reconsidering

An account system can be reconsidered only when at least one of these features
is approved as a separate PR:

- private hosted dashboards for a signed-in developer;
- team or organization dashboards with member access control;
- contributor-managed public profile or contribution history;
- paid hosted features or billing;
- cross-device sync that cannot be safely handled by explicit export/import.

Before implementation, the account PR must document:

- what identity fields are collected;
- why each field is necessary;
- retention and deletion behavior;
- access-control rules;
- abuse and rate-limit strategy;
- whether contribution records can be linked back to an account.

## Non-Goals

This decision does not add:

- login;
- signup;
- hosted user profiles;
- account sync;
- organization membership;
- billing;
- private hosted dashboards.

Until one of the reconsideration triggers is approved, OpenSasa should keep
public aggregate and hosted-intake work accountless.
