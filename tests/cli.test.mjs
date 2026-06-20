import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { promisify } from "node:util";
import { openStore } from "../dist/storage.js";

const execFileAsync = promisify(execFile);
const tmpRoot = mkdtempSync(join(tmpdir(), "opensasa-cli-"));

after(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

test("prints help with planned MVP commands", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "--help"]);

  assert.match(stdout, /opensasa/);
  assert.match(stdout, /log/);
  assert.match(stdout, /sessions/);
  assert.match(stdout, /report/);
  assert.match(stdout, /inspect/);
});

test("prints version", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "--version"]);

  assert.equal(stdout.trim(), "0.1.0-alpha.1");
});

test("prints log help with manual session options", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "log", "--help"]);

  assert.match(stdout, /--provider/);
  assert.match(stdout, /--model-id/);
  assert.match(stdout, /--task-type/);
  assert.match(stdout, /--final-outcome/);
  assert.match(stdout, /--json/);
  assert.doesNotMatch(stdout, /prompt/i);
  assert.doesNotMatch(stdout, /source-code/i);
});

test("logs a valid manual session to the local database", async () => {
  const dbPath = join(tmpRoot, "valid-log.db");
  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "log",
    "--db-path",
    dbPath,
    "--provider",
    "OpenAI",
    "--model-id",
    "gpt-5",
    "--task-type",
    "bug_fix",
    "--final-outcome",
    "accepted",
    "--timestamp",
    "2026-06-09T12:00:00.000Z",
    "--tests-outcome",
    "passed",
  ]);
  const sessionId = stdout.trim().replace("Logged session ", "");
  const store = openStore(dbPath);

  try {
    const session = store.getSession(sessionId);

    assert.match(stdout, /^Logged session [0-9a-f-]+/);
    assert.equal(session.provider, "OpenAI");
    assert.equal(session.model_id, "gpt-5");
    assert.equal(session.task_type, "bug_fix");
    assert.equal(session.final_outcome, "accepted");
    assert.equal(session.work_mode, "manual_log");
    assert.equal(session.tests_outcome, "passed");
  } finally {
    store.close();
  }
});

test("logs a valid manual session as JSON", async () => {
  const dbPath = join(tmpRoot, "valid-log-json.db");
  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "log",
    "--json",
    "--db-path",
    dbPath,
    "--provider",
    "OpenAI",
    "--model-id",
    "gpt-5",
    "--task-type",
    "bug_fix",
    "--final-outcome",
    "accepted",
    "--timestamp",
    "2026-06-09T12:00:00.000Z",
    "--tests-outcome",
    "passed",
    "--estimated-cost-usd",
    "0.25",
  ]);
  const payload = JSON.parse(stdout);
  const store = openStore(dbPath);

  try {
    const session = store.getSession(payload.session.session_id);

    assert.equal(payload.status, "logged");
    assert.match(payload.session.session_id, /^[0-9a-f-]{36}$/);
    assert.equal(payload.session.provider, "OpenAI");
    assert.equal(payload.session.model_id, "gpt-5");
    assert.equal(payload.session.task_type, "bug_fix");
    assert.equal(payload.session.final_outcome, "accepted");
    assert.equal(payload.session.work_mode, "manual_log");
    assert.equal(payload.session.tests_outcome, "passed");
    assert.equal(payload.session.estimated_cost_usd, 0.25);
    assert.deepEqual(session, payload.session);
    assert.equal(Object.hasOwn(payload.session, "prompt"), false);
    assert.equal(Object.hasOwn(payload.session, "source_code"), false);
  } finally {
    store.close();
  }
});

