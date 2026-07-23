# Public Methodology Changelog

Status: public methodology history for Phase 7.

This changelog records public methodology versions, schema relationships,
confidence-threshold changes, abuse-rule changes, and interpretation changes
that can affect public aggregate claims.

Current public methodology version:

```text
opensasa.methodology.v0
```

## Rules

Update this changelog whenever a PR changes:

- public aggregate formulas;
- confidence labels or thresholds;
- bucket definitions used in public aggregate records;
- required public labels;
- data provenance rules;
- abuse or anti-gaming rules;
- vendor-data handling;
- ranking or suppression rules;
- privacy constraints that affect public aggregate eligibility.

Every entry should include:

- date;
- methodology version;
- related schema version;
- linked PR number;
- what changed;
- public impact;
- whether existing public aggregate records need regeneration.

Changing public methodology behavior should also update the methodology version
in code and docs when the change affects aggregate interpretation.

## 2026-07-23 - opensasa.methodology.v0

Related schema version: `opensasa.public-aggregate.v0`

Status: initial public aggregate methodology baseline.

Related PRs:

- #121: defined the public aggregate schema.
- #124: added confidence labels for aggregate views.
- #125: added the seed-only public dashboard.
- #126: added the real-data public dashboard gate.
- #130: added abuse and anti-gaming rules.

Public impact:

- Public aggregate records must include schema version and methodology version.
- Public aggregate metrics must include sample size and confidence labels.
- Seed and test records are always `insufficient`.
- Community and vendor records require minimum sample size and verification
  coverage before public display.
- Real-data public dashboards stay disabled until eligible non-seed aggregate
  records exist.
- Public rankings stay disabled until sample-size, confidence, provenance,
  verification, and abuse-flag rules are visible.
- Vendor, seed, and test data must remain labeled and separated from community
  ranking claims.

Regeneration:

- No persisted public aggregate records exist yet.
- Seed-only dashboard records use this methodology baseline.
