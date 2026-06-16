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

  assert.equal(stdout.trim(), "0.0.0");
});

test("prints log help with manual session options", async () => {
  const { stdout } = await execFileAsync("node", ["./dist/index.js", "log", "--help"]);

  assert.match(stdout, /--provider/);
  assert.match(stdout, /--model-id/);
  assert.match(stdout, /--task-type/);
  assert.match(stdout, /--final-outcome/);
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