test("logs supported optional metadata fields", async () => {
  const dbPath = join(tmpRoot, "optional-log.db");
  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "log",
    "--db-path",
    dbPath,
    "--provider",
    "Anthropic",
    "--model-id",
    "claude-sonnet-4.5",
    "--task-type",
    "feature",
    "--final-outcome",
    "partially_accepted",
    "--timestamp",
    "2026-06-10T12:00:00.000Z",
    "--tool",
    "Codex",
    "--language",
    "TypeScript",
    "--framework",
    "Node.js",
    "--duration-seconds",
    "300",
    "--retry-count",
    "2",
    "--estimated-cost-usd",
    "0.42",
    "--cost-source",
    "estimated",
    "--repo-size-bucket",
    "small",
  ]);
  const sessionId = stdout.trim().replace("Logged session ", "");
  const store = openStore(dbPath);

  try {
    const session = store.getSession(sessionId);

    assert.equal(session.tool, "Codex");
    assert.equal(session.language, "TypeScript");
    assert.equal(session.framework, "Node.js");
    assert.equal(session.duration_seconds, 300);
    assert.equal(session.retry_count, 2);
    assert.equal(session.estimated_cost_usd, 0.42);
    assert.equal(session.cost_source, "estimated");
    assert.equal(session.repo_size_bucket, "small");
  } finally {
    store.close();
  }
});

test("rejects invalid manual session metadata before writing", async () => {
  const dbPath = join(tmpRoot, "invalid-log.db");

  await assert.rejects(
    execFileAsync("node", [
      "./dist/index.js",
      "log",
      "--db-path",
      dbPath,
      "--provider",
      "OpenAI",
      "--model-id",
      "gpt-5",
      "--task-type",
      "private_source_dump",
      "--final-outcome",
      "accepted",
    ]),
    (error) => {
      assert.match(error.stderr, /Invalid session metadata/);
      assert.match(error.stderr, /task_type/);
      return true;
    },
  );

  const store = openStore(dbPath);
  try {
    assert.deepEqual(store.listSessions(), []);
  } finally {
    store.close();
  }
});

test("prints sessions help", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "sessions", "--help"]);

  assert.match(stdout, /List local AI coding sessions/);
  assert.match(stdout, /--db-path/);
  assert.match(stdout, /--limit/);
  assert.match(stdout, /--json/);
});

test("prints a clear sessions empty state", async () => {
  const dbPath = join(tmpRoot, "empty-sessions.db");
  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "sessions",
    "--db-path",
    dbPath,
  ]);

  assert.equal(stdout.trim(), "No local sessions found.");
});

test("rejects a non-positive sessions limit", async () => {
  const dbPath = join(tmpRoot, "invalid-sessions-limit.db");

  await assert.rejects(
    execFileAsync("node", [
      "./dist/index.js",
      "sessions",
      "--limit",
      "0",
      "--db-path",
      dbPath,
    ]),
    (error) => {
      assert.match(error.stderr, /Expected a positive integer/);
      return true;
    },
  );
});

test("lists saved sessions with safe summary fields sorted newest first", async () => {
  const dbPath = join(tmpRoot, "list-sessions.db");
  const store = openStore(dbPath);
  let older;
  let newer;

  try {
    older = store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      estimated_cost_usd: 0.25,
      language: "TypeScript",
    });
    newer = store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      task_type: "feature",
      final_outcome: "unknown",
      work_mode: "manual_log",
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "sessions",
    "--db-path",
    dbPath,
  ]);
  const newerIndex = stdout.indexOf(newer.session_id);
  const olderIndex = stdout.indexOf(older.session_id);

  assert.match(stdout, /Session ID/);
  assert.match(stdout, /Timestamp/);
  assert.match(stdout, /Provider/);
  assert.match(stdout, /Model/);
  assert.match(stdout, /Task/);
  assert.match(stdout, /Outcome/);
  assert.match(stdout, /Verified/);
  assert.match(stdout, /Cost/);
  assert.match(stdout, /OpenAI/);
  assert.match(stdout, /gpt-5/);
  assert.match(stdout, /bug_fix/);
  assert.match(stdout, /accepted/);
  assert.match(stdout, /yes/);
  assert.match(stdout, /\$0\.2500/);
  assert.match(stdout, /unknown/);
  assert.ok(newerIndex > -1);
  assert.ok(olderIndex > -1);
  assert.ok(newerIndex < olderIndex);
  assert.doesNotMatch(stdout, /TypeScript/);
});

