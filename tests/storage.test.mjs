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
      ["activity_heartbeats", "contribution_history", "schema_migrations", "sessions"],
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
    assert.equal(read.contribution_consent, "not_granted");
  } finally {
    store.close();
  }
});

test("creates and updates local contribution consent state", () => {
  const store = openStore(join(tmpRoot, "contribution-consent.db"));

  try {
    const created = store.createSession({
      ...baseSession,
      contribution_consent: "granted",
    });
    const updated = store.updateSession(created.session_id, {
      contribution_consent: "revoked",
    });

    assert.equal(created.contribution_consent, "granted");
    assert.equal(updated.contribution_consent, "revoked");
    assert.equal(
      store.getSession(created.session_id).contribution_consent,
      "revoked",
    );
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

test("records and lists local contribution history newest first", () => {
  const store = openStore(join(tmpRoot, "contribution-history.db"));

  try {
    store.recordContributionHistory({
      exported_at: "2026-06-09T12:00:00.000Z",
      session_id: "session-older",
      contribution_id: "contrib_older",
      payload_version: "v0.2.0",
      output_path: "C:\\exports\\older.json",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      task_type: "bug_fix",
      final_outcome: "accepted",
      consent_state: "granted",
      validation_status: "passed",
    });
    const newer = store.recordContributionHistory({
      exported_at: "2026-06-10T12:00:00.000Z",
      session_id: "session-newer",
      contribution_id: "contrib_newer",
      payload_version: "v0.2.0",
      output_path: "C:\\exports\\newer.json",
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      task_type: "feature",
      final_outcome: "accepted",
      consent_state: "granted",
      validation_status: "passed",
    });

    const history = store.listContributionHistory();

    assert.match(newer.history_id, /^[0-9a-f-]{36}$/);
    assert.deepEqual(history.map((entry) => entry.contribution_id), [
      "contrib_newer",
      "contrib_older",
    ]);
    assert.equal(history[0].provider, "Anthropic");
    assert.equal(history[1].output_path, "C:\\exports\\older.json");
  } finally {
    store.close();
  }
});

test("updates a validated session while preserving its ID", () => {
  const store = openStore(join(tmpRoot, "update.db"));

  try {
    const created = store.createSession(baseSession);
    const updated = store.updateSession(created.session_id, {
      final_outcome: "partially_accepted",
      tests_outcome: "passed",
      retry_count: 2,
      estimated_cost_usd: 0.75,
    });

    assert.equal(updated.session_id, created.session_id);
    assert.equal(updated.provider, "OpenAI");
    assert.equal(updated.final_outcome, "partially_accepted");
    assert.equal(updated.tests_outcome, "passed");
    assert.equal(updated.retry_count, 2);
    assert.equal(updated.estimated_cost_usd, 0.75);
    assert.deepEqual(store.getSession(created.session_id), updated);
  } finally {
    store.close();
  }
});

test("returns null when updating a missing session", () => {
  const store = openStore(join(tmpRoot, "update-missing.db"));

  try {
    assert.equal(store.updateSession("missing-session", { final_outcome: "accepted" }), null);
  } finally {
    store.close();
  }
});

test("rejects invalid session updates before writing", () => {
  const store = openStore(join(tmpRoot, "update-invalid.db"));

  try {
    const created = store.createSession(baseSession);

    assert.throws(
      () => store.updateSession(created.session_id, { final_outcome: "private_source_dump" }),
      /Invalid option/,
    );
    assert.equal(store.getSession(created.session_id).final_outcome, "accepted");
  } finally {
    store.close();
  }
});

test("rejects invalid local contribution consent state", () => {
  const store = openStore(join(tmpRoot, "invalid-contribution-consent.db"));

  try {
    assert.throws(
      () =>
        store.createSession({
          ...baseSession,
          contribution_consent: "silent_upload",
        }),
      /Invalid option/,
    );
    assert.deepEqual(store.listSessions(), []);
  } finally {
    store.close();
  }
});

test("deletes an existing session", () => {
  const store = openStore(join(tmpRoot, "delete.db"));

  try {
    const created = store.createSession(baseSession);

    assert.equal(store.deleteSession(created.session_id), true);
    assert.equal(store.getSession(created.session_id), null);
    assert.deepEqual(store.listSessions(), []);
  } finally {
    store.close();
  }
});

test("returns false when deleting a missing session", () => {
  const store = openStore(join(tmpRoot, "delete-missing.db"));

  try {
    assert.equal(store.deleteSession("missing-session"), false);
  } finally {
    store.close();
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

test("lists sessions by newest instant when timestamps use offsets", () => {
  const store = openStore(join(tmpRoot, "list-offset-order.db"));

  try {
    const olderInstant = store.createSession({
      ...baseSession,
      timestamp: "2026-06-09T00:30:00.000+03:00",
      model_id: "older-instant-model",
    });
    const newerInstant = store.createSession({
      ...baseSession,
      timestamp: "2026-06-08T23:30:00.000Z",
      model_id: "newer-instant-model",
    });

    assert.deepEqual(
      store.listSessions().map((session) => session.session_id),
      [newerInstant.session_id, olderInstant.session_id],
    );
  } finally {
    store.close();
  }
});

test("limits listed sessions after newest-first sorting", () => {
  const store = openStore(join(tmpRoot, "list-limit.db"));

  try {
    const oldest = store.createSession({
      ...baseSession,
      timestamp: "2026-06-08T12:00:00.000Z",
      model_id: "oldest-model",
    });
    const middle = store.createSession({
      ...baseSession,
      timestamp: "2026-06-09T12:00:00.000Z",
      model_id: "middle-model",
    });
    const newest = store.createSession({
      ...baseSession,
      timestamp: "2026-06-10T12:00:00.000Z",
      model_id: "newest-model",
    });

    assert.deepEqual(
      store.listSessions({ limit: 2 }).map((session) => session.session_id),
      [newest.session_id, middle.session_id],
    );
    assert.equal(
      store.listSessions({ limit: 2 }).some((session) => session.session_id === oldest.session_id),
      false,
    );
  } finally {
    store.close();
  }
});

test("filters listed sessions by safe metadata fields", () => {
  const store = openStore(join(tmpRoot, "list-filters.db"));

  try {
    const matching = store.createSession({
      ...baseSession,
      timestamp: "2026-06-10T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      work_mode: "manual_log",
      task_type: "bug_fix",
      final_outcome: "accepted",
    });
    store.createSession({
      ...baseSession,
      timestamp: "2026-06-11T12:00:00.000Z",
      provider: "OpenAI",
      model_id: "gpt-5",
      tool: "Claude Code",
      language: "TypeScript",
      framework: "Node.js",
      work_mode: "manual_log",
      task_type: "documentation",
      final_outcome: "accepted",
    });
    store.createSession({
      ...baseSession,
      timestamp: "2026-06-12T12:00:00.000Z",
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      tool: "Codex",
      language: "Python",
      framework: "Django",
      work_mode: "agent_log",
      task_type: "bug_fix",
      final_outcome: "rejected",
    });

    assert.deepEqual(
      store
        .listSessions({
          provider: "OpenAI",
          modelId: "gpt-5",
          tool: "Codex",
          language: "TypeScript",
          framework: "Node.js",
          workMode: "manual_log",
          taskType: "bug_fix",
          finalOutcome: "accepted",
        })
        .map((session) => session.session_id),
      [matching.session_id],
    );
  } finally {
    store.close();
  }
});

test("filters listed sessions by inclusive timestamp range", () => {
  const store = openStore(join(tmpRoot, "list-date-filters.db"));

  try {
    const oldest = store.createSession({
      ...baseSession,
      timestamp: "2026-06-08T12:00:00.000Z",
      model_id: "oldest-model",
    });
    const middle = store.createSession({
      ...baseSession,
      timestamp: "2026-06-09T12:00:00.000Z",
      model_id: "middle-model",
    });
    const newest = store.createSession({
      ...baseSession,
      timestamp: "2026-06-10T12:00:00.000Z",
      model_id: "newest-model",
    });

    assert.deepEqual(
      store
        .listSessions({
          since: "2026-06-09T00:00:00.000Z",
          until: "2026-06-10T00:00:00.000Z",
        })
        .map((session) => session.session_id),
      [middle.session_id],
    );
    assert.equal(
      store
        .listSessions({ since: "2026-06-08T12:00:00.000Z" })
        .some((session) => session.session_id === oldest.session_id),
      true,
    );
    assert.equal(
      store
        .listSessions({ until: "2026-06-10T12:00:00.000Z" })
        .some((session) => session.session_id === newest.session_id),
      true,
    );
  } finally {
    store.close();
  }
});

test("filters listed sessions by timestamp instants when offsets differ", () => {
  const store = openStore(join(tmpRoot, "list-date-offset-filters.db"));

  try {
    const beforeBoundary = store.createSession({
      ...baseSession,
      timestamp: "2026-06-09T00:30:00.000+03:00",
      model_id: "before-boundary-model",
    });
    const matching = store.createSession({
      ...baseSession,
      timestamp: "2026-06-09T00:30:00.000Z",
      model_id: "matching-model",
    });

    const sessions = store.listSessions({
      since: "2026-06-09T00:00:00.000Z",
      until: "2026-06-09T01:00:00.000Z",
    });

    assert.deepEqual(
      sessions.map((session) => session.session_id),
      [matching.session_id],
    );
    assert.equal(
      sessions.some((session) => session.session_id === beforeBoundary.session_id),
      false,
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

test("migrates existing databases with default contribution consent", () => {
  const dbPath = join(tmpRoot, "migrate-contribution-consent.db");
  const database = new Database(dbPath);

  try {
    database.exec(`
      CREATE TABLE schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
      CREATE TABLE sessions (
        session_id TEXT PRIMARY KEY CHECK (length(trim(session_id)) > 0),
        schema_version TEXT NOT NULL CHECK (schema_version = 'opensasa.metadata.v0'),
        timestamp TEXT NOT NULL CHECK (length(trim(timestamp)) > 0),
        provider TEXT NOT NULL CHECK (length(trim(provider)) > 0),
        model_id TEXT NOT NULL CHECK (length(trim(model_id)) > 0),
        model_version TEXT,
        tool TEXT,
        task_type TEXT NOT NULL,
        final_outcome TEXT NOT NULL,
        work_mode TEXT NOT NULL,
        language TEXT,
        framework TEXT,
        duration_seconds INTEGER,
        retry_count INTEGER,
        error_count INTEGER,
        input_tokens_estimate INTEGER,
        output_tokens_estimate INTEGER,
        cached_tokens_estimate INTEGER,
        estimated_cost_usd REAL,
        cost_source TEXT,
        repo_size_bucket TEXT,
        file_count_bucket TEXT,
        changed_file_count_bucket TEXT,
        lines_added_bucket TEXT,
        lines_removed_bucket TEXT,
        tests_outcome TEXT NOT NULL,
        build_outcome TEXT NOT NULL,
        lint_outcome TEXT NOT NULL,
        typecheck_outcome TEXT NOT NULL,
        manual_review_outcome TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO schema_migrations (name, applied_at)
      VALUES ('001_create_sessions', '2026-06-09T12:00:00.000Z');
      INSERT INTO sessions (
        session_id,
        schema_version,
        timestamp,
        provider,
        model_id,
        task_type,
        final_outcome,
        work_mode,
        tests_outcome,
        build_outcome,
        lint_outcome,
        typecheck_outcome,
        manual_review_outcome
      ) VALUES (
        'legacy-session',
        'opensasa.metadata.v0',
        '2026-06-09T12:00:00.000Z',
        'OpenAI',
        'gpt-5',
        'bug_fix',
        'accepted',
        'manual_log',
        'unknown',
        'unknown',
        'unknown',
        'unknown',
        'unknown'
      );
    `);
  } finally {
    database.close();
  }

  const store = openStore(dbPath);

  try {
    const migrated = store.getSession("legacy-session");
    const history = store.recordContributionHistory({
      exported_at: "2026-06-10T12:00:00.000Z",
      session_id: "legacy-session",
      contribution_id: "contrib_legacy",
      payload_version: "v0.2.0",
      output_path: "C:\\exports\\legacy.json",
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "accepted",
      consent_state: "not_granted",
      validation_status: "passed",
    });

    assert.equal(migrated.contribution_consent, "not_granted");
    assert.equal(history.contribution_id, "contrib_legacy");
    assert.equal(store.listContributionHistory().length, 1);
  } finally {
    store.close();
  }
});

test("uses the documented default local database path", () => {
  assert.match(getDefaultDatabasePath(), /[\\/]\.opensasa[\\/]opensasa\.db$/);
});
