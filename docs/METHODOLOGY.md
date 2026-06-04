# Methodology

This document defines the first draft of the OpenSasa methodology.

OpenSasa should help developers understand which AI coding models work in real software engineering workflows. The methodology must be open, inspectable, privacy-aware, and resistant to inflated claims.

This is not a final scoring contract. It is the foundation for future implementation, public review, and iteration.

## Methodology Principles

OpenSasa should measure practical usefulness, not raw model popularity.

The methodology should:

- use multiple visible metrics instead of one universal score,
- separate local personal reports from public aggregate claims,
- show confidence levels next to public comparisons,
- reward verified outcomes more than unverified claims,
- avoid rewarding token burn, raw usage volume, or repetitive low-quality sessions,
- label seed, sample, vendor-submitted, and community-contributed data clearly,
- and preserve the privacy boundary defined in `docs/PRIVACY.md`.

## Measurement Unit

The core unit of measurement is an AI-assisted coding session.

A session should represent one coherent workflow, such as:

- fixing a bug,
- implementing a feature,
- refactoring code,
- generating tests,
- debugging a failure,
- writing documentation,
- reviewing code,
- or completing setup work.

Sessions should use the metadata fields defined in `docs/METADATA_SCHEMA.md`.

## Outcome Definitions

### Accepted

An outcome is `accepted` when the developer keeps the AI-assisted result with no material rework.

Small formatting changes, naming tweaks, or normal integration edits may still count as accepted.

### Partially Accepted

An outcome is `partially_accepted` when the result was useful but required material edits, only part of it was used, or the AI output helped the developer reach the final answer indirectly.

### Rejected

An outcome is `rejected` when the result was not used.

Rejected sessions should still count in cost, retry, and failure metrics.

### Unknown

An outcome is `unknown` when the developer did not record whether the result was useful.

Unknown outcomes should not be treated as success in public scoring.

## Verified Success

Verified success should mean the session produced a useful outcome and has supporting verification evidence.

Initial rule:

```text
verified_success = useful_outcome AND passing_verification_evidence
```

Where:

- `useful_outcome` means `accepted` or `partially_accepted`,
- `passing_verification_evidence` means at least one relevant check passed,
- relevant checks may include tests, build, lint, typecheck, or manual review,
- raw terminal output should not be required or uploaded.

For public aggregate views, verified success should be shown separately from task success. A model can have a high task success rate but lower verified success if users do not run checks.

## Core Metrics

### Task Success Rate

The share of sessions with a useful outcome.

```text
task_success_rate = accepted_or_partially_accepted_sessions / total_known_outcome_sessions
```

Exclude `unknown` outcomes from the denominator for this metric, but show the unknown outcome rate separately.

### Verified Success Rate

The share of known-outcome sessions that were useful and verified.

```text
verified_success_rate = verified_success_sessions / total_known_outcome_sessions
```

This should be the preferred quality signal when enough verified data exists.

### Cost Per Useful Task

The estimated spend required to produce a useful outcome.

```text
cost_per_useful_task = total_estimated_cost / accepted_or_partially_accepted_sessions
```

Rejected sessions stay in `total_estimated_cost`, because wasted spend matters.

If cost is unknown for many sessions, public views should show a low confidence label or suppress this metric.

### Retry Burden

The average number of retries or follow-up attempts before useful output.

```text
retry_burden = total_retry_count / accepted_or_partially_accepted_sessions
```

Rejected sessions may also be summarized separately as failure retry burden.

### Failure Cost

The estimated spend on rejected or failed sessions.

```text
failure_cost = total_estimated_cost_for_rejected_sessions
```

This helps reveal models or workflows that look cheap per token but waste money through failed attempts.

### Speed To Useful Output

The median duration for useful sessions.

```text
speed_to_useful_output = median_duration_for_accepted_or_partially_accepted_sessions
```

Median should be preferred over average because coding sessions can vary widely.

### Model Stickiness

Whether developers continue using a model after trying it.

This should not be used in early public scoring until enough longitudinal data exists.

### Release Impact

The before-and-after movement of a model after a known release or version change.

