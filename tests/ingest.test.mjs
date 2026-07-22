import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import {
  createContributionIngestionServer,
  ingestContributionPayload,
  listenContributionIngestionServer,
} from "../dist/ingest.js";

const safePayload = {
  schema_version: "opensasa.metadata.v0",
  payload_version: "v0.2.0",
  contribution_id: "contrib_test_123",
  timestamp_bucket: "2026-07-21",
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

test("accepts a contribution-safe payload without storing it", () => {
  const result = ingestContributionPayload(safePayload);

  assert.equal(result.status, "accepted");
  assert.equal(result.stored, false);
  assert.equal(result.contribution_id, "contrib_test_123");
  assert.equal(result.payload_version, "v0.2.0");
  assert.equal(result.validation.status, "passed");
  assert.equal(result.server_validation.status, "passed");
  assert.deepEqual(result.server_validation.issues, []);
  assert.match(result.notice, /not stored/i);
});

test("rejects payloads with forbidden private fields", () => {
  const result = ingestContributionPayload({
    ...safePayload,
    source_code: "private code",
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.stored, false);
  assert.equal(result.validation.status, "failed");
  assert.equal(result.server_validation.status, "failed");
  assert.deepEqual(result.validation.forbidden_fields_present, ["source_code"]);
  assert.equal(result.server_validation.summary.forbidden_field_count, 1);
  assert.match(result.notice, /failed contribution-safe validation/i);
});

test("rejects invalid contribution contract values", () => {
  const result = ingestContributionPayload({
    ...safePayload,
    task_type: 123,
    verified_success: "yes",
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.stored, false);
  assert.equal(result.validation.status, "passed");
  assert.equal(result.server_validation.status, "failed");
  assert.equal(result.server_validation.summary.invalid_type_count, 2);
  assert.match(result.contract_errors.join("\n"), /task_type must be a non-empty string/);
  assert.match(result.contract_errors.join("\n"), /verified_success must be a boolean/);
});

test("rejects private-looking values in allowed text fields", () => {
  const result = ingestContributionPayload({
    ...safePayload,
    model_id: "customer-acme-private-repo-model",
  });

  assert.equal(result.status, "rejected");
  assert.equal(result.server_validation.summary.private_marker_count, 1);
  assert.match(result.contract_errors.join("\n"), /model_id contains private-looking text/);
});

test("serves health and contribution ingestion endpoints", async () => {
  const server = createContributionIngestionServer();
  const address = await listenContributionIngestionServer(server, "127.0.0.1", 0);

  try {
    const health = await fetch(`http://${address.host}:${address.port}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
      status: "ok",
      service: "opensasa-contribution-ingestion",
      storage_enabled: false,
    });

    const accepted = await fetch(`http://${address.host}:${address.port}/api/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safePayload),
    });
    assert.equal(accepted.status, 202);
    const acceptedJson = await accepted.json();
    assert.equal(acceptedJson.status, "accepted");
    assert.equal(acceptedJson.server_validation.status, "passed");

    const rejected = await fetch(`http://${address.host}:${address.port}/api/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...safePayload, repository_name: "private-repo" }),
    });
    assert.equal(rejected.status, 422);
    const rejectedJson = await rejected.json();
    assert.equal(rejectedJson.status, "rejected");
    assert.deepEqual(rejectedJson.validation.forbidden_fields_present, ["repository_name"]);
    assert.equal(rejectedJson.server_validation.summary.forbidden_field_count, 1);

    const wrongContentType = await fetch(`http://${address.host}:${address.port}/api/contributions`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(safePayload),
    });
    assert.equal(wrongContentType.status, 415);

    const oversized = await fetch(`http://${address.host}:${address.port}/api/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: "x".repeat(130 * 1024) }),
    });
    assert.equal(oversized.status, 413);
    assert.match((await oversized.json()).error, /128KB/);

    const wrongMethod = await fetch(`http://${address.host}:${address.port}/api/contributions`);
    assert.equal(wrongMethod.status, 405);
  } finally {
    server.closeIdleConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("prints a specific startup error when ingestion cannot bind", async () => {
  const server = createContributionIngestionServer();
  const address = await listenContributionIngestionServer(server, "127.0.0.1", 0);

  try {
    const child = execFileSync("node", ["./dist/index.js", "ingest", "--port", String(address.port)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.fail(`Expected command to fail, got ${child}`);
  } catch (error) {
    assert.equal(error.status, 1);
    assert.match(error.stderr, /Unable to start contribution ingestion endpoint/);
  } finally {
    server.closeIdleConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("lists the ingestion command in CLI help", () => {
  const output = execFileSync("node", ["./dist/index.js", "--help"], {
    encoding: "utf8",
  });

  assert.match(output, /ingest/);
  assert.match(output, /contribution ingestion endpoint/);
});
