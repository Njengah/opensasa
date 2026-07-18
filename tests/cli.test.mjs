import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
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
  assert.match(stdout, /update/);
  assert.match(stdout, /delete/);
  assert.match(stdout, /demo-seed/);
  assert.match(stdout, /dashboard/);
  assert.match(stdout, /sessions/);
  assert.match(stdout, /report/);
  assert.match(stdout, /inspect/);
  assert.match(stdout, /export/);
});

test("prints export help with explicit confirmation", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "export", "--help"]);

  assert.match(stdout, /--out/);
  assert.match(stdout, /--yes/);
  assert.match(stdout, /--json/);
});

test("prints dashboard help", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "dashboard", "--help"]);

  assert.match(stdout, /Start the local-only dashboard server/);
  assert.match(stdout, /--db-path/);
  assert.match(stdout, /--host/);
  assert.match(stdout, /--port/);
});

test("prints version", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "--version"]);

  assert.equal(stdout.trim(), "0.1.0-alpha.1");
});

test("prints log help with manual session options", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "log", "--help"]);

  assert.match(stdout, /--provider/);
  assert.match(stdout, /--model-id/);
  assert.match(stdout, /--tool/);
  assert.match(stdout, /--language/);
  assert.match(stdout, /--framework/);
  assert.match(stdout, /--work-mode/);
  assert.match(stdout, /--task-type/);
  assert.match(stdout, /--final-outcome/);
  assert.match(stdout, /--contribution-consent/);
  assert.match(stdout, /--json/);
  assert.doesNotMatch(stdout, /prompt/i);
  assert.doesNotMatch(stdout, /source-code/i);
});

test("creates a session draft", async () => {
  const dbPath = join(tmpRoot, "draft.db");
  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "draft",
    "--provider",
    "OpenAI",
    "--model-id",
    "gpt-5",
    "--tool",
    "Codex",
    "--task-type",
    "bug_fix",
    "--json",
    "--db-path",
    dbPath,
  ]);
  const result = JSON.parse(stdout);

  assert.equal(result.status, "drafted");
  assert.equal(result.session.final_outcome, "unknown");
  assert.equal(result.session.work_mode, "cli_wrapper");
  assert.equal(result.session.provider, "OpenAI");
  assert.equal(result.session.tool, "Codex");
});

test("reports agent status from the latest heartbeat", async () => {
  const dbPath = join(tmpRoot, "agent-status.db");
  const heartbeat = await execFileAsync("node", [
    "./dist/index.js",
    "heartbeat",
    "--json",
    "--db-path",
    dbPath,
  ]);
  const heartbeatResult = JSON.parse(heartbeat.stdout);
  assert.equal(heartbeatResult.status, "recorded");

  const status = await execFileAsync("node", [
    "./dist/index.js",
    "agent",
    "status",
    "--json",
    "--db-path",
    dbPath,
  ]);
  const result = JSON.parse(status.stdout);

  assert.equal(result.status, "active");
  assert.equal(result.last_heartbeat, heartbeatResult.heartbeat.timestamp);
  assert.equal(result.threshold_seconds, 300);
});

test("finalizes a session draft with elapsed duration", async () => {
  const dbPath = join(tmpRoot, "finalize.db");
  const draftOutput = await execFileAsync("node", [
    "./dist/index.js",
    "draft",
    "--provider",
    "OpenAI",
    "--model-id",
    "gpt-5",
    "--task-type",
    "bug_fix",
    "--json",
    "--db-path",
    dbPath,
  ]);
  const draft = JSON.parse(draftOutput.stdout);
  const finalizedOutput = await execFileAsync("node", [
    "./dist/index.js",
    "finalize",
    draft.session.session_id,
    "--final-outcome",
    "accepted",
    "--tests-outcome",
    "passed",
    "--json",
    "--db-path",
    dbPath,
  ]);
  const finalized = JSON.parse(finalizedOutput.stdout);

  assert.equal(finalized.status, "finalized");
  assert.equal(finalized.session.final_outcome, "accepted");
  assert.equal(finalized.session.tests_outcome, "passed");
  assert.equal(typeof finalized.session.duration_seconds, "number");
  assert.ok(finalized.session.duration_seconds >= 0);
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
    "--contribution-consent",
    "granted",
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
    assert.equal(payload.session.contribution_consent, "granted");
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
    "--import-source",
    "codex-session",
    "--import-source-version",
    "1.2.0",
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
    "--contribution-consent",
    "granted",
  ]);
  const sessionId = stdout.trim().replace("Logged session ", "");
  const store = openStore(dbPath);

  try {
    const session = store.getSession(sessionId);

    assert.equal(session.tool, "Codex");
    assert.equal(session.language, "TypeScript");
    assert.equal(session.framework, "Node.js");
    assert.equal(session.import_source, "codex-session");
    assert.equal(session.import_source_version, "1.2.0");
    assert.equal(session.duration_seconds, 300);
    assert.equal(session.retry_count, 2);
    assert.equal(session.estimated_cost_usd, 0.42);
    assert.equal(session.cost_source, "estimated");
    assert.equal(session.repo_size_bucket, "small");
    assert.equal(session.contribution_consent, "granted");
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

test("prints update help with safe session options", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "update", "--help"]);

  assert.match(stdout, /Update safe metadata/);
  assert.match(stdout, /--provider/);
  assert.match(stdout, /--model-id/);
  assert.match(stdout, /--task-type/);
  assert.match(stdout, /--final-outcome/);
  assert.match(stdout, /--tests-outcome/);
  assert.match(stdout, /--contribution-consent/);
  assert.match(stdout, /--json/);
  assert.doesNotMatch(stdout, /prompt/i);
  assert.doesNotMatch(stdout, /source-code/i);
});

test("updates a local session with safe metadata", async () => {
  const dbPath = join(tmpRoot, "update-session.db");
  const store = openStore(dbPath);
  let session;

  try {
    session = store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "unknown",
      work_mode: "manual_log",
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "update",
    session.session_id,
    "--db-path",
    dbPath,
    "--final-outcome",
    "accepted",
    "--tests-outcome",
    "passed",
    "--retry-count",
    "2",
    "--estimated-cost-usd",
    "0.75",
    "--contribution-consent",
    "granted",
  ]);
  const readStore = openStore(dbPath);

  try {
    const updated = readStore.getSession(session.session_id);

    assert.equal(stdout.trim(), `Updated session ${session.session_id}`);
    assert.equal(updated.session_id, session.session_id);
    assert.equal(updated.provider, "OpenAI");
    assert.equal(updated.final_outcome, "accepted");
    assert.equal(updated.tests_outcome, "passed");
    assert.equal(updated.retry_count, 2);
    assert.equal(updated.estimated_cost_usd, 0.75);
    assert.equal(updated.contribution_consent, "granted");
  } finally {
    readStore.close();
  }
});

