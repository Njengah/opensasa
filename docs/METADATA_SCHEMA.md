# Metadata Schema

This document defines the first draft of the OpenSasa metadata schema.

The schema exists to support local AI coding workflow reports and, later, opt-in public aggregate intelligence. It should preserve the project's privacy boundary:

> No source code uploaded by default. No private prompts uploaded by default. No contribution without explicit developer consent.

This is a planning schema, not a final implementation contract. Product code should treat the schema as versioned from the beginning.

## Schema Goals

The schema should make it possible to measure:

- model usage by task type,
- estimated cost,
- retries and failed attempts,
- accepted or rejected outcomes,
- test, build, lint, and typecheck outcomes,
- cost per useful task,
- verified success rate,
- language and framework breakdown,
- and confidence for public aggregate views.

The schema should not collect private implementation details when coarse metadata is enough.

## Schema Version

Every persisted record and contribution payload should include a schema version.

Initial draft:

```text
opensasa.metadata.v0
```

Future versions should be backward compatible where possible. Breaking changes should be documented in methodology and release notes.

## Local Data Model

Local data may be more detailed than the public contribution payload, but it must still avoid storing unnecessary private data.

### Session

A session represents one AI-assisted coding workflow.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `schema_version` | string | yes | Example: `opensasa.metadata.v0`. |
| `session_id` | string | yes | Locally generated opaque ID. |
| `started_at` | datetime | yes | Stored locally. Public payload should use a bucket. |
| `ended_at` | datetime | no | Optional until session closes. |
| `duration_seconds` | integer | no | Can be derived from start and end time. |
| `tool` | string | no | Coding tool or agent, such as Codex, Claude Code, Cursor, or manual. |
| `provider` | string | yes | Model provider, such as OpenAI, Anthropic, Google, or local. |
| `model_id` | string | yes | Provider model identifier if known. |
| `model_version` | string | no | Specific release/version if known. |
| `task_type` | enum | yes | See task type values below. |
| `user_task_label` | string | no | Local-only short label. Do not contribute by default. |
| `language` | string | no | Primary language if known. |
| `framework` | string | no | Primary framework if known. |
| `repo_size_bucket` | enum | no | Coarse bucket only. |
| `file_count_bucket` | enum | no | Coarse bucket only. |
| `changed_file_count_bucket` | enum | no | Coarse bucket only. |
| `lines_added_bucket` | enum | no | Coarse bucket only. |
| `lines_removed_bucket` | enum | no | Coarse bucket only. |
| `retry_count` | integer | no | Number of retries or follow-up attempts. |
| `error_count` | integer | no | Number of tool/model/workflow errors observed. |
| `final_outcome` | enum | yes | `accepted`, `partially_accepted`, `rejected`, or `unknown`. |
| `notes` | string | no | Local-only. Never contributed by default. |

### Model Usage

Model usage captures cost and token estimates for a session.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `usage_id` | string | yes | Locally generated opaque ID. |
| `session_id` | string | yes | Links to the local session. |
| `input_tokens_estimate` | integer | no | Use estimate when tools hide exact counts. |
| `output_tokens_estimate` | integer | no | Use estimate when tools hide exact counts. |
| `cached_tokens_estimate` | integer | no | Optional if available. |
| `estimated_cost_usd` | number | no | Estimated cost for the session or model call group. |
| `latency_ms` | integer | no | Optional, only if available without invasive logging. |
| `cost_source` | enum | no | `provider_usage`, `tool_reported`, `estimated`, or `unknown`. |

### Task

Task metadata describes the work without exposing code.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `task_id` | string | yes | Locally generated opaque ID. |
| `session_id` | string | yes | Links to the local session. |
| `task_type` | enum | yes | Shared with the session for easier reporting. |
| `complexity_bucket` | enum | no | Coarse estimate. |
| `change_scope` | enum | no | `single_file`, `multi_file`, `cross_module`, or `unknown`. |
| `work_mode` | enum | no | `manual_log`, `cli_wrapper`, `tool_import`, `agent_log`, or `unknown`. |

### Verification

Verification records whether the result was checked.

