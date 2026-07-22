import assert from "node:assert/strict";
import { test } from "node:test";
import { validateServerContributionPayload } from "../dist/contribution-validation.js";

const validPayload = {
  schema_version: "opensasa.metadata.v0",
  payload_version: "v0.2.0",
  contribution_id: "contrib_validation_123",
  timestamp_bucket: "2026-07-22",
  provider: "OpenAI",
  model_id: "gpt-5",
  task_type: "feature",
  input_tokens_bucket: "small",
  output_tokens_bucket: "tiny",
  cached_tokens_bucket: "unknown",
  estimated_cost_bucket: "under_1_usd",
  duration_bucket: "5m_to_30m",
  retry_count_bucket: "zero",
  error_count_bucket: "zero",
  tests_outcome: "passed",
  build_outcome: "passed",
  lint_outcome: "not_run",
  typecheck_outcome: "passed",
  final_outcome: "accepted",
  verified_success: true,
  data_source: "manual",
};

test("passes a valid contribution payload contract", () => {
  const validation = validateServerContributionPayload(validPayload);

  assert.equal(validation.status, "passed");
  assert.deepEqual(validation.issues, []);
  assert.equal(validation.summary.issue_count, 0);
});

test("reports field-level validation issues as server-side issues", () => {
  const validation = validateServerContributionPayload({
    ...validPayload,
    source_code: "private",
    unexpected: true,
  });

  assert.equal(validation.status, "failed");
  assert.equal(validation.summary.forbidden_field_count, 1);
  assert.equal(validation.summary.unknown_field_count, 1);
  assert.ok(validation.issues.some((issue) => issue.code === "forbidden_field" && issue.field === "source_code"));
  assert.ok(validation.issues.some((issue) => issue.code === "unknown_field" && issue.field === "unexpected"));
});

test("reports value-level validation issues", () => {
  const validation = validateServerContributionPayload({
    ...validPayload,
    schema_version: "opensasa.metadata.v999",
    task_type: "private_customer_project",
    duration_bucket: "three_hours_exact",
    verified_success: "true",
    timestamp_bucket: "2026-07-22T12:00:00.000Z",
    model_id: "customer-acme-model",
  });

  assert.equal(validation.status, "failed");
  assert.equal(validation.summary.invalid_version_count, 1);
  assert.equal(validation.summary.invalid_enum_count, 1);
  assert.equal(validation.summary.invalid_bucket_count, 1);
  assert.equal(validation.summary.invalid_type_count, 1);
  assert.equal(validation.summary.invalid_format_count, 1);
  assert.equal(validation.summary.private_marker_count, 1);
});

test("rejects wrong-type task type values", () => {
  const validation = validateServerContributionPayload({
    ...validPayload,
    task_type: 123,
  });

  assert.equal(validation.status, "failed");
  assert.ok(validation.issues.some((issue) => issue.code === "invalid_type" && issue.field === "task_type"));
});

test("rejects non-object payloads", () => {
  const validation = validateServerContributionPayload(["not", "object"]);

  assert.equal(validation.status, "failed");
  assert.deepEqual(validation.issues, [
    {
      code: "invalid_type",
      field: "$",
      message: "Payload must be a JSON object.",
    },
  ]);
});