test("updates a local session as JSON", async () => {
  const dbPath = join(tmpRoot, "update-session-json.db");
  const store = openStore(dbPath);
  let session;

  try {
    session = store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "unknown",
      work_mode: "manual_log",
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "update",
    session.session_id,
    "--json",
    "--db-path",
    dbPath,
    "--final-outcome",
    "accepted",
    "--tests-outcome",
    "passed",
  ]);
  const payload = JSON.parse(stdout);

  assert.equal(payload.status, "updated");
  assert.equal(payload.session.session_id, session.session_id);
  assert.equal(payload.session.final_outcome, "accepted");
  assert.equal(payload.session.tests_outcome, "passed");
  assert.equal(Object.hasOwn(payload.session, "prompt"), false);
  assert.equal(Object.hasOwn(payload.session, "source_code"), false);
});

test("rejects an update with no fields", async () => {
  const dbPath = join(tmpRoot, "update-session-no-fields.db");
  const store = openStore(dbPath);
  let session;

  try {
    session = store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "unknown",
      work_mode: "manual_log",
    });
  } finally {
    store.close();
  }

  await assert.rejects(
    execFileAsync("node", [
      "./dist/index.js",
      "update",
      session.session_id,
      "--db-path",
      dbPath,
    ]),
    (error) => {
      assert.match(error.stderr, /No update fields provided/);
      return true;
    },
  );
});

test("returns an error when updating a missing session", async () => {
  const dbPath = join(tmpRoot, "update-session-missing.db");

  await assert.rejects(
    execFileAsync("node", [
      "./dist/index.js",
      "update",
      "missing-session",
      "--final-outcome",
      "accepted",
      "--db-path",
      dbPath,
    ]),
    (error) => {
      assert.match(error.stderr, /Session not found: missing-session/);
      return true;
    },
  );
});

test("prints delete help with explicit confirmation", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "delete", "--help"]);

  assert.match(stdout, /Delete a local AI coding session/);
  assert.match(stdout, /--yes/);
  assert.match(stdout, /--json/);
});

test("requires confirmation before deleting a local session", async () => {
  const dbPath = join(tmpRoot, "delete-session-requires-yes.db");
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
    });
  } finally {
    store.close();
  }

  await assert.rejects(
    execFileAsync("node", [
      "./dist/index.js",
      "delete",
      session.session_id,
      "--db-path",
      dbPath,
    ]),
    (error) => {
      assert.match(error.stderr, /required option '--yes'/);
      return true;
    },
  );

  const readStore = openStore(dbPath);
  try {
    assert.notEqual(readStore.getSession(session.session_id), null);
  } finally {
    readStore.close();
  }
});

test("deletes a local session after confirmation", async () => {
  const dbPath = join(tmpRoot, "delete-session.db");
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
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "delete",
    session.session_id,
    "--yes",
    "--db-path",
    dbPath,
  ]);
  const readStore = openStore(dbPath);

  try {
    assert.equal(stdout.trim(), `Deleted session ${session.session_id}`);
    assert.equal(readStore.getSession(session.session_id), null);
  } finally {
    readStore.close();
  }
});

test("deletes a local session as JSON", async () => {
  const dbPath = join(tmpRoot, "delete-session-json.db");
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
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "delete",
    session.session_id,
    "--yes",
    "--json",
    "--db-path",
    dbPath,
  ]);
  const payload = JSON.parse(stdout);

  assert.deepEqual(payload, { status: "deleted", session_id: session.session_id });
});

test("returns an error when deleting a missing session", async () => {
  const dbPath = join(tmpRoot, "delete-session-missing.db");

  await assert.rejects(
    execFileAsync("node", [
      "./dist/index.js",
      "delete",
      "missing-session",
      "--yes",
      "--db-path",
      dbPath,
    ]),
    (error) => {
      assert.match(error.stderr, /Session not found: missing-session/);
      return true;
    },
  );
});

test("prints demo seed help", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "demo-seed", "--help"]);

  assert.match(stdout, /Create safe synthetic demo sessions/);
  assert.match(stdout, /--db-path/);
  assert.match(stdout, /--json/);
  assert.doesNotMatch(stdout, /prompt/i);
  assert.doesNotMatch(stdout, /source-code/i);
});

test("creates safe synthetic demo sessions", async () => {
  const dbPath = join(tmpRoot, "demo-seed.db");
  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "demo-seed",
    "--db-path",
    dbPath,
  ]);
  const store = openStore(dbPath);

  try {
    const sessions = store.listSessions();

    assert.equal(stdout.trim(), "Seeded 3 synthetic demo sessions.");
    assert.equal(sessions.length, 3);
    assert.deepEqual(
      new Set(sessions.map((session) => session.provider)),
      new Set(["OpenAI", "Anthropic", "Google"]),
    );
    assert.equal(sessions.every((session) => session.work_mode === "manual_log"), true);
    assert.equal(sessions.every((session) => session.contribution_consent === "not_granted"), true);
    assert.equal(sessions.some((session) => session.tests_outcome === "passed"), true);
    assert.equal(sessions.some((session) => session.final_outcome === "rejected"), true);
    assert.equal(sessions.some((session) => session.estimated_cost_usd !== undefined), true);
    assert.equal(sessions.some((session) => Object.hasOwn(session, "prompt")), false);
    assert.equal(sessions.some((session) => Object.hasOwn(session, "source_code")), false);
  } finally {
    store.close();
  }
});

test("creates safe synthetic demo sessions as JSON", async () => {
  const dbPath = join(tmpRoot, "demo-seed-json.db");
  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "demo-seed",
    "--json",
    "--db-path",
    dbPath,
  ]);
  const payload = JSON.parse(stdout);
  const store = openStore(dbPath);

  try {
    assert.equal(payload.status, "seeded");
    assert.equal(payload.seeded_count, 3);
    assert.equal(payload.sessions.length, 3);
    assert.equal(payload.sessions[0].schema_version, "opensasa.metadata.v0");
    assert.equal(Object.hasOwn(payload.sessions[0], "prompt"), false);
    assert.equal(Object.hasOwn(payload.sessions[0], "source_code"), false);
    assert.equal(store.listSessions().length, 3);
  } finally {
    store.close();
  }
});

test("prints sessions help", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "sessions", "--help"]);

  assert.match(stdout, /List local AI coding sessions/);
  assert.match(stdout, /--db-path/);
  assert.match(stdout, /--limit/);
  assert.match(stdout, /--provider/);
  assert.match(stdout, /--model-id/);
  assert.match(stdout, /--task-type/);
  assert.match(stdout, /--final-outcome/);
  assert.match(stdout, /--since/);
  assert.match(stdout, /--until/);
  assert.match(stdout, /--json/);
});

test("prints a compact local report", async () => {
  const dbPath = join(tmpRoot, "compact-report.db");
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
      input_tokens_estimate: 1200,
      output_tokens_estimate: 500,
      estimated_cost_usd: 0.5,
      retry_count: 1,
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "report",
    "--compact",
    "--db-path",
    dbPath,
  ]);

  assert.match(stdout, /^OpenSasa: 1 session/m);
  assert.match(stdout, /Useful 100\.0% \(1\/1\)/);
  assert.match(stdout, /Tokens 1700/);
  assert.doesNotMatch(stdout, /Sessions by provider/);
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

