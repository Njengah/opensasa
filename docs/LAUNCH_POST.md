# Launch Post Draft

This is a draft public launch post for OpenSasa.

It should be reviewed before publication. The current repository is still in foundation stage, so this draft should not claim that product code, public rankings, real contribution data, or a working tracker already exist.

## Working Title

Benchmarks Are Useful. Real Coding Workflows Should Count Too.

## Short Version

OpenSasa is an early-stage open-source project for real-world AI coding intelligence.

The goal is simple: help developers understand which AI models actually work in software engineering workflows, not only which models perform well on static benchmarks or vendor-published charts.

AI coding models are changing quickly. Developers are already asking practical questions:

- Which model should I use for bug fixing?
- Which model is best for frontend implementation?
- Which model wastes the fewest retries?
- Which model's patches pass tests most often?
- What does my AI coding workflow actually cost?
- Are new model releases actually better for real coding work?

Benchmarks matter, but they do not capture the whole workflow: retries, failed patches, accepted changes, verification results, cost per useful outcome, task complexity, and model drift over time.

OpenSasa starts from a privacy-first position:

> No source code uploaded by default. No private prompts uploaded by default. No contribution without explicit developer consent.

The first public work is not a leaderboard. It is the foundation: privacy principles, metadata boundaries, scoring methodology, confidence labels, contribution rules, and a roadmap for a local-first tracker.

If AI models are going to shape software engineering, software engineers should help define how they are measured.

## Full Draft

Developers are using AI coding models every day now.

They use them to fix bugs, write tests, build UI, refactor code, review changes, migrate dependencies, debug failures, and explore unfamiliar repositories.

But the way the industry talks about AI coding models is still too narrow.

Most of the signal comes from static benchmarks, vendor demos, leaderboard snapshots, and anecdotal posts. Those signals are useful, but they do not fully answer the questions developers actually ask when choosing a model for real work.

Developers ask:

- Which model is best for this kind of coding task?
- How much does it cost to get a useful result?
- Which models waste the most retries?
- Which models produce changes that pass tests?
- Which models are improving or getting worse after releases?
- Which tools and agents work best in real repositories?

Those questions are not only benchmark questions. They are workflow questions.

Real software engineering includes failed patches, accepted and rejected changes, retries, partial fixes, test failures, lint failures, typecheck failures, hidden token costs, model updates, tool differences, and the developer's final judgment about whether a result was useful.

That is why I am starting OpenSasa.

OpenSasa is an early-stage open-source project for real-world AI coding intelligence.

The long-term goal is to help developers and teams understand which AI models actually work in real software engineering workflows.

The project starts with a simple belief:

> If AI models are going to shape software engineering, software engineers should help define how they are measured.

## What OpenSasa Is

OpenSasa is intended to become a privacy-first system for tracking and comparing AI coding workflows using safe, opt-in developer metadata.

The long-term product direction includes:

- a local tracker for AI coding sessions,
- a private developer report,
- upload inspection before contribution,
- an opt-in public AI coding model index,
- transparent scoring methodology,
- confidence labels,
- model release drift tracking,
- cost-per-useful-outcome reporting,
- and shareable privacy-safe reports.

The first complete product loop should be narrow:

1. A developer records or imports an AI coding session.
2. OpenSasa stores safe metadata locally.
3. The developer sees a private report about model usage, cost, retries, and outcomes.
4. The developer can inspect exactly what would be shared.
5. The developer can optionally contribute anonymized metadata.
6. Public aggregate views update with confidence labels.

The personal product should be useful even if a developer never contributes public data.

## What OpenSasa Is Not

OpenSasa is not another generic LLM leaderboard.

It is not a vendor ranking page.

It is not a benchmark-only aggregator.

It is not a coding-hours vanity board.

It is not a source-code harvesting tool.

It is not a closed analytics product with unverifiable methodology.

The goal is not to pretend one global score can tell you which model is best for everything. The goal is to build practical, inspectable signal around real coding workflows.

## Privacy Comes First

OpenSasa should be local-first and privacy-first by default.

The trust boundary is non-negotiable:

> No source code uploaded by default. No private prompts uploaded by default. No contribution without explicit developer consent.

Safe metadata may include fields like:

- model ID,
- provider,
- coding tool or agent,
- task type,
- language,
- framework,
- estimated token and cost buckets,
- duration bucket,
- retry count bucket,
- test, build, lint, or typecheck outcome,
- final outcome: accepted, partially accepted, rejected, or unknown.

Data excluded by default should include:

- source code,
- private prompts,
- model responses,
- exact file paths,
- repository names,
- organization names,
- company names,
- customer names,
- secrets,
- API keys,
- raw terminal output,
- private local notes.

Before any public contribution, developers should be able to inspect exactly what would be shared.

Using OpenSasa locally should not imply consent to share data.

## Methodology Before Rankings

OpenSasa should publish its methodology before publishing rankings.

The public index should avoid pretending one number captures everything.

Useful metrics may include:

- task success rate,
- verified success rate,
- cost per useful task,
- retry burden,
- failure cost,
- speed to useful output,
- model stickiness,
- release impact,
- confidence level.

Public comparisons should show confidence labels. Early or seed data should be labeled. Vendor-submitted data should be labeled. Unknown outcomes should not count as success.

No public ranking should appear without confidence labels.

## Why Build This In Public

AI coding is becoming part of everyday software engineering.

That means the measurement system should not be controlled only by vendors, private dashboards, or static benchmark suites.

Developers should be able to inspect:

- what is measured,
- what is excluded,
- how outcomes are defined,
- how confidence is calculated,
- how public aggregate views are filtered,
- and how gaming or low-quality submissions are handled.

OpenSasa is meant to make that discussion public and reviewable.

The first work in the repository is intentionally boring in the right way: README, privacy principles, metadata schema, methodology, roadmap, and contribution rules.

That foundation matters because trust products need visible trust boundaries before charts, rankings, or growth claims.

## Current Status

OpenSasa is currently in foundation stage.

There is no product code yet.

The current public work is to define:

- the project mission,
- the privacy model,
- safe metadata boundaries,
- the scoring methodology,
- confidence labels,
- contribution rules,
- the roadmap,
- and the first local tracker workflow.

Implementation should begin only after those decisions are reviewed.

## What Comes Next

The roadmap is staged:

1. Foundation docs.
2. Manual local tracker.
3. Local reports.
4. Public methodology package.
5. Contribution preview.
6. Public index prototype.
7. Tool integrations.

The cleanest MVP is a manual or semi-manual local tracker, local storage, personal reports, upload inspection, public methodology, and a seed public index that is clearly labeled as early data.

The product should prove the local workflow before automating collection from every coding tool.

## Invitation

If you care about AI coding tools, model quality, privacy, developer workflow data, benchmarks, or open methodology, I would like your help.

Useful feedback right now includes:

- Which AI coding tools should be supported first?
- What is the minimum manual logging flow developers would tolerate?
- How should accepted, partially accepted, rejected, and unknown outcomes be defined?
- What verification evidence should count for a useful coding session?
- What sample size should be required before public rankings appear?
- How should vendors be allowed to participate without distorting trust?
- What should OpenSasa keep out of scope early?

Benchmarks are useful, but real software engineering workflows should also shape how we judge AI coding models.

That is the work OpenSasa is starting.

## Social Drafts

### Short Post

I am starting OpenSasa: an early-stage open-source project for real-world AI coding intelligence.

The goal is to help developers understand which AI models actually work in software engineering workflows, not only which models perform well on static benchmarks or vendor charts.

Privacy-first by default:

- no source code uploaded by default,
- no private prompts uploaded by default,
- no contribution without explicit consent.

First step: publish the privacy model, metadata schema, scoring methodology, roadmap, and contribution rules before building the tracker or public index.

Benchmarks are useful. Real coding workflows should count too.

### Developer Community Post

Which AI coding model actually works for your tasks?

Not just on benchmarks. In your repo, with your stack, your retries, your tests, your cost, and your final decision about whether the output was useful.

That is the question OpenSasa is built around.

The project is starting with the boring trust work first: privacy principles, safe metadata, scoring methodology, confidence labels, and contribution rules.

No source code uploaded by default. No private prompts uploaded by default. No silent contribution.

The goal is a local-first tracker that can later power an opt-in public AI coding model index with inspectable methodology.

