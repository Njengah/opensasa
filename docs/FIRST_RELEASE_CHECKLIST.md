# First Release Checklist

This checklist is for the first public OpenSasa beta release.

Current release target:

```text
v0.1.0-beta.1
```

Release boundary for `v0.1`:

- local-first CLI and local dashboard only,
- manual contribution export only,
- no upload destination,
- no contribution submission workflow,
- no hosted backend,
- and no public ranking claims from real contributed data.

## 1. Product Scope Freeze

- Confirm the release still matches the `v0.1` decision: manual export only.
- Confirm no upload or submission command has been introduced.
- Confirm the README, install guide, privacy docs, and roadmap all describe the same scope.
- Confirm any sample or seed data is labeled clearly as sample or synthetic.

## 2. Verification Evidence

- Confirm the Release Checks workflow passed for the release PR or latest `main` push.
- Run `npm test`.
- Run `npm pack --dry-run --json`.
- Verify the packed npm artifact includes the `opensasa` bin and excludes development-only directories.
- Run `node ./dist/index.js --help`.
- Run `opensasa --help` from a linked local install if release instructions mention `npm link`.
- Note: the Release Checks workflow is CI evidence only; it does not publish packages, create tags, or upload release artifacts.
- The root `npm test` command also covers the VS Code extension check.

## 3. Local Workflow Smoke Test

- Log a sample session with safe metadata only.
- Run `opensasa sessions`.
- Run `opensasa report`.
- Run `opensasa inspect <session-id>`.
- Run `opensasa inspect <session-id> --contribution`.
- Run `opensasa export <session-id> --out ./contribution.json --yes`.
- Confirm the no-upload language still appears in contribution preview and export flows.

## 4. Documentation Review

- Confirm [`README.md`](../README.md) explains value, privacy, and current limitations.
- Confirm [`docs/INSTALL.md`](./INSTALL.md) still works end to end.
- Confirm [`docs/DEMO_WALKTHROUGH.md`](./DEMO_WALKTHROUGH.md) still matches the seeded demo flow.
- Confirm [`docs/SHARING_BOUNDARY.md`](./SHARING_BOUNDARY.md) matches actual product behavior.
- Confirm [`docs/PRIVACY.md`](./PRIVACY.md) still matches local-first defaults.
- Confirm [`docs/METADATA_SCHEMA.md`](./METADATA_SCHEMA.md) matches the current payload and export metadata.
- Confirm [`docs/PROJECT_SNAPSHOT.md`](./PROJECT_SNAPSHOT.md) matches what currently runs.

## 5. Release Notes Draft

- Prepare a short release title.
- Summarize user-facing additions.
- Summarize privacy-relevant changes.
- Summarize methodology or schema changes.
- State known limitations directly.
- State the next milestone after the beta.

Suggested release note outline:

- release title
- short summary
- user-facing changes
- privacy changes
- methodology changes
- known limitations
- next milestone

## 6. Packaging And Tagging Readiness

- Confirm `package.json` version is the intended pre-release version.
- Confirm the root `LICENSE` file is present.
- Confirm `CHANGELOG.md` is updated if the release process is using it.
- Confirm release branch/tag naming is consistent with [`docs/DEVELOPMENT_CYCLE.md`](./DEVELOPMENT_CYCLE.md).
- Confirm the repo is ready for the `v0.1.0-beta.1` tag only after the remaining Phase 6 docs and assets are complete.

## 7. Not Ready Means Do Not Tag

Do not create the beta tag yet if any of these are still missing:

- install docs,
- first release checklist review,
- demo walkthrough,
- screenshots or dashboard preview images,
- architecture doc,
- security/privacy FAQ,
- CI release checks,
- or the release notes and launch narrative needed for a credible public beta.