test("rejects an invalid sessions date filter", async () => {
  const dbPath = join(tmpRoot, "invalid-sessions-date-filter.db");

  await assert.rejects(
    execFileAsync("node", [
      "./dist/index.js",
      "sessions",
      "--since",
      "not-a-date",
      "--db-path",
      dbPath,
    ]),
    (error) => {
      assert.match(error.stderr, /Expected an ISO timestamp/);
      return true;
    },
  );

  await assert.rejects(
    execFileAsync("node", [
      "./dist/index.js",
      "sessions",
      "--until",
      "2026-06-09",
      "--db-path",
      dbPath,
    ]),
    (error) => {
      assert.match(error.stderr, /Expected an ISO timestamp/);
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

test("filters saved sessions in text output", async () => {
  const dbPath = join(tmpRoot, "filter-sessions.db");
  const store = openStore(dbPath);
  let matching;
  let differentProvider;
  let differentTool;
  let differentLanguage;
  let differentFramework;
  let differentWorkMode;
  let differentTask;

  try {
    matching = store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
    differentProvider = store.createSession({
      timestamp: "2026-06-11T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
    differentTool = store.createSession({
      timestamp: "2026-06-11T12:30:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Claude Code",
      language: "TypeScript",
      framework: "Node.js",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
    differentLanguage = store.createSession({
      timestamp: "2026-06-11T13:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Codex",
      language: "Python",
      framework: "Node.js",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
    differentFramework = store.createSession({
      timestamp: "2026-06-11T13:30:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Codex",
      language: "TypeScript",
      framework: "Django",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
    differentWorkMode = store.createSession({
      timestamp: "2026-06-11T14:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "agent_log",
    });
    differentTask = store.createSession({
      timestamp: "2026-06-12T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      task_type: "documentation",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "sessions",
    "--provider",
    "OpenAI",
    "--model-id",
    "gpt-5",
    "--tool",
    "Codex",
    "--language",
    "TypeScript",
    "--framework",
    "Node.js",
    "--work-mode",
    "manual_log",
    "--task-type",
    "bug_fix",
    "--final-outcome",
    "accepted",
    "--db-path",
    dbPath,
  ]);

  assert.match(stdout, new RegExp(matching.session_id));
  assert.doesNotMatch(stdout, new RegExp(differentProvider.session_id));
  assert.doesNotMatch(stdout, new RegExp(differentTool.session_id));
  assert.doesNotMatch(stdout, new RegExp(differentLanguage.session_id));
  assert.doesNotMatch(stdout, new RegExp(differentFramework.session_id));
  assert.doesNotMatch(stdout, new RegExp(differentWorkMode.session_id));
  assert.doesNotMatch(stdout, new RegExp(differentTask.session_id));
});

test("filters saved sessions by date range in text output", async () => {
  const dbPath = join(tmpRoot, "filter-sessions-date.db");
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
      provider: "OpenAI",
      model_id: "middle-model",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
    newest = store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "newest-model",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "sessions",
    "--since",
    "2026-06-09T00:00:00.000Z",
    "--until",
    "2026-06-10T00:00:00.000Z",
    "--db-path",
    dbPath,
  ]);

  assert.match(stdout, new RegExp(middle.session_id));
  assert.doesNotMatch(stdout, new RegExp(oldest.session_id));
  assert.doesNotMatch(stdout, new RegExp(newest.session_id));
});

test("prints the sessions empty state when filters match nothing", async () => {
  const dbPath = join(tmpRoot, "filter-sessions-empty.db");
  const store = openStore(dbPath);

  try {
    store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "sessions",
    "--provider",
    "Anthropic",
    "--db-path",
    dbPath,
  ]);

  assert.equal(stdout.trim(), "No local sessions found.");
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

test("filters saved sessions in JSON output", async () => {
  const dbPath = join(tmpRoot, "filter-sessions-json.db");
  const store = openStore(dbPath);
  let matching;

  try {
    store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Claude Code",
      language: "TypeScript",
      framework: "Node.js",
      task_type: "feature",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
    matching = store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
    store.createSession({
      timestamp: "2026-06-11T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      tool: "Codex",
      language: "Python",
      framework: "Django",
      task_type: "bug_fix",
      final_outcome: "rejected",
      work_mode: "manual_log",
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "sessions",
    "--json",
    "--provider",
    "OpenAI",
    "--tool",
    "Codex",
    "--language",
    "TypeScript",
    "--framework",
    "Node.js",
    "--work-mode",
    "manual_log",
    "--task-type",
    "bug_fix",
    "--db-path",
    dbPath,
  ]);
  const sessions = JSON.parse(stdout);

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].id, matching.session_id);
  assert.equal(sessions[0].provider, "OpenAI");
  assert.equal(sessions[0].task, "bug_fix");
});

test("filters saved sessions by date range in JSON output", async () => {
  const dbPath = join(tmpRoot, "filter-sessions-date-json.db");
  const store = openStore(dbPath);
  let middle;

  try {
    store.createSession({
      timestamp: "2026-06-08T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "oldest-model",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
    middle = store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "middle-model",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
    store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "newest-model",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "sessions",
    "--json",
    "--since",
    "2026-06-09T00:00:00.000Z",
    "--until",
    "2026-06-10T00:00:00.000Z",
    "--db-path",
    dbPath,
  ]);
  const sessions = JSON.parse(stdout);

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].id, middle.session_id);
  assert.equal(sessions[0].timestamp, "2026-06-09T12:00:00.000Z");
});

test("prints report help", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "report", "--help"]);

  assert.match(stdout, /Generate a local personal report/);
  assert.match(stdout, /--db-path/);
  assert.match(stdout, /--limit/);
  assert.match(stdout, /--provider/);
  assert.match(stdout, /--model-id/);
  assert.match(stdout, /--tool/);
  assert.match(stdout, /--language/);
  assert.match(stdout, /--framework/);
  assert.match(stdout, /--work-mode/);
  assert.match(stdout, /--task-type/);
  assert.match(stdout, /--final-outcome/);
  assert.match(stdout, /--since/);
  assert.match(stdout, /--until/);
  assert.match(stdout, /--compact/);
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
  assert.match(stdout, /No local sessions matched this report/);
  assert.match(stdout, /Sessions by provider:\n- none recorded/);
  assert.match(stdout, /Cost by provider: none recorded/);
  assert.match(stdout, /Estimated total cost: unknown/);
  assert.match(stdout, /Useful outcome rate: unknown \(0\/0\)/);
  assert.match(stdout, /Verified success rate: unknown \(0\/0\)/);
});

test("rejects an invalid report date filter", async () => {
  const dbPath = join(tmpRoot, "invalid-report-date-filter.db");

  await assert.rejects(
    execFileAsync("node", [
      "./dist/index.js",
      "report",
      "--until",
      "not-a-date",
      "--db-path",
      dbPath,
    ]),
    (error) => {
      assert.match(error.stderr, /Expected an ISO timestamp/);
      return true;
    },
  );

  await assert.rejects(
    execFileAsync("node", [
      "./dist/index.js",
      "report",
      "--since",
      "2026-06-09",
      "--db-path",
      dbPath,
    ]),
    (error) => {
      assert.match(error.stderr, /Expected an ISO timestamp/);
      return true;
    },
  );
});

test("prints a local report from saved sessions", async () => {
  const dbPath = join(tmpRoot, "report.db");
  const store = openStore(dbPath);

  try {
    store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Codex",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      duration_seconds: 300,
      retry_count: 1,
      error_count: 0,
      input_tokens_estimate: 1200,
      output_tokens_estimate: 500,
      cached_tokens_estimate: 100,
      estimated_cost_usd: 0.5,
      cost_source: "provider_usage",
      language: "TypeScript",
      framework: "Node.js",
      repo_size_bucket: "small",
      file_count_bucket: "medium",
      changed_file_count_bucket: "tiny",
      lines_added_bucket: "small",
      lines_removed_bucket: "tiny",
    });
    store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      tool: "Claude Code",
      task_type: "feature",
      final_outcome: "rejected",
      work_mode: "manual_log",
      framework: "Django",
      tests_outcome: "failed",
      retry_count: 2,
      error_count: 2,
      input_tokens_estimate: 800,
      output_tokens_estimate: 300,
      estimated_cost_usd: 1,
      cost_source: "estimated",
      repo_size_bucket: "medium",
      file_count_bucket: "large",
      changed_file_count_bucket: "small",
      lines_added_bucket: "medium",
      lines_removed_bucket: "small",
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
  assert.match(stdout, /Sessions by provider:/);
  assert.match(stdout, /OpenAI: 1/);
  assert.match(stdout, /Anthropic: 1/);
  assert.match(stdout, /OpenAI\/gpt-5: 1/);
  assert.match(stdout, /Anthropic\/claude-sonnet-4\.5: 1/);
  assert.match(stdout, /Sessions by tool:/);
  assert.match(stdout, /Codex: 1/);
  assert.match(stdout, /Claude Code: 1/);
  assert.match(stdout, /Sessions by language:/);
  assert.match(stdout, /TypeScript: 1/);
  assert.match(stdout, /unknown: 1/);
  assert.match(stdout, /Sessions by framework:/);
  assert.match(stdout, /Node\.js: 1/);
  assert.match(stdout, /Django: 1/);
  assert.match(stdout, /Sessions by work mode:/);
  assert.match(stdout, /manual_log: 2/);
  assert.match(stdout, /Sessions by cost source:/);
  assert.match(stdout, /provider_usage: 1/);
  assert.match(stdout, /estimated: 1/);
  assert.match(stdout, /Sessions by repo size bucket:/);
  assert.match(stdout, /small: 1/);
  assert.match(stdout, /medium: 1/);
  assert.match(stdout, /Sessions by file count bucket:/);
  assert.match(stdout, /large: 1/);
  assert.match(stdout, /Sessions by changed file count bucket:/);
  assert.match(stdout, /tiny: 1/);
  assert.match(stdout, /Sessions by lines added bucket:/);
  assert.match(stdout, /small: 1/);
  assert.match(stdout, /Sessions by lines removed bucket:/);
  assert.match(stdout, /tiny: 1/);
  assert.match(stdout, /Sessions by duration bucket:/);
  assert.match(stdout, /1m_to_5m: 1/);
  assert.match(stdout, /Sessions by error count bucket:/);
  assert.match(stdout, /zero: 1/);
  assert.match(stdout, /tiny: 1/);
  assert.match(stdout, /bug_fix: 1/);
  assert.match(stdout, /feature: 1/);
  assert.match(stdout, /Accepted or partially accepted: 1/);
  assert.match(stdout, /Rejected: 1/);
  assert.match(stdout, /Estimated total cost: \$1\.5000/);
  assert.match(stdout, /Cost per useful task: \$1\.5000/);
  assert.match(stdout, /Failure cost: \$1\.0000/);
  assert.match(stdout, /Cost by provider:/);
  assert.match(stdout, /OpenAI: \$0\.5000/);
  assert.match(stdout, /Anthropic: \$1\.0000/);
  assert.match(stdout, /Cost by tool:/);
  assert.match(stdout, /Codex: \$0\.5000/);
  assert.match(stdout, /Claude Code: \$1\.0000/);
  assert.match(stdout, /Cost by language:/);
  assert.match(stdout, /TypeScript: \$0\.5000/);
  assert.match(stdout, /unknown: \$1\.0000/);
  assert.match(stdout, /Cost by framework:/);
  assert.match(stdout, /Node\.js: \$0\.5000/);
  assert.match(stdout, /Django: \$1\.0000/);
  assert.match(stdout, /Cost by work mode:/);
  assert.match(stdout, /manual_log: \$1\.5000/);
  assert.match(stdout, /Cost by cost source:/);
  assert.match(stdout, /provider_usage: \$0\.5000/);
  assert.match(stdout, /estimated: \$1\.0000/);
  assert.match(stdout, /Cost by repo size bucket:/);
  assert.match(stdout, /small: \$0\.5000/);
  assert.match(stdout, /medium: \$1\.0000/);
  assert.match(stdout, /Cost by file count bucket:/);
  assert.match(stdout, /large: \$1\.0000/);
  assert.match(stdout, /Cost by changed file count bucket:/);
  assert.match(stdout, /tiny: \$0\.5000/);
  assert.match(stdout, /Cost by lines added bucket:/);
  assert.match(stdout, /small: \$0\.5000/);
  assert.match(stdout, /Cost by lines removed bucket:/);
  assert.match(stdout, /tiny: \$0\.5000/);
  assert.match(stdout, /Cost by duration bucket:/);
  assert.match(stdout, /1m_to_5m: \$0\.5000/);
  assert.match(stdout, /Cost by error count bucket:/);
  assert.match(stdout, /zero: \$0\.5000/);
  assert.match(stdout, /tiny: \$1\.0000/);
  assert.match(stdout, /Token estimate summary:/);
  assert.match(stdout, /Sessions with token estimates: 2/);
  assert.match(stdout, /Input tokens estimate: 2000/);
  assert.match(stdout, /Output tokens estimate: 800/);
  assert.match(stdout, /Cached tokens estimate: 100/);
  assert.match(stdout, /Total tokens estimate: 2900/);
  assert.match(stdout, /Error count summary:/);
  assert.match(stdout, /Sessions with error counts: 2/);
  assert.match(stdout, /Total error count: 2/);
  assert.match(stdout, /Average errors per recorded session: 1\.00/);
  assert.match(stdout, /Speed to useful output: 300\.0s/);
  assert.match(stdout, /Retry burden: 1\.00/);
  assert.match(stdout, /Total retries on rejected sessions: 2/);
  assert.match(stdout, /Failure retry burden: 2\.00/);
  assert.match(stdout, /Confidence level: insufficient/);
  assert.match(stdout, /Known outcome sessions: 2/);
  assert.match(stdout, /Verified sessions: 2/);
  assert.match(stdout, /Verification share: 100\.0% \(2\/2\)/);
  assert.match(stdout, /Useful outcome rate: 50\.0% \(1\/2\)/);
  assert.match(stdout, /Unknown outcome rate: 0\.0% \(0\/2\)/);
  assert.match(stdout, /Verified success rate: 50\.0% \(1\/2\)/);
});

test("prints a filtered local report from saved sessions", async () => {
  const dbPath = join(tmpRoot, "report-filtered.db");
  const store = openStore(dbPath);

  try {
    store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Codex",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      duration_seconds: 300,
      retry_count: 1,
      error_count: 0,
      input_tokens_estimate: 1200,
      output_tokens_estimate: 500,
      cached_tokens_estimate: 100,
      estimated_cost_usd: 0.5,
      cost_source: "provider_usage",
      language: "TypeScript",
      framework: "Node.js",
      repo_size_bucket: "small",
      file_count_bucket: "medium",
      changed_file_count_bucket: "tiny",
      lines_added_bucket: "small",
      lines_removed_bucket: "tiny",
    });
    store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      tool: "Claude Code",
      task_type: "feature",
      final_outcome: "rejected",
      work_mode: "manual_log",
      tests_outcome: "failed",
      retry_count: 2,
      estimated_cost_usd: 1,
    });
    store.createSession({
      timestamp: "2026-06-11T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Codex",
      language: "TypeScript",
      task_type: "documentation",
      final_outcome: "accepted",
      work_mode: "manual_log",
      framework: "Node.js",
      tests_outcome: "passed",
      retry_count: 3,
      estimated_cost_usd: 2,
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "report",
    "--provider",
    "OpenAI",
    "--model-id",
    "gpt-5",
    "--tool",
    "Codex",
    "--language",
    "TypeScript",
    "--framework",
    "Node.js",
    "--work-mode",
    "manual_log",
    "--task-type",
    "bug_fix",
    "--final-outcome",
    "accepted",
    "--db-path",
    dbPath,
  ]);

  assert.match(stdout, /Total sessions: 1/);
  assert.match(stdout, /OpenAI\/gpt-5: 1/);
  assert.match(stdout, /Codex: 1/);
  assert.match(stdout, /TypeScript: 1/);
  assert.match(stdout, /Node\.js: 1/);
  assert.match(stdout, /manual_log: 1/);
  assert.match(stdout, /provider_usage: 1/);
  assert.match(stdout, /small: 1/);
  assert.match(stdout, /medium: 1/);
  assert.match(stdout, /tiny: 1/);
  assert.match(stdout, /small: 1/);
  assert.match(stdout, /bug_fix: 1/);
  assert.match(stdout, /Accepted or partially accepted: 1/);
  assert.match(stdout, /Estimated total cost: \$0\.5000/);
  assert.match(stdout, /Cost per useful task: \$0\.5000/);
  assert.match(stdout, /Failure cost: \$0\.0000/);
  assert.match(stdout, /Speed to useful output: 300\.0s/);
  assert.match(stdout, /Retry burden: 1\.00/);
  assert.match(stdout, /Total retries on rejected sessions: 0/);
  assert.match(stdout, /Failure retry burden: unknown/);
  assert.match(stdout, /Unknown outcome rate: 0\.0% \(0\/1\)/);
  assert.doesNotMatch(stdout, /Anthropic\/claude-sonnet-4\.5/);
  assert.doesNotMatch(stdout, /documentation: 1/);
});

test("prints a date-filtered local report from saved sessions", async () => {
  const dbPath = join(tmpRoot, "report-date-filtered.db");
  const store = openStore(dbPath);

  try {
    store.createSession({
      timestamp: "2026-06-08T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "oldest-model",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      duration_seconds: 300,
      retry_count: 1,
      error_count: 0,
      input_tokens_estimate: 1200,
      output_tokens_estimate: 500,
      cached_tokens_estimate: 100,
      estimated_cost_usd: 0.5,
      cost_source: "provider_usage",
      language: "TypeScript",
      framework: "Node.js",
      repo_size_bucket: "small",
      file_count_bucket: "medium",
      changed_file_count_bucket: "tiny",
      lines_added_bucket: "small",
    });
    store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "middle-model",
      task_type: "feature",
      final_outcome: "rejected",
      work_mode: "manual_log",
      tests_outcome: "failed",
      duration_seconds: 200,
      retry_count: 2,
      estimated_cost_usd: 1,
      cost_source: "estimated",
      repo_size_bucket: "medium",
      file_count_bucket: "large",
      changed_file_count_bucket: "small",
      lines_added_bucket: "medium",
      lines_removed_bucket: "small",
    });
    store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "Google",
      model_id: "newest-model",
      task_type: "documentation",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      retry_count: 3,
      estimated_cost_usd: 2,
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "report",
    "--since",
    "2026-06-09T00:00:00.000Z",
    "--until",
    "2026-06-10T00:00:00.000Z",
    "--db-path",
    dbPath,
  ]);

  assert.match(stdout, /Total sessions: 1/);
  assert.match(stdout, /Anthropic\/middle-model: 1/);
  assert.match(stdout, /feature: 1/);
  assert.match(stdout, /Rejected: 1/);
  assert.match(stdout, /Estimated total cost: \$1\.0000/);
  assert.match(stdout, /Cost per useful task: unknown/);
  assert.match(stdout, /Failure cost: \$1\.0000/);
  assert.match(stdout, /Speed to useful output: unknown/);
  assert.match(stdout, /Total retries on rejected sessions: 2/);
  assert.match(stdout, /Failure retry burden: 2\.00/);
  assert.match(stdout, /Unknown outcome rate: 0\.0% \(0\/1\)/);
  assert.doesNotMatch(stdout, /OpenAI\/oldest-model/);
  assert.doesNotMatch(stdout, /Google\/newest-model/);
});

