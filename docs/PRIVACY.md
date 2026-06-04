# Privacy Principles

OpenSasa is intended to be local-first and privacy-first by default.

The project is built around a clear trust boundary:

> No source code uploaded by default. No private prompts uploaded by default. No contribution without explicit developer consent.

These principles should guide product design, implementation, documentation, and review.

## Local-First Default

OpenSasa should provide value before any data leaves the developer's machine.

The default product experience should support:

- local session tracking,
- local reports,
- local metadata inspection,
- local cost and outcome summaries,
- and local control over contribution decisions.

Public contribution should be optional, inspectable, and reversible where possible.

## Explicit Consent

OpenSasa should not silently upload developer workflow data.

Before any contribution, the developer should be able to review:

- what metadata is included,
- what data is excluded,
- how the payload is anonymized,
- how the payload may affect public aggregate views,
- and whether contribution is enabled or disabled.

Consent should be specific to contribution. Using OpenSasa locally should not imply consent to share data.

## Excluded By Default

The following data should not be uploaded by default:

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
- terminal output that may contain code or credentials,
- private local notes,
- personally identifying information that is not required for contribution.

If future features introduce optional sharing beyond this boundary, those features must be opt-in and clearly documented before release.

## Safe Metadata

OpenSasa may collect and analyze safe metadata locally.

Safe metadata may include:

- model name or model ID,
- provider,
- coding tool or agent,
- task type,
- language,
- framework,
- timestamp bucket,
- repository size bucket,
- file count bucket,
- changed file count bucket,
- lines added or removed bucket,
- input token estimate,
- output token estimate,
- cached token estimate,
- estimated cost,
- duration,
- retry count,
- error count,
- test outcome,
- build outcome,
- lint or typecheck outcome,
- final outcome such as accepted, partially accepted, rejected, or unknown.

The public contribution payload should use coarse buckets where exact values could expose sensitive context.

## Inspect Before Share

OpenSasa should make contribution payloads inspectable before upload.

The inspection flow should show:

- included fields,
- excluded fields,
- anonymized values,
- schema version,
- destination,
- and contribution status.

The developer should be able to cancel before sharing.

## Data Minimization

OpenSasa should collect the minimum data needed to produce useful model intelligence.

When a product decision requires more data, the project should prefer:

1. local-only processing,
2. coarse metadata,
3. anonymized payloads,
4. explicit consent,
5. public documentation of the tradeoff.

## Methodology Transparency

Privacy and scoring are connected.

OpenSasa should make clear how contributed metadata is used in:

- aggregate model rankings,
- confidence labels,
- cost calculations,
- verified success metrics,
- retry burden,
- release drift analysis,
- and anti-gaming filters.

Developers should not have to guess how their contribution affects the public index.

## Review Requirements

Privacy-sensitive changes should receive stricter review.

Any change that affects data collection, storage, contribution, anonymization, consent, or public aggregation should answer:

- Does this preserve local-first behavior?
- Does this avoid source-code upload by default?
- Does this avoid private prompt upload by default?
- Does this avoid exact file path upload by default?
- Does this require explicit consent before contribution?
- Can the developer inspect what is shared?
- Is the public documentation accurate?

## Non-Negotiables

- No silent uploads.
- No source-code upload by default.
- No private prompt upload by default.
- No exact file path upload by default.
- No public ranking without confidence labels.
- No vendor-controlled methodology.
- No misleading claims about data scale or quality.