test("limits saved sessions in text output", async () => {
  const dbPath = join(tmpRoot, "limit-sessions.db");
  const store = openStore(dbPath);
  let oldest;
  let middle;
  let newest;

  try {
    oldest = store.createSession({
      timestamp: "2026-06-08T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "oldest-model",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
    middle = store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "middle-model",
      task_type: "feature",
      final_outcome: "unknown",
      work_mode: "manual_log",
    });
    newest = store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "Google",
      model_id: "newest-model",
      task_type: "documentation",
      final_outcome: "rejected",
      work_mode: "manual_log",
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "sessions",
    "--limit",
    "2",
    "--db-path",
    dbPath,
  ]);

  assert.match(stdout, new RegExp(newest.session_id));
  assert.match(stdout, new RegExp(middle.session_id));
  assert.doesNotMatch(stdout, new RegExp(oldest.session_id));
});

test("prints empty sessions as JSON", async () => {
  const dbPath = join(tmpRoot, "empty-sessions-json.db");
  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "sessions",
    "--json",
    "--db-path",
    dbPath,
  ]);

  assert.deepEqual(JSON.parse(stdout), []);
});

test("lists saved sessions as safe JSON summaries sorted newest first", async () => {
  const dbPath = join(tmpRoot, "list-sessions-json.db");
  const store = openStore(dbPath);
  let older;
  let newer;

  try {
    older = store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      estimated_cost_usd: 0.25,
      language: "TypeScript",
    });
    newer = store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      task_type: "feature",
      final_outcome: "unknown",
      work_mode: "manual_log",
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "sessions",
    "--json",
    "--db-path",
    dbPath,
  ]);
  const sessions = JSON.parse(stdout);

  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].id, newer.session_id);
  assert.equal(sessions[1].id, older.session_id);
  assert.deepEqual(Object.keys(sessions[0]), [
    "id",
    "timestamp",
    "provider",
    "model",
    "task",
    "outcome",
    "verified",
    "cost",
  ]);
  assert.equal(sessions[1].provider, "OpenAI");
  assert.equal(sessions[1].model, "gpt-5");
  assert.equal(sessions[1].task, "bug_fix");
  assert.equal(sessions[1].outcome, "accepted");
  assert.equal(sessions[1].verified, "yes");
  assert.equal(sessions[1].cost, "$0.2500");
  assert.equal(Object.hasOwn(sessions[1], "language"), false);
});

test("limits saved sessions in JSON output", async () => {
  const dbPath = join(tmpRoot, "limit-sessions-json.db");
  const store = openStore(dbPath);
  let newest;

  try {
    store.createSession({
      timestamp: "2026-06-08T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "oldest-model",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
    newest = store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "newest-model",
      task_type: "feature",
      final_outcome: "unknown",
      work_mode: "manual_log",
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "sessions",
    "--json",
    "--limit",
    "1",
    "--db-path",
    dbPath,
  ]);
  const sessions = JSON.parse(stdout);

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].id, newest.session_id);
});

test("prints report help", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "report", "--help"]);

  assert.match(stdout, /Generate a local personal report/);
  assert.match(stdout, /--db-path/);
  assert.match(stdout, /--json/);
});

test("prints an empty local report with unknown rates", async () => {
  const dbPath = join(tmpRoot, "empty-report.db");
  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "report",
    "--db-path",
    dbPath,
  ]);

  assert.match(stdout, /OpenSasa Local Report/);
  assert.match(stdout, /Total sessions: 0/);
  assert.match(stdout, /Estimated total cost: unknown/);
  assert.match(stdout, /Useful outcome rate: unknown \(0\/0\)/);
  assert.match(stdout, /Verified success rate: unknown \(0\/0\)/);
});