test("prints a limited local report from newest sessions", async () => {
  const dbPath = join(tmpRoot, "report-limited.db");
  const store = openStore(dbPath);

  try {
    store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "oldest-model",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      duration_seconds: 300,
      retry_count: 1,
      error_count: 0,
      input_tokens_estimate: 1200,
      output_tokens_estimate: 500,
      cached_tokens_estimate: 100,
      estimated_cost_usd: 0.5,
    });
    store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "middle-model",
      task_type: "feature",
      final_outcome: "rejected",
      work_mode: "manual_log",
      tests_outcome: "failed",
      retry_count: 2,
      error_count: 2,
      input_tokens_estimate: 800,
      output_tokens_estimate: 300,
      estimated_cost_usd: 1,
    });
    store.createSession({
      timestamp: "2026-06-11T12:00:00.000Z",
      provider: "Google",
      model_id: "newest-model",
      task_type: "documentation",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      retry_count: 3,
      estimated_cost_usd: 2,
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "report",
    "--limit",
    "2",
    "--db-path",
    dbPath,
  ]);

  assert.match(stdout, /Total sessions: 2/);
  assert.match(stdout, /Google\/newest-model: 1/);
  assert.match(stdout, /Anthropic\/middle-model: 1/);
  assert.match(stdout, /Estimated total cost: \$3\.0000/);
  assert.doesNotMatch(stdout, /OpenAI\/oldest-model/);
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

  assert.equal(report.reportSchemaVersion, "opensasa.report.v0");
  assert.equal(report.metadataSchemaVersion, "opensasa.metadata.v0");
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
      tool: "Codex",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      duration_seconds: 300,
      retry_count: 1,
      error_count: 0,
      input_tokens_estimate: 1200,
      output_tokens_estimate: 500,
      cached_tokens_estimate: 100,
      estimated_cost_usd: 0.5,
      cost_source: "provider_usage",
      language: "TypeScript",
      framework: "Node.js",
      repo_size_bucket: "small",
      file_count_bucket: "medium",
      changed_file_count_bucket: "tiny",
      lines_added_bucket: "small",
      lines_removed_bucket: "tiny",
    });
    store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      tool: "Claude Code",
      task_type: "feature",
      final_outcome: "rejected",
      work_mode: "manual_log",
      tests_outcome: "failed",
      retry_count: 2,
      error_count: 2,
      input_tokens_estimate: 800,
      output_tokens_estimate: 300,
      estimated_cost_usd: 1,
      cost_source: "estimated",
      repo_size_bucket: "medium",
      file_count_bucket: "large",
      changed_file_count_bucket: "small",
      lines_added_bucket: "medium",
      lines_removed_bucket: "small",
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

  assert.equal(report.reportSchemaVersion, "opensasa.report.v0");
  assert.equal(report.metadataSchemaVersion, "opensasa.metadata.v0");
  assert.equal(report.totalSessions, 2);
  assert.equal(report.sessionsByProvider.OpenAI, 1);
  assert.equal(report.sessionsByProvider.Anthropic, 1);
  assert.equal(report.sessionsByModel["OpenAI/gpt-5"], 1);
  assert.equal(report.sessionsByModel["Anthropic/claude-sonnet-4.5"], 1);
  assert.equal(report.sessionsByTool.Codex, 1);
  assert.equal(report.sessionsByTool["Claude Code"], 1);
  assert.equal(report.sessionsByLanguage.TypeScript, 1);
  assert.equal(report.sessionsByLanguage.unknown, 1);
  assert.equal(report.sessionsByFramework.unknown, 1);
  assert.equal(report.sessionsByFramework["Node.js"], 1);
  assert.equal(report.sessionsByWorkMode.manual_log, 2);
  assert.equal(report.sessionsByCostSource.provider_usage, 1);
  assert.equal(report.sessionsByCostSource.estimated, 1);
  assert.equal(report.sessionsByRepoSizeBucket.small, 1);
  assert.equal(report.sessionsByRepoSizeBucket.medium, 1);
  assert.equal(report.sessionsByFileCountBucket.medium, 1);
  assert.equal(report.sessionsByFileCountBucket.large, 1);
  assert.equal(report.sessionsByChangedFileCountBucket.tiny, 1);
  assert.equal(report.sessionsByChangedFileCountBucket.small, 1);
  assert.equal(report.sessionsByLinesAddedBucket.small, 1);
  assert.equal(report.sessionsByLinesAddedBucket.medium, 1);
  assert.equal(report.sessionsByLinesRemovedBucket.tiny, 1);
  assert.equal(report.sessionsByLinesRemovedBucket.small, 1);
  assert.equal(report.sessionsByDurationBucket["1m_to_5m"], 1);
  assert.equal(report.sessionsByDurationBucket.unknown, 1);
  assert.equal(report.sessionsByErrorCountBucket.zero, 1);
  assert.equal(report.sessionsByErrorCountBucket.tiny, 1);
  assert.equal(report.estimatedTotalCostUsd, 1.5);
  assert.equal(report.costByProviderUsd.OpenAI, 0.5);
  assert.equal(report.costByProviderUsd.Anthropic, 1);
  assert.equal(report.costByToolUsd.Codex, 0.5);
  assert.equal(report.costByToolUsd["Claude Code"], 1);
  assert.equal(report.costByLanguageUsd.TypeScript, 0.5);
  assert.equal(report.costByLanguageUsd.unknown, 1);
  assert.equal(report.costByFrameworkUsd.unknown, 1);
  assert.equal(report.costByFrameworkUsd["Node.js"], 0.5);
  assert.equal(report.costByWorkModeUsd.manual_log, 1.5);
  assert.equal(report.costByCostSourceUsd.provider_usage, 0.5);
  assert.equal(report.costByCostSourceUsd.estimated, 1);
  assert.equal(report.costByRepoSizeBucketUsd.small, 0.5);
  assert.equal(report.costByRepoSizeBucketUsd.medium, 1);
  assert.equal(report.costByFileCountBucketUsd.medium, 0.5);
  assert.equal(report.costByFileCountBucketUsd.large, 1);
  assert.equal(report.costByChangedFileCountBucketUsd.tiny, 0.5);
  assert.equal(report.costByChangedFileCountBucketUsd.small, 1);
  assert.equal(report.costByLinesAddedBucketUsd.small, 0.5);
  assert.equal(report.costByLinesAddedBucketUsd.medium, 1);
  assert.equal(report.costByLinesRemovedBucketUsd.tiny, 0.5);
  assert.equal(report.costByLinesRemovedBucketUsd.small, 1);
  assert.equal(report.costByDurationBucketUsd["1m_to_5m"], 0.5);
  assert.equal(report.costByDurationBucketUsd.unknown, 1);
  assert.equal(report.costByErrorCountBucketUsd.zero, 0.5);
  assert.equal(report.costByErrorCountBucketUsd.tiny, 1);
  assert.deepEqual(report.tokenEstimateSummary, {
    sessionsWithTokenEstimates: 2,
    inputTokensEstimateTotal: 2000,
    outputTokensEstimateTotal: 800,
    cachedTokensEstimateTotal: 100,
    totalTokensEstimate: 2900,
  });
  assert.deepEqual(report.errorCountSummary, {
    sessionsWithErrorCounts: 2,
    totalErrorCount: 2,
    averageErrorsPerRecordedSession: 1,
  });
  assert.equal(report.costPerUsefulTaskUsd, 1.5);
  assert.equal(report.failureCostUsd, 1);
  assert.equal(report.speedToUsefulOutputSeconds, 300);
  assert.equal(report.retrySummary.retryBurden, 1);
  assert.equal(report.failureRetrySummary.totalRetries, 2);
  assert.equal(report.failureRetrySummary.rejectedSessionCount, 1);
  assert.equal(report.failureRetrySummary.failureRetryBurden, 2);
  assert.equal(report.confidenceSummary.level, "insufficient");
  assert.equal(report.confidenceSummary.knownOutcomeCount, 2);
  assert.equal(report.confidenceSummary.verifiedSessionCount, 2);
  assert.equal(report.confidenceSummary.verificationShare.rate, 1);
  assert.equal(report.usefulOutcomeRate.rate, 0.5);
  assert.equal(report.unknownOutcomeRate.rate, 0);
  assert.equal(report.verifiedSuccessRate.rate, 0.5);
});

