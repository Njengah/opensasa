import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { getDefaultDatabasePath, openStore } from "../dist/storage.js";

const tmpRoot = mkdtempSync(join(tmpdir(), "opensasa-storage-"));

after(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

const baseSession = {
  timestamp: "2026-06-09T12:00:00.000Z",
  provider: "OpenAI",
  model_id: "gpt-5",
  task_type: "bug_fix",
  final_outcome: "accepted",
  work_mode: "manual_log",
};

test("initializes a local SQLite database at an override path", () => {
  const dbPath = join(tmpRoot, "nested", "opensasa.db");
  const store = openStore(dbPath);

  try {
    assert.equal(store.path, dbPath);
    assert.equal(existsSync(dbPath), true);
  } finally {
    store.close();
  }

  const database = new Database(dbPath, { readonly: true });
  try {
    assert.deepEqual(
      database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
        .all()
        .map((row) => row.name),
      ["schema_migrations", "sessions"],
    );
  } finally {
    database.close();
  }
});

test("creates and reads a validated session with a generated ID", () => {
  const store = openStore(join(tmpRoot, "create-read.db"));

  try {
    const created = store.createSession({
      ...baseSession,
      tests_outcome: "passed",
      estimated_cost_usd: 0.25,
      cost_source: "estimated",
    });
    const read = store.getSession(created.session_id);

    assert.match(created.session_id, /^[0-9a-f-]{36}$/);
    assert.deepEqual(read, created);
    assert.equal(read.tests_outcome, "passed");
    assert.equal(read.estimated_cost_usd, 0.25);
  } finally {
    store.close();
  }
});

test("persists sessions across store reopen", () => {
  const dbPath = join(tmpRoot, "reopen.db");
  const firstStore = openStore(dbPath);
  const created = firstStore.createSession(baseSession);
  firstStore.close();

  const secondStore = openStore(dbPath);
  try {
    assert.deepEqual(secondStore.getSession(created.session_id), created);
  } finally {
    secondStore.close();
  }
});

test("lists sessions by newest timestamp first", () => {
  const store = openStore(join(tmpRoot, "list.db"));

  try {
    const older = store.createSession({
      ...baseSession,
      timestamp: "2026-06-09T12:00:00.000Z",
      model_id: "older-model",
    });
    const newer = store.createSession({
      ...baseSession,
      timestamp: "2026-06-10T12:00:00.000Z",
      model_id: "newer-model",
    });

    assert.deepEqual(
      store.listSessions().map((session) => session.session_id),
      [newer.session_id, older.session_id],
    );
  } finally {
    store.close();
  }
});

test("rejects invalid sessions before writing", () => {
  const store = openStore(join(tmpRoot, "invalid.db"));

  try {
    assert.throws(
      () =>
        store.createSession({
          ...baseSession,
          task_type: "private_source_dump",
        }),
      /Invalid option/,
    );
    assert.deepEqual(store.listSessions(), []);
  } finally {
    store.close();
  }
});

test("rejects excluded private fields before writing", () => {
  const store = openStore(join(tmpRoot, "private-fields.db"));

  try {
    assert.throws(
      () =>
        store.createSession({
          ...baseSession,
          prompt: "private implementation prompt",
          source_code: "const secret = true;",
        }),
      /Unrecognized keys/,
    );
    assert.deepEqual(store.listSessions(), []);
  } finally {
    store.close();
  }
});

test("rejects duplicate session IDs", () => {
  const store = openStore(join(tmpRoot, "duplicate.db"));
  const session = {
    ...baseSession,
    session_id: "session-1",
  };

  try {
    store.createSession(session);
    assert.throws(() => store.createSession(session), /UNIQUE constraint failed/);
  } finally {
    store.close();
  }
});

test("SQLite constraints reject invalid direct writes", () => {
  const dbPath = join(tmpRoot, "constraints.db");
  const store = openStore(dbPath);
  store.close();

  const database = new Database(dbPath);
  const insertDirectSession = database.prepare(
    `INSERT INTO sessions (
      session_id,
      schema_version,
      timestamp,
      provider,
      model_id,
      task_type,
      final_outcome,
      work_mode,
      duration_seconds,
      tests_outcome,
      build_outcome,
      lint_outcome,
      typecheck_outcome,
      manual_review_outcome
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  try {
    assert.throws(
      () =>
        insertDirectSession.run(
          "bad-session",
          "opensasa.metadata.v0",
          "2026-06-09T12:00:00.000Z",
          "OpenAI",
          "gpt-5",
          "private_source_dump",
          "accepted",
          "manual_log",
          -1,
          "passed",
          "unknown",
          "unknown",
          "unknown",
          "unknown",
        ),
      /CHECK constraint failed/,
    );
    assert.throws(
      () =>
        insertDirectSession.run(
          "fractional-session",
          "opensasa.metadata.v0",
          "2026-06-09T12:00:00.000Z",
          "OpenAI",
          "gpt-5",
          "bug_fix",
          "accepted",
          "manual_log",
          1.5,
          "passed",
          "unknown",
          "unknown",
          "unknown",
          "unknown",
        ),
      /CHECK constraint failed/,
    );
  } finally {
    database.close();
  }
});

test("uses the documented default local database path", () => {
  assert.match(getDefaultDatabasePath(), /[\\/]\.opensasa[\\/]opensasa\.db$/);
});
