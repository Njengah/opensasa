import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { buildContributionPreview, validateContributionPreview } from "../dist/inspect.js";
import { localSessionSchema } from "../dist/schema.js";

const sampleContributionSession = localSessionSchema.parse({
  session_id: "sample-session-001",
  timestamp: "2026-06-09T12:34:56.000Z",
  provider: "OpenAI",
  model_id: "gpt-5",
  model_version: "2026-06",
  tool: "Codex",
  task_type: "bug_fix",
  final_outcome: "accepted",
  work_mode: "manual_log",
  language: "TypeScript",
  framework: "Node.js",
  duration_seconds: 840,
  retry_count: 1,
  error_count: 0,
  input_tokens_estimate: 1200,
  output_tokens_estimate: 800,
  cached_tokens_estimate: 200,
  estimated_cost_usd: 0.42,
  repo_size_bucket: "medium",
  file_count_bucket: "small",
  changed_file_count_bucket: "small",
  lines_added_bucket: "small",
  lines_removed_bucket: "tiny",
  tests_outcome: "passed",
  build_outcome: "passed",
  lint_outcome: "unknown",
  typecheck_outcome: "passed",
  contribution_consent: "granted",
});

test("checked-in sample contribution payload matches the current exporter output", () => {
  const samplePath = join(process.cwd(), "docs", "examples", "sample-contribution-payload.json");
  const samplePayload = JSON.parse(readFileSync(samplePath, "utf8"));
  const expectedPayload = buildContributionPreview(sampleContributionSession);
  const validation = validateContributionPreview(samplePayload);

  assert.deepEqual(samplePayload, expectedPayload);
  assert.equal(validation.status, "passed");
  assert.deepEqual(validation.missing_required_fields, []);
  assert.deepEqual(validation.forbidden_fields_present, []);
  assert.deepEqual(validation.unknown_fields_present, []);
});