test("prints a filtered local report as JSON", async () => {
  const dbPath = join(tmpRoot, "report-filtered-json.db");
  const store = openStore(dbPath);

  try {
    store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      duration_seconds: 300,
      retry_count: 1,
      error_count: 0,
      input_tokens_estimate: 1200,
      output_tokens_estimate: 500,
      cached_tokens_estimate: 100,
      estimated_cost_usd: 0.5,
      cost_source: "provider_usage",
      repo_size_bucket: "small",
      file_count_bucket: "medium",
      changed_file_count_bucket: "tiny",
      lines_added_bucket: "small",
      lines_removed_bucket: "tiny",
    });
    store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      tool: "Claude Code",
      language: "Python",
      framework: "Django",
      task_type: "bug_fix",
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
    "--provider",
    "OpenAI",
    "--tool",
    "Codex",
    "--language",
    "TypeScript",
    "--framework",
    "Node.js",
    "--work-mode",
    "manual_log",
    "--task-type",
    "bug_fix",
    "--db-path",
    dbPath,
  ]);
  const report = JSON.parse(stdout);

  assert.equal(report.reportSchemaVersion, "opensasa.report.v0");
  assert.equal(report.metadataSchemaVersion, "opensasa.metadata.v0");
  assert.equal(report.totalSessions, 1);
  assert.deepEqual(report.sessionsByModel, { "OpenAI/gpt-5": 1 });
  assert.deepEqual(report.sessionsByTool, { Codex: 1 });
  assert.deepEqual(report.sessionsByLanguage, { TypeScript: 1 });
  assert.deepEqual(report.sessionsByFramework, { "Node.js": 1 });
  assert.deepEqual(report.sessionsByWorkMode, { manual_log: 1 });
  assert.deepEqual(report.sessionsByCostSource, { provider_usage: 1 });
  assert.deepEqual(report.sessionsByRepoSizeBucket, { small: 1 });
  assert.deepEqual(report.sessionsByFileCountBucket, { medium: 1 });
  assert.deepEqual(report.sessionsByChangedFileCountBucket, { tiny: 1 });
  assert.deepEqual(report.sessionsByLinesAddedBucket, { small: 1 });
  assert.deepEqual(report.sessionsByLinesRemovedBucket, { tiny: 1 });
  assert.deepEqual(report.sessionsByDurationBucket, { "1m_to_5m": 1 });
  assert.deepEqual(report.sessionsByErrorCountBucket, { zero: 1 });
  assert.deepEqual(report.sessionsByTaskType, { bug_fix: 1 });
  assert.equal(report.estimatedTotalCostUsd, 0.5);
  assert.deepEqual(report.costByFrameworkUsd, { "Node.js": 0.5 });
  assert.deepEqual(report.costByWorkModeUsd, { manual_log: 0.5 });
  assert.deepEqual(report.costByCostSourceUsd, { provider_usage: 0.5 });
  assert.deepEqual(report.costByRepoSizeBucketUsd, { small: 0.5 });
  assert.deepEqual(report.costByFileCountBucketUsd, { medium: 0.5 });
  assert.deepEqual(report.costByChangedFileCountBucketUsd, { tiny: 0.5 });
  assert.deepEqual(report.costByLinesAddedBucketUsd, { small: 0.5 });
  assert.deepEqual(report.costByLinesRemovedBucketUsd, { tiny: 0.5 });
  assert.deepEqual(report.costByDurationBucketUsd, { "1m_to_5m": 0.5 });
  assert.deepEqual(report.costByErrorCountBucketUsd, { zero: 0.5 });
  assert.deepEqual(report.tokenEstimateSummary, {
    sessionsWithTokenEstimates: 1,
    inputTokensEstimateTotal: 1200,
    outputTokensEstimateTotal: 500,
    cachedTokensEstimateTotal: 100,
    totalTokensEstimate: 1800,
  });
  assert.deepEqual(report.errorCountSummary, {
    sessionsWithErrorCounts: 1,
    totalErrorCount: 0,
    averageErrorsPerRecordedSession: 0,
  });
  assert.equal(report.costPerUsefulTaskUsd, 0.5);
  assert.equal(report.failureCostUsd, 0);
  assert.equal(report.speedToUsefulOutputSeconds, 300);
  assert.equal(report.failureRetrySummary.totalRetries, 0);
  assert.equal(report.failureRetrySummary.rejectedSessionCount, 0);
  assert.equal(report.failureRetrySummary.failureRetryBurden, null);
  assert.equal(report.usefulOutcomeRate.rate, 1);
  assert.equal(report.unknownOutcomeRate.rate, 0);
  assert.equal(report.verifiedSuccessRate.rate, 1);
});