test("prints a local report from saved sessions", async () => {
  const dbPath = join(tmpRoot, "report.db");
  const store = openStore(dbPath);

  try {
    store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      retry_count: 1,
      estimated_cost_usd: 0.5,
      language: "TypeScript",
    });
    store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      task_type: "feature",
      final_outcome: "rejected",
      work_mode: "manual_log",
      tests_outcome: "failed",
      retry_count: 2,
      estimated_cost_usd: 1,
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "report",
    "--db-path",
    dbPath,
  ]);

  assert.match(stdout, /Total sessions: 2/);
  assert.match(stdout, /OpenAI\/gpt-5: 1/);
  assert.match(stdout, /Anthropic\/claude-sonnet-4\.5: 1/);
  assert.match(stdout, /bug_fix: 1/);
  assert.match(stdout, /feature: 1/);
  assert.match(stdout, /Accepted or partially accepted: 1/);
  assert.match(stdout, /Rejected: 1/);
  assert.match(stdout, /Estimated total cost: \$1\.5000/);
  assert.match(stdout, /Retry burden: 1\.00/);
  assert.match(stdout, /Useful outcome rate: 50\.0% \(1\/2\)/);
  assert.match(stdout, /Verified success rate: 50\.0% \(1\/2\)/);
  assert.doesNotMatch(stdout, /TypeScript/);
});

test("prints an empty local report as JSON", async () => {
  const dbPath = join(tmpRoot, "empty-report-json.db");
  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "report",
    "--json",
    "--db-path",
    dbPath,
  ]);
  const report = JSON.parse(stdout);

  assert.equal(report.totalSessions, 0);
  assert.equal(report.estimatedTotalCostUsd, null);
  assert.equal(report.usefulOutcomeRate.rate, null);
  assert.equal(report.verifiedSuccessRate.rate, null);
});

test("prints a local report from saved sessions as JSON", async () => {
  const dbPath = join(tmpRoot, "report-json.db");
  const store = openStore(dbPath);

  try {
    store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      retry_count: 1,
      estimated_cost_usd: 0.5,
    });
    store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      task_type: "feature",
      final_outcome: "rejected",
      work_mode: "manual_log",
      tests_outcome: "failed",
      retry_count: 2,
      estimated_cost_usd: 1,
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "report",
    "--json",
    "--db-path",
    dbPath,
  ]);
  const report = JSON.parse(stdout);

  assert.equal(report.totalSessions, 2);
  assert.equal(report.sessionsByModel["OpenAI/gpt-5"], 1);
  assert.equal(report.sessionsByModel["Anthropic/claude-sonnet-4.5"], 1);
  assert.equal(report.estimatedTotalCostUsd, 1.5);
  assert.equal(report.retrySummary.retryBurden, 1);
  assert.equal(report.usefulOutcomeRate.rate, 0.5);
  assert.equal(report.verifiedSuccessRate.rate, 0.5);
});

test("prints inspect help", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "inspect", "--help"]);

  assert.match(stdout, /Inspect a local session or contribution preview/);
  assert.match(stdout, /--contribution/);
  assert.match(stdout, /--db-path/);
  assert.match(stdout, /--json/);
});

test("inspects a local session record", async () => {
  const dbPath = join(tmpRoot, "inspect.db");
  const store = openStore(dbPath);
  let session;

  try {
    session = store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      estimated_cost_usd: 0.5,
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "inspect",
    session.session_id,
    "--db-path",
    dbPath,
  ]);

  assert.match(stdout, /OpenSasa Session Inspection/);
  assert.match(stdout, new RegExp(`session_id: ${session.session_id}`));
  assert.match(stdout, /provider: OpenAI/);
  assert.match(stdout, /model_id: gpt-5/);
  assert.match(stdout, /estimated_cost_usd: 0.5/);
  assert.match(stdout, /verified_success: true/);
  assert.match(stdout, /No source code stored/);
});

