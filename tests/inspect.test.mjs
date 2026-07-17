import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildContributionPreviewInspection,
  buildLocalInspection,
  buildContributionPreview,
  formatContributionPreview,
  formatContributionPreviewJson,
  formatLocalInspection,
  formatLocalInspectionJson,
  validateContributionPreview,
} from "../dist/inspect.js";
import { localSessionSchema } from "../dist/schema.js";

const baseSession = localSessionSchema.parse({
  session_id: "session-123",
  timestamp: "2026-06-09T12:34:56.000Z",
  provider: "OpenAI",
  model_id: "gpt-5",
  model_version: "2026-06-01",
  tool: "Codex",
  task_type: "bug_fix",
  final_outcome: "accepted",
  work_mode: "manual_log",
  language: "TypeScript",
  framework: "Node.js",
  duration_seconds: 320,
  retry_count: 2,
  error_count: 0,
  input_tokens_estimate: 1200,
  output_tokens_estimate: 300,
  cached_tokens_estimate: 0,
  estimated_cost_usd: 0.42,
  cost_source: "estimated",
  repo_size_bucket: "small",
  file_count_bucket: "medium",
  changed_file_count_bucket: "tiny",
  lines_added_bucket: "small",
  lines_removed_bucket: "tiny",
  tests_outcome: "passed",
  contribution_consent: "granted",
});

test("builds a sanitized contribution preview", () => {
  const preview = buildContributionPreview(baseSession);

  assert.equal(preview.schema_version, "opensasa.metadata.v0");
  assert.equal(preview.payload_version, "v0.2.0");
  assert.match(preview.contribution_id, /^contrib_[0-9a-f]{16}$/);
  assert.notEqual(preview.contribution_id, "session-123");
  assert.equal(preview.timestamp_bucket, "2026-06-09");
  assert.equal(preview.provider, "OpenAI");
  assert.equal(preview.model_id, "gpt-5");
  assert.equal(preview.input_tokens_bucket, "large");
  assert.equal(preview.output_tokens_bucket, "medium");
  assert.equal(preview.cached_tokens_bucket, "zero");
  assert.equal(preview.estimated_cost_bucket, "under_1_usd");
  assert.equal(preview.duration_bucket, "5m_to_30m");
  assert.equal(preview.retry_count_bucket, "tiny");
  assert.equal(preview.error_count_bucket, "zero");
  assert.equal(preview.verified_success, true);
  assert.equal(preview.data_source, "manual");
  assert.equal(Object.hasOwn(preview, "session_id"), false);
  assert.equal(Object.hasOwn(preview, "timestamp"), false);
  assert.equal(Object.hasOwn(preview, "estimated_cost_usd"), false);
});

test("validates contribution preview fields", () => {
  const preview = buildContributionPreview(baseSession);
  const validation = validateContributionPreview(preview);

  assert.equal(validation.status, "passed");
  assert.equal(validation.checked_fields.includes("timestamp_bucket"), true);
  assert.deepEqual(validation.forbidden_fields_present, []);
});

test("flags forbidden contribution preview fields", () => {
  const validation = validateContributionPreview({
    schema_version: "opensasa.metadata.v0",
    payload_version: "v0.2.0",
    session_id: "session-123",
    timestamp: "2026-06-09T12:34:56.000Z",
  });

  assert.equal(validation.status, "failed");
  assert.deepEqual(validation.forbidden_fields_present, [
    "session_id",
    "timestamp",
  ]);
});

test("formats local inspection with local record and privacy boundary", () => {
  const output = formatLocalInspection(baseSession);

  assert.match(output, /OpenSasa Session Inspection/);
  assert.match(output, /session_id: session-123/);
  assert.match(output, /timestamp: 2026-06-09T12:34:56.000Z/);
  assert.match(output, /estimated_cost_usd: 0.42/);
  assert.match(output, /verified_success: true/);
  assert.match(output, /No source code stored/);
  assert.match(output, /No private prompts stored/);
});

test("builds and formats local inspection as JSON", () => {
  const inspection = buildLocalInspection(baseSession);
  const parsed = JSON.parse(formatLocalInspectionJson(baseSession));

  assert.equal(inspection.local_record.session_id, "session-123");
  assert.equal(inspection.local_record.verified_success, true);
  assert.deepEqual(parsed, inspection);
  assert.match(parsed.privacy_boundary.join("\n"), /No source code stored/);
});

test("formats contribution preview with no-upload status and excluded fields", () => {
  const output = formatContributionPreview(baseSession);

  assert.match(output, /OpenSasa Contribution Preview/);
  assert.match(output, /Status: preview only/);
  assert.match(output, /Consent: granted/);
  assert.match(output, /Upload enabled: no/);
  assert.match(output, /No upload will occur in this MVP/);
  assert.match(output, /Validation:/);
  assert.match(output, /payload_version: v0.2.0/);
  assert.match(output, /status: passed/);
  assert.match(output, /forbidden_fields_present: none/);
  assert.match(output, /timestamp_bucket: 2026-06-09/);
  assert.match(output, /estimated_cost_bucket: under_1_usd/);
  assert.match(output, /source code/);
  assert.match(output, /private prompts/);
  assert.doesNotMatch(output, /session_id: session-123/);
  assert.doesNotMatch(output, /timestamp: 2026-06-09T12:34:56.000Z/);
  assert.doesNotMatch(output, /estimated_cost_usd: 0.42/);
});

test("builds and formats contribution preview as JSON", () => {
  const inspection = buildContributionPreviewInspection(baseSession);
  const parsed = JSON.parse(formatContributionPreviewJson(baseSession));

  assert.equal(inspection.status, "preview only");
  assert.equal(inspection.consent, "granted");
  assert.equal(inspection.upload_enabled, false);
  assert.equal(inspection.destination, "none");
  assert.equal(inspection.validation.status, "passed");
  assert.deepEqual(inspection.validation.forbidden_fields_present, []);
  assert.equal(inspection.included_fields.timestamp_bucket, "2026-06-09");
  assert.equal(inspection.included_fields.estimated_cost_bucket, "under_1_usd");
  assert.equal(inspection.included_fields.verified_success, true);
  assert.equal(Object.hasOwn(inspection.included_fields, "session_id"), false);
  assert.deepEqual(parsed, inspection);
  assert.match(parsed.excluded_fields.join("\n"), /source code/);
});
