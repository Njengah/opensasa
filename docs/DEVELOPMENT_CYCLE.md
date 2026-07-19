# Development Cycle

OpenSasa should develop in public with a clear, balanced project history.

The repository should show a full software development cycle: thoughtful planning, scoped implementation, review, iteration, and versioned releases. The goal is not only to build the product, but to make the project history understandable to future contributors, users, investors, and acquirers.

## Principles

- Every meaningful change should have a reason.
- Every version should represent a coherent product step.
- Every pull request should be reviewable in one sitting.
- Every release should explain what changed and why it matters.
- The git history should show product maturity, not noise.

## Versioning Model

OpenSasa should use semantic versioning once product code exists:

```text
MAJOR.MINOR.PATCH
```

- **Major:** large product or API changes that alter the core workflow.
- **Minor:** new capabilities, integrations, reports, or methodology improvements.
- **Patch:** fixes, copy refinements, small reliability improvements, and documentation corrections.

Before the first usable product release, use pre-release versions:

```text
0.1.0-alpha.1
0.1.0-alpha.2
0.1.0-beta.1
0.1.0
```

## Release Layers

The project should move through intentional layers.

### Layer 0: Foundation

Purpose: define the project before implementation.

Expected work:

- public README,
- development cycle guide,
- privacy principles,
- initial methodology draft,
- metadata schema draft,
- contribution philosophy.

Example version:

```text
v0.0.1-foundation
```

### Layer 1: Manual Tracking

Purpose: prove the workflow before automation.

Expected work:

- manual session entry,
- local-only data storage,
- basic cost and outcome fields,
- inspectable metadata payload,
- private report output.

Example version:

```text
v0.1.0-alpha.1
```

### Layer 2: Local Reports

Purpose: give developers value without public contribution.

Expected work:

- personal model usage report,
- cost by task type,
- retry burden,
- accepted and rejected outcomes,
- verification status summary.

Example version:

```text
v0.1.0-alpha.2
```

### Layer 3: Public Methodology

Purpose: make the scoring system inspectable before rankings matter.

Expected work:

- scoring methodology,
- confidence levels,
- anti-gaming rules,
- contribution quality rules,
- clearly labeled sample or seed data.

Example version:

```text
v0.1.0-beta.1
```

### Layer 4: Opt-In Contribution

Purpose: let developers contribute anonymized metadata deliberately.

Expected work:

- upload inspection,
- consent flow,
- anonymized payload schema,
- local preview before contribution,
- contributor safety rules.

Example version:

```text
v0.2.0
```

### Layer 5: Public Index

Purpose: turn opt-in data into useful public signal.

Expected work:

- task-specific model index,
- cost-per-useful-outcome views,
- verified success rate views,
- model release drift tracking,
- confidence labels.

Example version:

```text
v0.3.0
```

## Branch Strategy

Use a simple branch model:

```text
main
feature/<short-topic>
docs/<short-topic>
methodology/<short-topic>
fix/<short-topic>
release/<version>
```

Rules:

- `main` should remain stable and public-ready.
- Work should happen on topic branches.
- Pull requests should merge into `main`.
- Release branches should only be used when preparing a version.
- Avoid long-running branches unless the work is intentionally experimental.

## Commit Strategy

Use conventional commits:

```text
type(scope): summary
```

Recommended types:

- `docs`: documentation and public narrative.
- `feat`: new product capability.
- `fix`: bug fix or correction.
- `refactor`: structure changes without behavior changes.
- `test`: test additions or updates.
- `chore`: repo maintenance.
- `methodology`: scoring, schema, confidence, or trust model updates.
- `privacy`: privacy rules, consent, data boundaries, or safety changes.

Examples:

```text
docs(readme): define OpenSasa positioning
methodology(schema): draft safe metadata fields
privacy(policy): document excluded data defaults
feat(tracker): add manual session logging
test(reports): cover cost summary calculation
```

## Pull Request Shape

Each pull request should have a clear product role.

Recommended PR categories:

- **Foundation PRs:** public docs, setup, positioning, contributor rules.
- **Methodology PRs:** schema, scoring, confidence, anti-gaming.
- **Product PRs:** user-facing workflows and features.
- **Reliability PRs:** tests, validation, error handling.
- **Privacy PRs:** consent, local-first behavior, upload inspection.
- **Release PRs:** changelog, version bump, final review.

Every PR should include:

- summary,
- motivation,
- files changed,
- review notes,
- verification performed,
- known limitations.

## Review Gates

Before a PR merges, check:

- Does this support the current version layer?
- Is the change small enough to review?
- Does the public language avoid overclaiming?
- Are privacy assumptions explicit?
- Are tests or verification included when product code exists?
- Does the PR preserve a readable project history?

Privacy-sensitive changes require stricter review:

- no source-code upload by default,
- no private prompt upload by default,
- no exact file path upload by default,
- no silent contribution flow,
- inspect-before-share behavior preserved.

## Release Process

Each release should include:

- version number,
- release title,
- short summary,
- user-facing changes,
- methodology changes,
- privacy changes,
- known limitations,
- next milestone.

Release notes should avoid inflated claims. If the product has early or sample data, say so directly.
For the first public beta, use
[`docs/FIRST_RELEASE_CHECKLIST.md`](./FIRST_RELEASE_CHECKLIST.md) as the
release-readiness checklist.

## Changelog Expectations

Use a changelog once the first release tag exists.

Suggested sections:

- Added
- Changed
- Fixed
- Privacy
- Methodology
- Known limitations

## Public Development Narrative

The repo should show progress in this order:

1. Define the mission.
2. Define the privacy boundary.
3. Define the metadata schema.
4. Define the methodology.
5. Build the smallest local workflow.
6. Add personal reporting.
7. Add opt-in contribution.
8. Add public aggregate views.

This order matters because OpenSasa is a trust product. Trust must be visible in the project history before rankings, charts, or public claims appear.
