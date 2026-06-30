# Methodology Examples

These examples show how OpenSasa report metrics should be interpreted before
any public index or upload flow exists.

The examples use seed data only. They are not claims about real model
performance, public rankings, or community contribution quality.

## Example A: Useful And Verified

Input sessions:

| Provider | Model | Task | Outcome | Tests | Cost | Duration | Retries |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OpenAI | gpt-5 | bug_fix | accepted | passed | $0.40 | 300s | 1 |
| OpenAI | gpt-5 | feature | partially_accepted | passed | $0.60 | 900s | 2 |
| OpenAI | gpt-5 | documentation | accepted | not_run | $0.10 | 120s | 0 |

Interpretation:

- Task success rate is high because all known outcomes are useful.
- Verified success rate is lower than task success rate because documentation
  was accepted without passing verification evidence.
- Cost per useful task includes all three costs because all sessions were
  useful.
- Speed to useful output should use the median useful duration, not the average.

Expected report posture:

```text
Useful outcome rate: high
Verified success rate: lower than useful outcome rate
Unknown outcome rate: 0%
Confidence: insufficient or early, depending on sample size
```

## Example B: Unknown Outcomes Reduce Confidence

Input sessions:

| Provider | Model | Task | Outcome | Tests | Cost | Duration | Retries |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Anthropic | claude-sonnet-4.5 | bug_fix | accepted | passed | $0.35 | 240s | 1 |
| Anthropic | claude-sonnet-4.5 | refactor | unknown | unknown | unknown | unknown | unknown |
| Anthropic | claude-sonnet-4.5 | feature | unknown | unknown | $0.90 | 1800s | 4 |

Interpretation:

- Unknown outcomes are excluded from useful outcome rate denominators.
- Unknown outcome rate must still be shown directly.
- Cost and duration metrics should be treated cautiously because coverage is
  incomplete.
- This should not support a strong public comparison.

Expected report posture:

```text
Useful outcome rate: based only on known outcomes
Unknown outcome rate: high
Cost coverage: incomplete
Confidence: insufficient
```

## Example C: Cheap But Wasteful

Input sessions:

| Provider | Model | Task | Outcome | Tests | Cost | Duration | Retries |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Local | small-local-model | bug_fix | rejected | failed | $0.02 | 600s | 5 |
| Local | small-local-model | feature | rejected | failed | $0.03 | 1200s | 6 |
| Local | small-local-model | documentation | accepted | not_run | $0.01 | 300s | 1 |

Interpretation:

- Low cost does not imply good workflow performance.
- Failure cost is low in absolute dollars but the rejected sessions show high
  retry burden.
- The accepted documentation session is useful but unverified.
- A public comparison should not reward the model for being cheap if it wastes
  developer time.

Expected report posture:

```text
Useful outcome rate: low
Verified success rate: 0%
Failure retry burden: high
Confidence: insufficient or early
```

## Example D: Good Personal Report, Not Public Evidence

Input sessions:

| Provider | Model | Task | Outcome | Tests | Cost | Duration | Retries |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OpenAI | gpt-5 | setup | accepted | passed | $0.20 | 180s | 0 |
| OpenAI | gpt-5 | setup | accepted | passed | $0.15 | 210s | 0 |

Interpretation:

- This is useful personal evidence for one developer and one task type.
- It is not enough for a public claim about the model.
- Public methodology should require more samples, contributor diversity, and
  task diversity before showing moderate or strong confidence.

Expected report posture:

```text
Personal report: useful
Public comparison: insufficient sample
Confidence: insufficient
```

## Example E: Contribution Preview Remains Local

A session with `contribution_consent = granted` may show that local consent was
recorded, but the MVP still has:

- no upload destination,
- no submission command,
- no hosted backend,
- no public ranking side effect.

Interpretation:

- Consent state is visible so a user can reason about future sharing.
- The contribution preview must still show `upload_enabled: false`.
- Validation must still reject forbidden raw fields before any future
  contribution flow exists.

Expected report posture:

```text
Contribution state: inspectable
Upload behavior: disabled
Privacy boundary: preserved
```