test("prints a date-filtered local report as JSON", async () => {
  const dbPath = join(tmpRoot, "report-date-filtered-json.db");
  const store = openStore(dbPath);

  try {
    store.createSession({
      timestamp: "2026-06-08T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "oldest-model",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      retry_count: 1,
      estimated_cost_usd: 0.5,
    });
    store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "middle-model",
      task_type: "feature",
      final_outcome: "rejected",
      work_mode: "manual_log",
      tests_outcome: "failed",
      retry_count: 2,
      estimated_cost_usd: 1,
    });
    store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "Google",
      model_id: "newest-model",
      task_type: "documentation",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      retry_count: 3,
      estimated_cost_usd: 2,
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "report",
    "--json",
    "--since",
    "2026-06-09T00:00:00.000Z",
    "--until",
    "2026-06-10T00:00:00.000Z",
    "--db-path",
    dbPath,
  ]);
  const report = JSON.parse(stdout);

  assert.equal(report.totalSessions, 1);
  assert.deepEqual(report.sessionsByModel, { "Anthropic/middle-model": 1 });
  assert.deepEqual(report.sessionsByTaskType, { feature: 1 });
  assert.equal(report.estimatedTotalCostUsd, 1);
  assert.equal(report.costPerUsefulTaskUsd, null);
  assert.equal(report.failureCostUsd, 1);
  assert.equal(report.speedToUsefulOutputSeconds, null);
  assert.equal(report.failureRetrySummary.totalRetries, 2);
  assert.equal(report.failureRetrySummary.failureRetryBurden, 2);
  assert.equal(report.unknownOutcomeRate.rate, 0);
  assert.equal(report.rejectedCount, 1);
});

