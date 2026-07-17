import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { writeContributionExport } from "../dist/export.js";
import { localSessionSchema } from "../dist/schema.js";

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
  assert.equal(result.path, outputPath);
  assert.equal(payload.payload_version, "v0.2.0");
  assert.equal(payload.contribution_id, result.contribution_id);
  assert.equal(payload.provider, "OpenAI");
  assert.equal(payload.estimated_cost_bucket, "under_1_usd");
  assert.equal(Object.hasOwn(payload, "session_id"), false);
  assert.equal(Object.hasOwn(payload, "timestamp"), false);
});
