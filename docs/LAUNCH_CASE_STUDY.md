# OpenSasa v0.1 Beta Launch Case Study

OpenSasa `v0.1.0-beta.1` is the first public beta of a local-first toolkit for
understanding real AI coding workflows.

The beta is intentionally narrow. It does not publish rankings, collect private
repository data, or upload contribution payloads. It proves the trust loop first:
a developer can install the CLI, seed safe local demo data, inspect reports, view
a dashboard, and preview the exact contribution bundle that would be shared in a
future opt-in workflow.

## Why This Exists

AI coding models are evaluated heavily through static benchmarks, vendor demos,
leaderboard snapshots, and anecdotes. Those signals are useful, but they do not
fully answer the questions developers ask during day-to-day work:

- Which model helps most for bug fixing, refactors, tests, or frontend work?
- How often does a generated patch pass verification?
- How many retries does a useful result require?
- What does a successful task cost relative to failed attempts?
- Are new model releases improving real workflows or only benchmark scores?

OpenSasa starts from the position that real workflow data should be measurable
without asking developers to surrender source code, private prompts, repository
names, customer context, secrets, or raw terminal output.

## What The Beta Ships

The `v0.1.0-beta.1` release packages the local developer loop:

- `opensasa demo-seed` creates synthetic sessions for safe evaluation.
- `opensasa sessions` lists local session history from SQLite.
- `opensasa report` summarizes model, tool, cost, duration, retry, and outcome
  metadata.
- `opensasa inspect` shows one session and can render its contribution-safe
  metadata.
- `opensasa export` writes a local manual export contribution bundle for review.
- `opensasa dashboard` serves a local-only dashboard over the same SQLite data.
- The VS Code extension can start and finish local sessions against the same
  database boundary.

The fastest evaluation path is the
[demo walkthrough](./DEMO_WALKTHROUGH.md). A new user can run through the seeded
flow without connecting a real repository or submitting any data.

## Privacy Boundary

The beta keeps a hard privacy boundary:

> No source code uploaded by default. No private prompts uploaded by default. No
> contribution without explicit developer consent.

Contribution preview exists so the developer can inspect what would be shared
before anything leaves their machine. In `v0.1`, there is no upload destination
or submission workflow. Exported bundles stay local unless the developer chooses
to move them elsewhere.

Safe metadata is limited to fields such as model ID, provider, coding tool, task
type, language, framework, cost and duration buckets, retry buckets,
verification outcomes, and final outcome labels. The boundary is documented in
the [security and privacy FAQ](./SECURITY_PRIVACY_FAQ.md), the
[sharing boundary](./SHARING_BOUNDARY.md), and the
[metadata schema](./METADATA_SCHEMA.md).

## What This Case Study Proves

The beta is not a claim that OpenSasa has solved AI coding measurement. It proves
the first product constraint: the local workflow can be useful before any public
index exists.

The current repository demonstrates that:

- installation and CLI smoke tests are documented;
- seeded demo data makes the product evaluable without private data;
- local reports and the dashboard expose workflow signals developers can inspect;
- contribution bundles can be previewed before sharing;
- release checks verify package metadata, npm pack contents, and CLI help;
- the project documents its methodology and privacy limits before publishing
  aggregate rankings.

That matters because trust products need visible trust boundaries before charts,
scores, or public comparisons.

## What Is Not Included Yet

The beta does not include:

- automatic capture from every AI coding tool;
- hosted accounts or cloud sync;
- public aggregate model rankings;
- contribution submission;
- vendor dashboards;
- claims based on real user contribution data.

Those features belong after the local loop is proven and the opt-in contribution
path is reviewed.

## Related Reading

- [README](../README.md) for the product overview.
- [Install guide](./INSTALL.md) for trying the beta locally.
- [Demo walkthrough](./DEMO_WALKTHROUGH.md) for the under-10-minute proof path.
- [Architecture](./ARCHITECTURE.md) for the local-first design.
- [Roadmap](./ROADMAP.md) and [product timeline](./PRODUCT_TIMELINE.md) for what
  comes next.
- [Changelog](../CHANGELOG.md) for shipped beta scope.

## Next Work

The next phase is optional cloud and public aggregate index work. It should only
start after the local-first beta has been evaluated by real users and the project
has enough feedback on metadata quality, workflow coverage, and privacy
expectations.

Useful feedback now:

- Which AI coding tools should be supported first?
- Which task types are missing from the metadata model?
- What verification evidence should count as a useful coding session?
- What minimum sample size should be required before public rankings appear?
- How should vendor-submitted data be labeled?

Benchmarks are useful. Real coding workflows should count too.