The schema should store outcomes, not raw terminal output.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `verification_id` | string | yes | Locally generated opaque ID. |
| `session_id` | string | yes | Links to the local session. |
| `tests_outcome` | enum | no | `passed`, `failed`, `not_run`, or `unknown`. |
| `build_outcome` | enum | no | `passed`, `failed`, `not_run`, or `unknown`. |
| `lint_outcome` | enum | no | `passed`, `failed`, `not_run`, or `unknown`. |
| `typecheck_outcome` | enum | no | `passed`, `failed`, `not_run`, or `unknown`. |
| `manual_review_outcome` | enum | no | `accepted`, `partially_accepted`, `rejected`, or `unknown`. |
| `verified_success` | boolean | no | True when useful outcome has passing verification evidence. |
| `verification_source` | enum | no | `manual`, `command_exit_code`, `tool_reported`, or `unknown`. |

## Enum Drafts

### Task Type

Initial values:

- `bug_fix`
- `feature`
- `frontend_ui`
- `refactor`
- `test_generation`
- `documentation`
- `code_review`
- `debugging`
- `migration`
- `dependency_update`
- `performance`
- `security`
- `data_analysis`
- `setup`
- `other`
- `unknown`

### Outcome

Initial values:

- `accepted`
- `partially_accepted`
- `rejected`
- `unknown`

`accepted` means the developer kept the result with no material rework.

`partially_accepted` means the result was useful but required material edits or only part of it was used.

`rejected` means the result was not used.

`unknown` means the user did not record the outcome.

### Verification Outcome

Initial values:

- `passed`
- `failed`
- `not_run`
- `unknown`

`not_run` means the developer explicitly did not run that check.

`unknown` means OpenSasa does not know whether that check ran.

### Buckets

Exact values can expose sensitive context. Public contribution payloads should prefer buckets.

Initial size buckets:

- `tiny`
- `small`
- `medium`
- `large`
- `very_large`
- `unknown`

Implementation docs should later define numeric ranges for each bucket.

## Contribution Payload

The contribution payload is a sanitized subset of local data. It should be generated only after explicit consent and should be inspectable before upload.

### Allowed By Default

The public contribution payload may include:

| Field | Notes |
| --- | --- |
| `schema_version` | Required. |
| `contribution_id` | Opaque generated ID. Must not expose local path or repo identity. |
| `timestamp_bucket` | Example: day, week, or month bucket. |
| `provider` | Safe model metadata. |
| `model_id` | Safe model metadata. |
| `model_version` | Optional if known. |
| `tool` | Coding tool or agent. |
| `task_type` | Coarse task type. |
| `language` | Optional. |
| `framework` | Optional. |
| `repo_size_bucket` | Coarse only. |
| `file_count_bucket` | Coarse only. |
| `changed_file_count_bucket` | Coarse only. |
| `lines_added_bucket` | Coarse only. |
| `lines_removed_bucket` | Coarse only. |
| `input_tokens_bucket` | Prefer bucket for public payload. |
| `output_tokens_bucket` | Prefer bucket for public payload. |
| `cached_tokens_bucket` | Optional. |
| `estimated_cost_bucket` | Prefer bucket for public payload. |
| `duration_bucket` | Prefer bucket for public payload. |
| `retry_count_bucket` | Prefer bucket for public payload. |
| `error_count_bucket` | Prefer bucket for public payload. |
| `tests_outcome` | Outcome only, no command output. |
| `build_outcome` | Outcome only, no command output. |
| `lint_outcome` | Outcome only, no command output. |
| `typecheck_outcome` | Outcome only, no command output. |
| `final_outcome` | Accepted, partially accepted, rejected, or unknown. |
| `verified_success` | Derived boolean. |
| `data_source` | `manual`, `imported`, `wrapper`, `sample`, or `unknown`. |

### Excluded By Default

The contribution payload must not include:

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
- terminal output,
- private local notes,
- personally identifying information that is not required for contribution.

## Inspect-Before-Share Requirements

Before contribution, OpenSasa should show:

- included fields,
- excluded fields,
- anonymized or bucketed values,
- schema version,
- destination,
- contribution status,
- and whether consent is enabled.

The user must be able to cancel before sharing.

## Validation Requirements

Implementations should validate records at these boundaries:

- before writing local records,
- before generating reports,
- before generating a contribution payload,
- before accepting public aggregate data,
- and before using data in public scoring.

Contribution validation should reject payloads containing excluded fields or raw terminal output.

## Open Questions

- What numeric ranges should define repo size, file count, changed file count, lines changed, token, cost, retry, and duration buckets?
- Should timestamp buckets be daily, weekly, or monthly for public contribution?
- How should cost be estimated when tools hide token usage?
- Should model aliases normalize into canonical model IDs?
- How should vendor-submitted or synthetic seed data be labeled?
- What minimum evidence is required for `verified_success`?

