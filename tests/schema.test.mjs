import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deriveVerifiedSuccess,
  localSessionSchema,
  schemaVersion,
} from "../dist/schema.js";

const baseSession = {
  timestamp: "2026-06-09T12:00:00.000Z",
  provider: "OpenAI",
  model_id: "gpt-5",
  task_type: "bug_fix",
  final_outcome: "accepted",
  work_mode: "manual_log",
};

test("validates a minimal local session", () => {
  const parsed = localSessionSchema.parse(baseSession);

  assert.equal(parsed.schema_version, schemaVersion);
  assert.equal(parsed.provider, "OpenAI");
  assert.equal(parsed.model_id, "gpt-5");
  assert.equal(parsed.task_type, "bug_fix");
  assert.equal(parsed.final_outcome, "accepted");
  assert.equal(parsed.tests_outcome, "unknown");
  assert.equal(parsed.manual_review_outcome, "unknown");
});

test("accepts optional MVP metadata fields", () => {
  const parsed = localSessionSchema.parse({
    ...baseSession,
    model_version: "2026-06-01",
    tool: "Codex",
    language: "TypeScript",
    framework: "Node.js",
    duration_seconds: 300,
    retry_count: 1,
    error_count: 0,
    input_tokens_estimate: 1200,
    output_tokens_estimate: 500,
    cached_tokens_estimate: 100,
    estimated_cost_usd: 0.42,
    cost_source: "estimated",
    repo_size_bucket: "small",
    file_count_bucket: "medium",
    changed_file_count_bucket: "tiny",
    lines_added_bucket: "small",
    lines_removed_bucket: "tiny",
    tests_outcome: "passed",
    build_outcome: "not_run",
    lint_outcome: "unknown",
    typecheck_outcome: "failed",
    manual_review_outcome: "accepted",
  });

  assert.equal(parsed.tool, "Codex");
  assert.equal(parsed.tests_outcome, "passed");
  assert.equal(parsed.estimated_cost_usd, 0.42);
});

test("requires MVP fields", () => {
  const result = localSessionSchema.safeParse({
    provider: "OpenAI",
    model_id: "gpt-5",
  });

  assert.equal(result.success, false);
});

test("rejects invalid enum values", () => {
  const result = localSessionSchema.safeParse({
    ...baseSession,
    task_type: "invalid_task",
  });

  assert.equal(result.success, false);
});

test("represents unknown outcomes explicitly", () => {
  const parsed = localSessionSchema.parse({
    ...baseSession,
    final_outcome: "unknown",
  });

  assert.equal(parsed.final_outcome, "unknown");
});

test("rejects private implementation fields", () => {
  const result = localSessionSchema.safeParse({
    ...baseSession,
    source_code: "const secret = true;",
  });

  assert.equal(result.success, false);
});

test("derives verified success from useful outcome and passing evidence", () => {
  const parsed = localSessionSchema.parse({
    ...baseSession,
    tests_outcome: "passed",
  });

  assert.equal(deriveVerifiedSuccess(parsed), true);
});

test("does not mark unverified useful sessions as verified success", () => {
  const parsed = localSessionSchema.parse(baseSession);

  assert.equal(deriveVerifiedSuccess(parsed), false);
});

test("does not mark rejected sessions as verified success", () => {
  const parsed = localSessionSchema.parse({
    ...baseSession,
    final_outcome: "rejected",
    tests_outcome: "passed",
  });

  assert.equal(deriveVerifiedSuccess(parsed), false);
});