test("prints a limited filtered local report as JSON", async () => {
  const dbPath = join(tmpRoot, "report-limited-filtered-json.db");
  const store = openStore(dbPath);

  try {
    store.createSession({
      timestamp: "2026-06-09T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "oldest-model",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      retry_count: 1,
      estimated_cost_usd: 0.5,
    });
    store.createSession({
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "middle-model",
      task_type: "bug_fix",
      final_outcome: "rejected",
      work_mode: "manual_log",
      tests_outcome: "failed",
      retry_count: 2,
      estimated_cost_usd: 1,
    });
    store.createSession({
      timestamp: "2026-06-11T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "newest-model",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      duration_seconds: 120,
      retry_count: 3,
      estimated_cost_usd: 2,
    });
    store.createSession({
      timestamp: "2026-06-12T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "excluded-model",
      task_type: "bug_fix",
      final_outcome: "accepted",
      work_mode: "manual_log",
      tests_outcome: "passed",
      retry_count: 4,
      estimated_cost_usd: 4,
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "report",
    "--json",
    "--provider",
    "OpenAI",
    "--limit",
    "2",
    "--db-path",
    dbPath,
  ]);
  const report = JSON.parse(stdout);

  assert.equal(report.totalSessions, 2);
  assert.deepEqual(report.sessionsByModel, {
    "OpenAI/newest-model": 1,
    "OpenAI/middle-model": 1,
  });
  assert.equal(report.estimatedTotalCostUsd, 3);
  assert.equal(report.costPerUsefulTaskUsd, 3);
  assert.equal(report.failureCostUsd, 1);
  assert.equal(report.speedToUsefulOutputSeconds, 120);
  assert.equal(report.failureRetrySummary.totalRetries, 2);
  assert.equal(report.failureRetrySummary.failureRetryBurden, 2);
  assert.equal(report.unknownOutcomeRate.rate, 0);
  assert.equal(Object.hasOwn(report.sessionsByModel, "OpenAI/oldest-model"), false);
  assert.equal(Object.hasOwn(report.sessionsByModel, "Anthropic/excluded-model"), false);
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
      contribution_consent: "granted",
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
  assert.match(stdout, /Consent: granted/);
  assert.match(stdout, /Upload enabled: no/);
  assert.match(stdout, /No upload will occur in this MVP/);
  assert.match(stdout, /Validation:/);
  assert.match(stdout, /status: passed/);
  assert.match(stdout, /missing_required_fields: none/);
  assert.match(stdout, /forbidden_fields_present: none/);
  assert.match(stdout, /unknown_fields_present: none/);
  assert.match(stdout, /checked_field_count: /);
  assert.match(stdout, /payload_version: v0.2.0/);
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
      contribution_consent: "granted",
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
  assert.equal(preview.consent, "granted");
  assert.equal(preview.upload_enabled, false);
  assert.equal(preview.destination, "none");
  assert.equal(preview.validation.status, "passed");
  assert.deepEqual(preview.validation.missing_required_fields, []);
  assert.deepEqual(preview.validation.forbidden_fields_present, []);
  assert.deepEqual(preview.validation.unknown_fields_present, []);
  assert.equal(preview.validation.summary.missing_required_field_count, 0);
  assert.equal(preview.validation.summary.forbidden_field_count, 0);
  assert.equal(preview.validation.summary.unknown_field_count, 0);
  assert.equal(preview.included_fields.payload_version, "v0.2.0");
  assert.equal(preview.included_fields.timestamp_bucket, "2026-06-09");
  assert.equal(preview.included_fields.input_tokens_bucket, "large");
  assert.equal(preview.included_fields.estimated_cost_bucket, "under_1_usd");
  assert.equal(Object.hasOwn(preview.included_fields, "session_id"), false);
  assert.equal(Object.hasOwn(preview.included_fields, "timestamp"), false);
  assert.equal(Object.hasOwn(preview.included_fields, "estimated_cost_usd"), false);
  assert.match(preview.excluded_fields.join("\n"), /terminal output/);
});

test("exports a sanitized contribution payload to a local JSON file", async () => {
  const dbPath = join(tmpRoot, "contribution-export.db");
  const outputPath = join(tmpRoot, "exports", "session-export.json");
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
      contribution_consent: "granted",
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "export",
    session.session_id,
    "--out",
    outputPath,
    "--yes",
    "--db-path",
    dbPath,
  ]);
  const exported = JSON.parse(readFileSync(outputPath, "utf8"));
  const historyStore = openStore(dbPath);
  const history = historyStore.listContributionHistory();
  historyStore.close();

  assert.match(stdout, /Exported contribution payload contrib_[0-9a-f]{16} to /);
  assert.match(stdout, /Recorded local contribution history [0-9a-f-]{36}\./);
  assert.match(stdout, /Validation passed: \d+ fields checked, 0 missing required, 0 forbidden, 0 unknown\./);
  assert.match(stdout, /No upload will occur in this MVP/);
  assert.equal(exported.schema_version, "opensasa.metadata.v0");
  assert.equal(exported.payload_version, "v0.2.0");
  assert.equal(exported.timestamp_bucket, "2026-06-09");
  assert.equal(exported.estimated_cost_bucket, "under_1_usd");
  assert.equal(Object.hasOwn(exported, "session_id"), false);
  assert.equal(Object.hasOwn(exported, "timestamp"), false);
  assert.equal(Object.hasOwn(exported, "estimated_cost_usd"), false);
  assert.equal(history.length, 1);
  assert.equal(history[0].session_id, session.session_id);
  assert.equal(history[0].contribution_id, exported.contribution_id);
  assert.equal(history[0].output_path, outputPath);
});

