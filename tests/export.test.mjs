import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { writeContributionExport } from "../dist/export.js";
import { localSessionSchema } from "../dist/schema.js";

const forbiddenContributionKeys = [
  "session_id",
  "timestamp",
  "estimated_cost_usd",
  "duration_seconds",
  "retry_count",
  "error_count",
  "input_tokens_estimate",
  "output_tokens_estimate",
  "cached_tokens_estimate",
  "prompt",
  "source_code",
  "model_response",
  "terminal_output",
  "file_path",
  "repository_name",
  "organization_name",
  "company_name",
  "customer_name",
  "secret",
  "api_key",
  "private_notes",
];

const tmpRoot = mkdtempSync(join(tmpdir(), "opensasa-export-"));

after(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

const baseSession = localSessionSchema.parse({
  session_id: "session-export-123",
  timestamp: "2026-06-09T12:34:56.000Z",
  provider: "OpenAI",
  model_id: "gpt-5",
  tool: "Codex",
  task_type: "bug_fix",
  final_outcome: "accepted",
  work_mode: "manual_log",
  tests_outcome: "passed",
  input_tokens_estimate: 1200,
  estimated_cost_usd: 0.42,
  contribution_consent: "granted",
});

test("writes a sanitized contribution payload JSON file", () => {
  const outputPath = join(tmpRoot, "nested", "contribution.json");
  const result = writeContributionExport(baseSession, outputPath);
  const payload = JSON.parse(readFileSync(outputPath, "utf8"));

  assert.equal(result.status, "exported");
  assert.equal(result.session_id, "session-export-123");
  assert.match(result.contribution_id, /^contrib_[0-9a-f]{16}$/);
  assert.equal(result.payload_version, "v0.2.0");
  assert.equal(result.path, outputPath);
  assert.equal(result.validation.status, "passed");
  assert.deepEqual(result.validation.missing_required_fields, []);
  assert.deepEqual(result.validation.forbidden_fields_present, []);
  assert.deepEqual(result.validation.unknown_fields_present, []);
  assert.equal(payload.payload_version, "v0.2.0");
  assert.equal(payload.contribution_id, result.contribution_id);
  assert.equal(payload.provider, "OpenAI");
  assert.equal(payload.estimated_cost_bucket, "under_1_usd");
  assert.equal(Object.hasOwn(payload, "session_id"), false);
  assert.equal(Object.hasOwn(payload, "timestamp"), false);
});

test("exported payload excludes every forbidden contribution field", () => {
  const outputPath = join(tmpRoot, "nested", "contribution-red-team.json");
  writeContributionExport(baseSession, outputPath);
  const payload = JSON.parse(readFileSync(outputPath, "utf8"));

  for (const key of forbiddenContributionKeys) {
    assert.equal(Object.hasOwn(payload, key), false);
  }
});