test("inspects a local session record as JSON", async () => {
  const dbPath = join(tmpRoot, "inspect-json.db");
  const store = openStore(dbPath);
  let session;

  try {
    session = store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      estimated_cost_usd: 0.5,
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "inspect",
    session.session_id,
    "--json",
    "--db-path",
    dbPath,
  ]);
  const inspection = JSON.parse(stdout);

  assert.equal(inspection.local_record.session_id, session.session_id);
  assert.equal(inspection.local_record.provider, "OpenAI");
  assert.equal(inspection.local_record.estimated_cost_usd, 0.5);
  assert.equal(inspection.local_record.verified_success, true);
  assert.match(inspection.privacy_boundary.join("\n"), /No source code stored/);
});

test("previews a sanitized contribution payload without upload", async () => {
  const dbPath = join(tmpRoot, "contribution-preview.db");
  const store = openStore(dbPath);
  let session;

  try {
    session = store.createSession({
      timestamp: "2026-06-09T12:34:56.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      input_tokens_estimate: 1200,
      estimated_cost_usd: 0.5,
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "inspect",
    session.session_id,
    "--contribution",
    "--db-path",
    dbPath,
  ]);

  assert.match(stdout, /OpenSasa Contribution Preview/);
  assert.match(stdout, /Status: preview only/);
  assert.match(stdout, /Consent: not granted/);
  assert.match(stdout, /Upload enabled: no/);
  assert.match(stdout, /No upload will occur in this MVP/);
  assert.match(stdout, /timestamp_bucket: 2026-06-09/);
  assert.match(stdout, /input_tokens_bucket: large/);
  assert.match(stdout, /estimated_cost_bucket: under_1_usd/);
  assert.match(stdout, /source code/);
  assert.match(stdout, /terminal output/);
  assert.doesNotMatch(stdout, new RegExp(`session_id: ${session.session_id}`));
  assert.doesNotMatch(stdout, /timestamp: 2026-06-09T12:34:56.000Z/);
  assert.doesNotMatch(stdout, /estimated_cost_usd: 0.5/);
});

test("previews a sanitized contribution payload as JSON without upload", async () => {
  const dbPath = join(tmpRoot, "contribution-preview-json.db");
  const store = openStore(dbPath);
  let session;

  try {
    session = store.createSession({
      timestamp: "2026-06-09T12:34:56.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      input_tokens_estimate: 1200,
      estimated_cost_usd: 0.5,
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "inspect",
    session.session_id,
    "--contribution",
    "--json",
    "--db-path",
    dbPath,
  ]);
  const preview = JSON.parse(stdout);

  assert.equal(preview.status, "preview only");
  assert.equal(preview.consent, "not granted");
  assert.equal(preview.upload_enabled, false);
  assert.equal(preview.destination, "none");
  assert.equal(preview.included_fields.timestamp_bucket, "2026-06-09");
  assert.equal(preview.included_fields.input_tokens_bucket, "large");
  assert.equal(preview.included_fields.estimated_cost_bucket, "under_1_usd");
  assert.equal(Object.hasOwn(preview.included_fields, "session_id"), false);
  assert.equal(Object.hasOwn(preview.included_fields, "timestamp"), false);
  assert.equal(Object.hasOwn(preview.included_fields, "estimated_cost_usd"), false);
  assert.match(preview.excluded_fields.join("\n"), /terminal output/);
});

test("returns an error when inspecting a missing session", async () => {
  const dbPath = join(tmpRoot, "missing-inspect.db");

  await assert.rejects(
    execFileAsync("node", [
      "./dist/index.js",
      "inspect",
      "missing-session",
      "--db-path",
      dbPath,
    ]),
    (error) => {
      assert.match(error.stderr, /Session not found: missing-session/);
      return true;
    },
  );
});
