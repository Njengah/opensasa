# OpenSasa

OpenSasa is an early-stage open-source project for real-world AI coding intelligence.

The goal is to help developers understand which AI models actually work in software engineering workflows, not only which models perform well on static benchmarks or vendor-published charts.

## Rationale

AI coding models are changing quickly. New models ship, pricing changes, context windows expand, benchmarks move, and developers keep asking the same practical questions:

- Which model is best for this kind of coding task?
- How much does it cost to get a useful result?
- Which models waste the most retries?
- Which models produce changes that pass tests?
- Which models are improving or getting worse after releases?
- Which tools and agents work best in real repositories?

Benchmarks are useful, but they do not fully capture what happens in everyday development: failed patches, accepted changes, retries, task complexity, cost per useful outcome, verification results, and model drift over time.

OpenSasa is built around a simple belief:

> If AI models are going to shape software engineering, software engineers should help define how they are measured.

## Project Scope

OpenSasa is intended to become a privacy-first system for tracking and comparing AI coding workflows using safe, opt-in developer metadata.

The long-term product direction includes:

- a local tracker for AI coding sessions,
- a private developer dashboard,
- a public AI coding model index,
- transparent scoring methodology,
- model release drift tracking,
- cost-per-useful-outcome reporting,
- and shareable reports for the developer community.

## Project Boundaries

OpenSasa is not:

- another generic LLM leaderboard,
- a vendor ranking page,
- a benchmark-only aggregator,
- a coding-hours vanity board,
- a source-code harvesting tool,
- or a closed analytics product with unverifiable methodology.

The project should be useful to individual developers first, and only then contribute to a broader public index through explicit opt-in.

## Privacy Principles

OpenSasa should be local-first and privacy-first by default.

The intended default is:

> No source code uploaded. No private prompts exposed. Developers choose what they share.

Safe metadata may include information such as model name, provider, coding tool, task type, language, estimated tokens, estimated cost, duration, retry count, check outcomes, and accepted or rejected status.

Data excluded by default should include source code, private prompts, model responses, exact file paths, repository names, company names, secrets, and terminal output that could contain private information.

## Project Status

This repository is currently in blueprint stage.

There is no product code yet. The first public work is to define the project clearly before implementation:

- mission,
- privacy model,
- metadata boundaries,
- scoring principles,
- public index design,
- local tracker workflow,
- contribution model,
- and anti-gaming strategy.

The public development and versioning approach is described in [Development Cycle](./docs/DEVELOPMENT_CYCLE.md).

## Positioning

> OpenSasa is real-world intelligence for AI coding.

More specifically:

> OpenSasa helps developers and teams understand which AI models actually work in real software engineering workflows.
