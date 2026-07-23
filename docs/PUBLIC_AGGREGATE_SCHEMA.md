# Public Aggregate Schema

Status: draft contract for Phase 7 planning.

This document defines the first public aggregate schema for hosted OpenSasa
views. It does not approve ingestion, upload, accounts, sync, or real-data
public dashboards by itself. Those remain separate Phase 7 decisions.

The schema exists to make public views useful without implying false certainty
or exposing private contributor context.

## Design Rules

Public aggregate records must:

- be derived from accepted contribution payloads or seed data only;
- never store raw local sessions as public view records;
- include schema version and methodology version;
- include sample size and confidence label on every metric;
- preserve filters used to calculate a view;
- label data provenance as `seed`, `test`, `community`, or `vendor`;
- exclude source code, private prompts, model responses, exact paths, raw
  terminal output, repository names, organization names, customer names,
  secrets, API keys, and private local notes.

## Schema Versions

Initial public aggregate schema version:

```text
opensasa.public-aggregate.v0
```

Aggregate methodology version:

```text
opensasa.methodology.v0
```

Schema versions describe the shape of aggregate records. Methodology versions
describe formulas, thresholds, confidence labels, and bucket definitions used to
calculate those records.
Public methodology changes are tracked in
[`METHODOLOGY_CHANGELOG.md`](./METHODOLOGY_CHANGELOG.md).

## Aggregate View Record

An aggregate view record represents one public dashboard row, card, or chart
series point after contribution records have been grouped and summarized.

Required fields:

| Field | Type | Notes |
| --- | --- | --- |
| `schema_version` | string | Current value: `opensasa.public-aggregate.v0`. |
| `methodology_version` | string | Current value: `opensasa.methodology.v0`. |
| `aggregate_id` | string | Opaque generated ID. Must not expose contributor or repo identity. |
| `generated_at` | ISO timestamp | When this aggregate view was generated. |
| `data_provenance` | enum | `seed`, `test`, `community`, or `vendor`. |
| `view_type` | enum | `model_summary`, `tool_summary`, `task_type_summary`, `language_summary`, `framework_summary`, `daily_trend`, or `verification_summary`. |
| `filters` | object | Safe filters used to calculate the aggregate. |
| `group` | object | Safe grouping key for the row or series. |
| `metrics` | object | Aggregate metric values. |
| `quality` | object | Sample size, confidence label, and data-quality notes. |

## Safe Filters

Filters should use the same safe public dimensions as contribution payloads:

| Field | Notes |
| --- | --- |
| `provider` | Optional model provider filter. |
| `model_id` | Optional model ID or normalized model ID. |
| `tool` | Optional AI coding tool or agent. |
| `task_type` | Optional task type. |
| `language` | Optional language. |
| `framework` | Optional framework. |
| `repo_size_bucket` | Optional coarse repository-size bucket. |
| `file_count_bucket` | Optional coarse file-count bucket. |
| `changed_file_count_bucket` | Optional coarse changed-file-count bucket. |
| `lines_added_bucket` | Optional coarse lines-added bucket. |
| `lines_removed_bucket` | Optional coarse lines-removed bucket. |
| `data_source` | Optional `manual`, `imported`, `wrapper`, `sample`, or `unknown`. |
| `timestamp_bucket` | Optional day, week, or month bucket. |
| `data_provenance` | Optional `seed`, `test`, `community`, or `vendor`. |

Filters must not include exact repository names, exact file paths, organization
names, customer names, or other contributor-identifying values.

## Group Keys

Group keys identify what a metric row represents. Examples:

```json
{
  "dimension": "model_id",
  "value": "example-model"
}
```

```json
{
  "dimension": "task_type",
  "value": "bug_fix"
}
```

Group values must come from documented safe enums or normalized public labels.

## Metrics

Initial aggregate metrics:

| Field | Type | Notes |
| --- | --- | --- |
| `task_count` | integer | Count of accepted contribution records in the group. |
| `accepted_count` | integer | Count with final outcome `accepted`. |
| `partially_accepted_count` | integer | Count with final outcome `partially_accepted`. |
| `rejected_count` | integer | Count with final outcome `rejected`. |
| `unknown_outcome_count` | integer | Count with final outcome `unknown`. |
| `verified_success_count` | integer | Count with passing verification evidence. |
| `verification_unknown_count` | integer | Count where verification did not run or is unknown. |
| `estimated_cost_bucket_counts` | object | Counts by documented cost bucket. |
| `duration_bucket_counts` | object | Counts by documented duration bucket. |
| `retry_bucket_counts` | object | Counts by documented retry bucket. |
| `error_bucket_counts` | object | Counts by documented error bucket. |

Rates may be shown in public dashboards only when they include the denominator
and confidence label. Do not show a naked percentage without sample size.

## Quality Object

Required quality fields:

| Field | Type | Notes |
| --- | --- | --- |
| `sample_size` | integer | Number of accepted contribution records behind the metric. |
| `confidence_label` | enum | `insufficient`, `early`, `moderate`, or `strong`. |
| `data_quality_label` | enum | `seed`, `test`, `early`, `mixed`, or `reviewed`. |
| `minimum_sample_size_met` | boolean | Whether this view meets the configured public threshold. |
| `verification_share` | object | Numerator, denominator, and rate for records with known verification status. |
| `notes` | array of strings | Public-safe caveats, if any. |

Seed and test data must never be labeled as real community performance.

Initial confidence labels are calculated by
`calculatePublicAggregateQuality()` in `src/public-aggregate.ts`:

| Label | Initial rule |
| --- | --- |
| `insufficient` | Seed/test data, fewer than 30 accepted contribution records, no verification coverage, or less than 25% verification coverage. |
| `early` | At least 30 records, but fewer than 100 records or less than 50% verification coverage. |
| `moderate` | At least 100 records, but fewer than 500 records or less than 75% verification coverage. |
| `strong` | At least 500 records with at least 75% verification coverage. |

These thresholds are intentionally conservative and should be revised only with
a methodology version change and a
[`METHODOLOGY_CHANGELOG.md`](./METHODOLOGY_CHANGELOG.md) entry.

## Example

```json
{
  "schema_version": "opensasa.public-aggregate.v0",
  "methodology_version": "opensasa.methodology.v0",
  "aggregate_id": "agg_example_001",
  "generated_at": "2026-07-20T00:00:00.000Z",
  "data_provenance": "seed",
  "view_type": "model_summary",
  "filters": {
    "task_type": "bug_fix",
    "timestamp_bucket": "2026-W30",
    "data_provenance": "seed"
  },
  "group": {
    "dimension": "model_id",
    "value": "example-model"
  },
  "metrics": {
    "task_count": 24,
    "accepted_count": 12,
    "partially_accepted_count": 6,
    "rejected_count": 4,
    "unknown_outcome_count": 2,
    "verified_success_count": 10,
    "verification_unknown_count": 5,
    "estimated_cost_bucket_counts": {
      "under_1_usd": 18,
      "under_10_usd": 6
    },
    "duration_bucket_counts": {
      "1m_to_5m": 9,
      "5m_to_30m": 15
    },
    "retry_bucket_counts": {
      "zero": 10,
      "tiny": 14
    },
    "error_bucket_counts": {
      "zero": 20,
      "tiny": 4
    }
  },
  "quality": {
    "sample_size": 24,
    "confidence_label": "insufficient",
    "data_quality_label": "seed",
    "minimum_sample_size_met": false,
    "verification_share": {
      "numerator": 19,
      "denominator": 24,
      "rate": 0.7916666666666666
    },
    "notes": [
      "Seed data is illustrative and must not be interpreted as real model performance."
    ]
  }
}
```

## Validation Expectations

Future server-side validation should reject aggregate records that:

- omit schema version, methodology version, sample size, or confidence label;
- include excluded private fields;
- expose contributor, repository, organization, or customer identity;
- show rates without denominators;
- label seed or test data as community performance;
- use undocumented filters, groups, provenance labels, or metric names.

This schema should be updated before any public dashboard depends on a new field
or metric.

Abuse and anti-gaming rules for interpreting public aggregates are documented in
[`ABUSE_AND_ANTI_GAMING.md`](./ABUSE_AND_ANTI_GAMING.md).