test("exports contribution metadata as JSON output", async () => {
  const dbPath = join(tmpRoot, "contribution-export-json.db");
  const outputPath = join(tmpRoot, "exports", "session-export-json.json");
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
      contribution_consent: "granted",
    });
  } finally {
    store.close();
  }

  const { stdout } = await execFileAsync("node", [
    "./dist/index.js",
    "export",
    session.session_id,
    "--out",
    outputPath,
    "--yes",
    "--json",
    "--db-path",
    dbPath,
  ]);
  const result = JSON.parse(stdout);
  const exported = JSON.parse(readFileSync(outputPath, "utf8"));

  assert.equal(result.status, "exported");
  assert.equal(result.session_id, session.session_id);
  assert.match(result.contribution_id, /^contrib_[0-9a-f]{16}$/);
  assert.equal(result.payload_version, "v0.2.0");
  assert.equal(result.path, outputPath);
  assert.equal(result.validation.status, "passed");
  assert.deepEqual(result.validation.missing_required_fields, []);
  assert.deepEqual(result.validation.forbidden_fields_present, []);
  assert.deepEqual(result.validation.unknown_fields_present, []);
  assert.equal(result.history.session_id, session.session_id);
  assert.equal(result.history.contribution_id, result.contribution_id);
  assert.equal(result.history.payload_version, "v0.2.0");
  assert.equal(result.history.output_path, outputPath);
  assert.equal(exported.payload_version, "v0.2.0");
  assert.equal(exported.contribution_id, result.contribution_id);
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

test("returns an error when exporting a missing session", async () => {
  const dbPath = join(tmpRoot, "missing-export.db");

  await assert.rejects(
    execFileAsync("node", [
      "./dist/index.js",
      "export",
      "missing-session",
      "--out",
      join(tmpRoot, "missing-export.json"),
      "--yes",
      "--db-path",
      dbPath,
    ]),
    (error) => {
      assert.match(error.stderr, /Session not found: missing-session/);
      return true;
    },
  );
});

test("requires explicit confirmation before exporting a contribution payload", async () => {
  const dbPath = join(tmpRoot, "missing-export-confirmation.db");
  const outputPath = join(tmpRoot, "exports", "missing-export-confirmation.json");
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
      contribution_consent: "granted",
    });
  } finally {
    store.close();
  }

  await assert.rejects(
    execFileAsync("node", [
      "./dist/index.js",
      "export",
      session.session_id,
      "--out",
      outputPath,
      "--db-path",
      dbPath,
    ]),
    (error) => {
      assert.match(error.stderr, /required option '--yes'/);
      return true;
    },
  );
});

test("requires granted contribution consent before exporting a contribution payload", async () => {
  const dbPath = join(tmpRoot, "missing-export-consent.db");
  const outputPath = join(tmpRoot, "exports", "missing-export-consent.json");
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
      contribution_consent: "not_granted",
    });
  } finally {
    store.close();
  }

  await assert.rejects(
    execFileAsync("node", [
      "./dist/index.js",
      "export",
      session.session_id,
      "--out",
      outputPath,
      "--yes",
      "--db-path",
      dbPath,
    ]),
    (error) => {
      assert.match(error.stderr, /contribution consent to be granted/);
      return true;
    },
  );
});