Release impact should compare the same task types where possible and should not be shown without confidence labels.

## Confidence Model

Public comparisons must show confidence labels. OpenSasa should not publish rankings that imply precision the data does not support.

Initial confidence labels:

| Label | Meaning |
| --- | --- |
| `insufficient` | Not enough known-outcome sessions to support a public comparison. |
| `early` | Directional signal only. Sample size or verification quality is limited. |
| `moderate` | Useful signal with enough data for cautious comparison. |
| `strong` | Higher-confidence signal with stronger sample size, verification, and diversity. |

Confidence should consider:

- number of sessions,
- number of distinct contributors,
- share of verified sessions,
- unknown outcome rate,
- cost coverage,
- task-label clarity,
- data source mix,
- recency,
- and concentration risk from one user, team, vendor, or tool.

Numeric thresholds should be defined later after reviewing real data.

## Data Quality Weighting

OpenSasa should separate raw counts from quality-weighted signals.

Higher-quality sessions may include:

- clear task type,
- known model and provider,
- known final outcome,
- passing verification evidence,
- cost estimate with a documented source,
- reasonable retry count,
- and contribution payload validated against the metadata schema.

Lower-quality sessions may include:

- unknown outcome,
- unknown model version,
- missing cost data,
- no verification evidence,
- vague task type,
- imported data with uncertain provenance,
- or suspicious repeated patterns.

Data-quality weighting should be published before it affects public rankings.

## Filtering Rules

Public aggregate views should be filterable by:

- task type,
- language,
- framework,
- provider,
- model,
- coding tool or agent,
- data source,
- time period,
- and confidence level.

OpenSasa should prefer task-specific comparisons over broad global rankings.

Example:

```text
GPT-5.2 vs Claude Sonnet 4.5 for TypeScript bug fixing
```

This is more useful than claiming one model is universally best.

## Anti-Gaming Rules

OpenSasa should not reward raw usage volume.

Signals that should be discounted or flagged:

- inflated task counts,
- repeated near-identical sessions,
- suspiciously high success rates without verification,
- high-volume submissions from one source,
- vendor-submitted data without clear labeling,
- synthetic or seed data mixed into community data,
- and sessions that appear designed only to influence a ranking.

Signals that should improve trust:

- verified sessions,
- diverse contributors,
- clear task labels,
- transparent data source labeling,
- reproducible methodology feedback,
- and privacy-safe open-source contributions.

## Vendor And Seed Data

Vendor-submitted data, synthetic data, and seed data may be useful for testing displays or methodology, but they must be labeled.

Initial data source labels:

- `community`
- `personal`
- `team`
- `vendor_submitted`
- `seed`
- `synthetic`
- `unknown`

Seed and synthetic data should not be presented as real community signal.

Vendor-submitted data should not control methodology, thresholds, or ranking definitions.

## Public Reporting Rules

Public reports should:

- show sample size labels,
- show confidence labels,
- explain metric definitions,
- separate verified and unverified outcomes,
- label early or seed data clearly,
- avoid inflated claims,
- and link back to the current methodology and metadata schema.

Public reports should not:

- claim a universal best model from limited data,
- hide unknown outcome rates,
- mix private and public data,
- imply source code was inspected,
- or publish rankings without confidence labels.

## Privacy Constraints

Methodology and privacy are linked.

Scoring should work from safe metadata only. It should not require:

- source code,
- private prompts,
- model responses,
- exact file paths,
- repository names,
- company names,
- secrets,
- API keys,
- raw terminal output,
- or private local notes.

When exact values could expose sensitive context, public payloads should use buckets.

## Open Questions

- What numeric thresholds should define each confidence level?
- What minimum verification evidence is required for `verified_success` by task type?
- Should manual review alone ever count as verification for public aggregate views?
- How should cost estimates be normalized across providers and hidden-token tools?
- How should model aliases and version names be canonicalized?
- What sample size is required before showing task-specific rankings?
- How should OpenSasa detect repeated low-quality or manipulative submissions?
- How should release impact be measured when model providers change names or silently update models?

