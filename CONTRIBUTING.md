# Contributing

OpenSasa is an early-stage open-source project for real-world AI coding intelligence.

The project is still in foundation stage. Contributions should help make the privacy model, metadata schema, methodology, roadmap, and first product workflow clearer before broad implementation begins.

## Contribution Principles

Good OpenSasa contributions should:

- preserve local-first behavior,
- keep the privacy boundary explicit,
- improve the trustworthiness of the methodology,
- avoid inflated claims about scale or rankings,
- keep pull requests small enough to review in one sitting,
- and explain what changed and why it matters.

OpenSasa should be useful to individual developers first. Public aggregate signals should only come from explicit opt-in, privacy-safe metadata.

## Start Here

Before contributing, read:

- `README.md` for project positioning,
- `BLUEPRINT.md` for product direction,
- `docs/PRIVACY.md` for privacy boundaries,
- `docs/METADATA_SCHEMA.md` for safe metadata fields,
- `docs/METHODOLOGY.md` for scoring and confidence principles,
- `docs/ROADMAP.md` for staged milestones,
- `docs/DEVELOPMENT_CYCLE.md` for branch, PR, commit, and release expectations.

## Current Contribution Focus

The highest-value contributions right now are foundation contributions:

- clarify privacy rules,
- improve metadata schema definitions,
- refine scoring and confidence methodology,
- define contribution quality criteria,
- document MVP workflow decisions,
- identify reviewable first implementation slices,
- improve public-facing explanations without overclaiming.

Implementation contributions should stay narrow until the first MVP workflow is explicitly chosen.

## Branches

Use short topic branches:

```text
docs/<short-topic>
methodology/<short-topic>
privacy/<short-topic>
feature/<short-topic>
fix/<short-topic>
release/<version>
```

Examples:

```text
docs/contributing
methodology/confidence-model
privacy/upload-inspection
feature/manual-session-logging
```

## Commits

Use conventional commits:

```text
type(scope): summary
```

Recommended types:

- `docs`: documentation and public narrative,
- `methodology`: schema, scoring, confidence, trust model, or anti-gaming updates,
- `privacy`: privacy rules, consent, data boundaries, or safety changes,
- `feat`: new product capability,
- `fix`: bug fix or correction,
- `refactor`: structure changes without behavior changes,
- `test`: test additions or updates,
- `chore`: repo maintenance.

Examples:

```text
docs(contributing): define contribution rules
methodology(confidence): draft confidence labels
privacy(consent): document contribution consent flow
feat(tracker): add manual session logging
```

## Pull Request Shape

Every pull request should include:

- summary,
- motivation,
- files changed,
- verification performed,
- known limitations.

Keep pull requests focused. A PR should usually do one of these:

- document a foundation decision,
- refine methodology,
- update privacy rules,
- add one product capability,
- add or update tests,
- fix a specific issue,
- prepare a release.

Avoid mixing unrelated documentation, product code, formatting, and methodology changes in one PR.

## Review Gates

Before opening a PR, check:

- Does this support the current roadmap milestone?
- Is the change small enough to review?
- Does the language avoid overclaiming?
- Are privacy assumptions explicit?
- Are methodology or scoring changes inspectable?
- Are tests or verification included when product code exists?
- Does the change preserve a readable project history?

Privacy-sensitive changes need stricter review.

A privacy-sensitive change is any change that affects:

- data collection,
- local storage,
- contribution payloads,
- anonymization,
- consent,
- upload behavior,
- public aggregation,
- imported tool logs,
- or public reporting.

Privacy-sensitive PRs must answer:

- Does this preserve local-first behavior?
- Does this avoid source-code upload by default?
- Does this avoid private prompt upload by default?
- Does this avoid model-response upload by default?
- Does this avoid exact file path upload by default?
- Does this require explicit consent before contribution?
- Can the developer inspect what is shared?
- Is the public documentation accurate?

## Privacy Rules

Contributions must not introduce default upload of:

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
- private local notes,
- personally identifying information that is not required for contribution.

When exact values could expose sensitive context, use coarse buckets.

## Methodology Rules

Methodology contributions should preserve these rules:

- no single universal leaderboard score,
- no public ranking without confidence labels,
- no vendor-controlled methodology,
- no fake scale,
- seed and synthetic data must be labeled,
- vendor-submitted data must be labeled,
- unknown outcomes should not count as success,
- verified success should be shown separately from task success.

Changes to scoring, confidence, filtering, data-quality weighting, or anti-gaming rules should explain the tradeoff they introduce.

## Data Contributions

OpenSasa is not ready for public data contribution yet.

When data contribution is introduced, it should be:

- opt-in,
- inspectable before sharing,
- validated against `docs/METADATA_SCHEMA.md`,
- labeled by data source,
- and safe under `docs/PRIVACY.md`.

Do not submit source code, prompts, model responses, exact file paths, repository names, secrets, or raw terminal output as sample data.

Seed or synthetic data may be useful for examples, but it must be clearly labeled and must not be presented as real community signal.

## Product Code Contributions

There is no product code yet.

When implementation begins, product code should follow the roadmap:

1. manual local tracker,
2. local reports,
3. public methodology package,
4. contribution preview,
5. public index prototype,
6. tool integrations.

The first product implementation should prove the local workflow before automation.

## Verification

For documentation-only changes, verification may include:

- checking links and file paths,
- confirming consistency with existing docs,
- reviewing privacy language,
- reviewing methodology language.

For product code changes, verification should include the relevant commands once they exist:

- tests,
- typecheck,
- lint,
- build,
- CLI smoke tests,
- migration checks if storage changes.

Do not claim a product behavior works without fresh verification evidence.

## Reporting Issues

Useful issues should include:

- the problem,
- why it matters,
- affected docs or future product area,
- suggested direction if known,
- privacy or methodology risk if relevant.

Security or privacy-sensitive issues should avoid including secrets, private prompts, source code, raw terminal output, or private repository details.

