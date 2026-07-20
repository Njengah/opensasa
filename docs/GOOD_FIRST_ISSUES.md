# Good First Issues

This guide explains how OpenSasa maintainers should label approachable first
contributions, and how new contributors should choose a small, reviewable
issue.

OpenSasa is still in the `v0.1` local-first, manual-export beta track. Good
first issues should help make the current CLI, dashboard, VS Code extension,
docs, tests, or privacy model easier to understand without changing the
product's sharing boundary.

## What Qualifies

A good first issue should be narrow, well-scoped, and safe to review in one
sitting. It should usually fit one of these shapes:

- clarify an existing doc page or README section;
- add a missing test around already-shipped behavior;
- improve wording for local-first, privacy, install, or demo flows;
- fix a small CLI help text or error-message inconsistency;
- add a tiny dashboard or VS Code extension polish item with a clear expected
  result;
- update examples that use synthetic data only.

The issue should include:

- the affected file or command;
- the intended outcome;
- any privacy or methodology constraint;
- the expected verification command;
- a note that examples must be synthetic and safe for public review.

## What Does Not Qualify

Do not label an issue as `good first issue` when it requires broad product
judgment, hidden context, or privacy-sensitive design.

Avoid the label for:

- storage migrations;
- contribution payload schema changes;
- upload, sync, hosted backend, or public aggregate behavior;
- security-sensitive fixes that need private disclosure first;
- large refactors across unrelated modules;
- changes to scoring methodology without prior design discussion;
- issues that require real private databases, prompts, source code, terminal
  output, or exported payload contents to reproduce.

Use `help wanted`, `needs design`, `privacy`, or `methodology` instead when an
issue is useful but not beginner-ready.

## Recommended Label Taxonomy

The repository can use these labels to keep early public contributions clear:

| Label | Use |
| --- | --- |
| `good first issue` | Small, well-defined work suitable for a first PR. |
| `help wanted` | Useful work where maintainers want outside help. |
| `documentation` | README, docs, examples, or public explanation changes. |
| `privacy` | Local-first behavior, consent, export, disclosure, or data-boundary work. |
| `methodology` | Scoring, confidence, sampling, anti-gaming, or metric interpretation. |
| `cli` | CLI commands, flags, help text, validation, or terminal output. |
| `dashboard` | Local dashboard server, UI, or report visualization work. |
| `vscode-extension` | VS Code extension commands, status bar, settings, or extension docs. |
| `tests` | Test coverage, fixtures, smoke checks, or verification cleanup. |
| `release` | Packaging, changelog, tagging, or release-readiness work. |
| `needs design` | Requires product, privacy, or methodology agreement before implementation. |
| `blocked` | Cannot move until a dependency or decision is resolved. |

The optional `.github/labels.yml` file documents the intended labels for
maintainers. It does not apply labels automatically unless a separate label
sync workflow is added later.

## How To Pick One

Before starting:

1. Read the linked issue and confirm the affected files.
2. Check `README.md`, `CONTRIBUTING.md`, and relevant docs for existing
   language.
3. Ask for clarification if the issue would change local storage,
   contribution export, consent, or public reporting.
4. Keep the first PR small. If the fix grows into multiple concerns, split it.
5. Use synthetic examples only.

For documentation-only work, a good first PR often changes one doc plus one
small test that guards the link or public wording. For code work, prefer one
command, one module, or one UI behavior at a time.

## Verification Expectations

Every PR should include fresh verification evidence.

For documentation and template changes, use the most relevant targeted test,
often:

```bash
node --test tests/package.test.mjs
```

For product changes, run the relevant test or full suite:

```bash
npm test
```

Do not claim behavior is fixed or implemented without a command that proves the
claim.

## Privacy Boundary

Public issues and pull requests must not include secrets, source code, private
prompts, model responses, exact source or project paths, raw terminal output,
customer or company names, credentials, or private exported payload contents.

If an issue needs sensitive details to reproduce, do not label it as a normal
good first issue. Ask maintainers for a private disclosure path first, then
create a public follow-up only after the safe scope is clear.

