# Abuse And Anti-Gaming Rules

Status: rulebook for Phase 7 public aggregate planning.

OpenSasa should be resistant to inflated claims, spam submissions, vendor
pressure, and synthetic activity before it publishes public rankings or
real-data aggregate claims. This document defines the initial abuse and
anti-gaming rules without adding moderation queues, account enforcement,
identity tracking, public rankings, or automated penalties.

## Decision

Public aggregate views must remain conservative until abuse controls exist.
OpenSasa should prefer hiding, flagging, or lowering confidence over publishing
metrics that look precise but may be manipulated.

These rules apply to future accepted contribution records, aggregate
materialization jobs, public dashboards, and methodology changes.

## Never Reward

OpenSasa must not reward:

- raw task volume without verification;
- repeated near-identical sessions;
- inflated success rates without passing checks;
- seed, synthetic, or test data presented as community data;
- vendor-submitted data presented as independent community signal;
- submissions designed only to influence rankings;
- exact repository, organization, customer, path, prompt, response, or terminal
  output disclosure.

## Required Labels

Every public aggregate record must keep visible labels for:

- schema version;
- methodology version;
- sample size;
- confidence label;
- data provenance;
- filters used to produce the view;
- verification coverage.

Vendor, seed, and test data must never be merged silently into community
aggregates. Synthetic display data should use seed or test provenance in public
aggregate records and remain excluded from community ranking claims.

## Flag Conditions

Future aggregate materialization should flag or suppress records when it sees:

- one safe provenance, vendor, tool, or import-source bucket dominating a
  result;
- unusually high success rate with low verification coverage;
- many records with identical metadata across a short time window;
- sudden spikes from one source after a public ranking changes;
- unknown outcome or missing cost coverage above the methodology threshold;
- inconsistent schema, methodology, provenance, or quality labels;
- records that fail server-side contribution validation;
- payloads containing private markers or forbidden fields.

Flagged records should not raise confidence labels. They should remain hidden,
excluded, or shown only with a clear public caveat until reviewed.

Contributor-level or team-level abuse detection requires a separate identity
and privacy decision. This rulebook must not be used to justify collecting
stable contributor, account, team, organization, repository, or customer
identity.

## Vendor Rules

Vendor-submitted data can help test displays or reproduce vendor-provided
claims, but it must not control public methodology.

Vendor data must:

- use explicit vendor provenance;
- be separated from community aggregates;
- avoid private customer or organization identifiers;
- never define thresholds, ranking formulas, or confidence labels by itself;
- be reviewable against the same contribution validation rules as community
  data.

## Ranking Rules

Public rankings must stay disabled until:

- sample-size and confidence thresholds are met;
- verification coverage is visible;
- abuse flags are handled;
- methodology version and schema version are shown;
- data provenance is clearly labeled;
- vendor and synthetic data are excluded or separated;
- the public methodology changelog explains the rules in effect.

If abuse signals are unresolved, OpenSasa should show an aggregate as
`insufficient` or hide the ranking rather than publish a misleading comparison.

## Privacy Boundary

Abuse prevention must not become a reason to collect private implementation
data. Abuse checks should work from contribution-safe metadata and aggregate
patterns.

Do not require:

- source code;
- private prompts;
- model responses;
- exact file paths;
- repository names;
- organization names;
- customer names;
- raw terminal output;
- credentials or secrets.

## Non-Goals

This decision does not add:

- user accounts;
- identity enforcement;
- moderation queues;
- automatic penalties;
- vendor portals;
- public rankings;
- private data collection.

Future enforcement work must become a separate PR with tests, audit behavior,
appeal or correction policy, and documented privacy impact.
