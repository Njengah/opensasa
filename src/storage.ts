import Database from "better-sqlite3";
import { chmodSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  bucketValues,
  costSources,
  finalOutcomes,
  localSessionSchema,
  schemaVersion,
  taskTypes,
  verificationOutcomes,
  workModes,
  type LocalSession,
} from "./schema.js";

const migrationName = "001_create_sessions";

const sessionColumns = [
  "schema_version",
  "session_id",
  "timestamp",
  "provider",
  "model_id",
  "model_version",
  "tool",
  "task_type",
  "final_outcome",
  "work_mode",
  "language",
  "framework",
  "duration_seconds",
  "retry_count",
  "error_count",
  "input_tokens_estimate",
  "output_tokens_estimate",
  "cached_tokens_estimate",
  "estimated_cost_usd",
  "cost_source",
  "repo_size_bucket",
  "file_count_bucket",
  "changed_file_count_bucket",
  "lines_added_bucket",
  "lines_removed_bucket",
  "tests_outcome",
  "build_outcome",
  "lint_outcome",
  "typecheck_outcome",
  "manual_review_outcome",
] as const;

type SessionColumn = (typeof sessionColumns)[number];
type SessionRow = Record<SessionColumn, unknown>;
type ListSessionsOptions = {
  limit?: number;
  provider?: string;
  modelId?: string;
  taskType?: string;
  finalOutcome?: string;
  since?: string;
  until?: string;
};

export function getDefaultDatabasePath(): string {
  return join(homedir(), ".opensasa", "opensasa.db");
}

export class OpenSasaStore {
  readonly path: string;
  private readonly database: Database.Database;

  constructor(databasePath = getDefaultDatabasePath()) {
    this.path = databasePath;
    const databaseDirectory = dirname(databasePath);
    mkdirSync(databaseDirectory, { mode: 0o700, recursive: true });
    chmodIfSupported(databaseDirectory, 0o700);
    this.database = new Database(databasePath);
    chmodIfSupported(databasePath, 0o600);
    this.database.pragma("foreign_keys = ON");
    runMigrations(this.database);
  }

  close(): void {
    this.database.close();
  }

  createSession(input: unknown): LocalSession {
    const session = parseSessionWithGeneratedId(input);
    const values = Object.fromEntries(
      sessionColumns.map((column) => [column, session[column] ?? null]),
    );

    this.database
      .prepare(
        `INSERT INTO sessions (${sessionColumns.join(", ")})
         VALUES (${sessionColumns.map((column) => `@${column}`).join(", ")})`,
      )
      .run(values);

    return session;
  }

  getSession(sessionId: string): LocalSession | null {
    const row = this.database
      .prepare("SELECT * FROM sessions WHERE session_id = ?")
      .get(sessionId) as SessionRow | undefined;

    return row ? parseSessionRow(row) : null;
  }

  updateSession(sessionId: string, input: unknown): LocalSession | null {
    const existing = this.getSession(sessionId);

    if (!existing) {
      return null;
    }

    const record =
      input && typeof input === "object" && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};
    const updated = localSessionSchema.parse({
      ...existing,
      ...record,
      schema_version: existing.schema_version,
      session_id: existing.session_id,
    });
    const values = Object.fromEntries(
      sessionColumns.map((column) => [column, updated[column] ?? null]),
    );
    const updateColumns = sessionColumns.filter((column) => column !== "session_id");

    this.database
      .prepare(
        `UPDATE sessions
         SET ${updateColumns.map((column) => `${column} = @${column}`).join(", ")}
         WHERE session_id = @session_id`,
      )
      .run(values);

    return updated;
  }

  deleteSession(sessionId: string): boolean {
    const result = this.database
      .prepare("DELETE FROM sessions WHERE session_id = ?")
      .run(sessionId);

    return result.changes > 0;
  }

  listSessions(options: ListSessionsOptions = {}): LocalSession[] {
    const filters: string[] = [];
    const parameters: Record<string, string | number> = {};

    if (options.provider !== undefined) {
      filters.push("provider = @provider");
      parameters.provider = options.provider;
    }

    if (options.modelId !== undefined) {
      filters.push("model_id = @modelId");
      parameters.modelId = options.modelId;
    }

    if (options.taskType !== undefined) {
      filters.push("task_type = @taskType");
      parameters.taskType = options.taskType;
    }

    if (options.finalOutcome !== undefined) {
      filters.push("final_outcome = @finalOutcome");
      parameters.finalOutcome = options.finalOutcome;
    }

    if (options.since !== undefined) {
      filters.push("datetime(timestamp) >= datetime(@since)");
      parameters.since = options.since;
    }

    if (options.until !== undefined) {
      filters.push("datetime(timestamp) <= datetime(@until)");
      parameters.until = options.until;
    }

    if (options.limit !== undefined) {
      parameters.limit = options.limit;
    }

    const whereClause = filters.length > 0 ? ` WHERE ${filters.join(" AND ")}` : "";
    const limitClause = options.limit === undefined ? "" : " LIMIT @limit";
    const rows = this.database
      .prepare(
        `SELECT * FROM sessions${whereClause} ORDER BY datetime(timestamp) DESC, session_id DESC${limitClause}`,
      )
      .all(parameters) as SessionRow[];

    return rows.map(parseSessionRow);
  }
}

export function openStore(databasePath?: string): OpenSasaStore {
  return new OpenSasaStore(databasePath);
}

function runMigrations(database: Database.Database): void {
  const taskTypeValues = sqlStringList(taskTypes);
  const finalOutcomeValues = sqlStringList(finalOutcomes);
  const verificationOutcomeValues = sqlStringList(verificationOutcomes);
  const workModeValues = sqlStringList(workModes);
  const bucketValueValues = sqlStringList(bucketValues);
  const costSourceValues = sqlStringList(costSources);

  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const migration = database
    .prepare("SELECT name FROM schema_migrations WHERE name = ?")
    .get(migrationName);

  if (migration) {
    return;
  }

  const applyMigration = database.transaction(() => {
    database.exec(`
      CREATE TABLE sessions (
        session_id TEXT PRIMARY KEY CHECK (length(trim(session_id)) > 0),
        schema_version TEXT NOT NULL CHECK (schema_version = '${schemaVersion}'),
        timestamp TEXT NOT NULL CHECK (length(trim(timestamp)) > 0),
        provider TEXT NOT NULL CHECK (length(trim(provider)) > 0),
        model_id TEXT NOT NULL CHECK (length(trim(model_id)) > 0),
        model_version TEXT,
        tool TEXT,
        task_type TEXT NOT NULL CHECK (task_type IN (${taskTypeValues})),
        final_outcome TEXT NOT NULL CHECK (final_outcome IN (${finalOutcomeValues})),
        work_mode TEXT NOT NULL CHECK (work_mode IN (${workModeValues})),
        language TEXT,
        framework TEXT,
        duration_seconds INTEGER CHECK (duration_seconds IS NULL OR (duration_seconds >= 0 AND typeof(duration_seconds) = 'integer')),
        retry_count INTEGER CHECK (retry_count IS NULL OR (retry_count >= 0 AND typeof(retry_count) = 'integer')),
        error_count INTEGER CHECK (error_count IS NULL OR (error_count >= 0 AND typeof(error_count) = 'integer')),
        input_tokens_estimate INTEGER CHECK (input_tokens_estimate IS NULL OR (input_tokens_estimate >= 0 AND typeof(input_tokens_estimate) = 'integer')),
        output_tokens_estimate INTEGER CHECK (output_tokens_estimate IS NULL OR (output_tokens_estimate >= 0 AND typeof(output_tokens_estimate) = 'integer')),
        cached_tokens_estimate INTEGER CHECK (cached_tokens_estimate IS NULL OR (cached_tokens_estimate >= 0 AND typeof(cached_tokens_estimate) = 'integer')),
        estimated_cost_usd REAL CHECK (estimated_cost_usd IS NULL OR estimated_cost_usd >= 0),
        cost_source TEXT CHECK (cost_source IS NULL OR cost_source IN (${costSourceValues})),
        repo_size_bucket TEXT CHECK (repo_size_bucket IS NULL OR repo_size_bucket IN (${bucketValueValues})),
        file_count_bucket TEXT CHECK (file_count_bucket IS NULL OR file_count_bucket IN (${bucketValueValues})),
        changed_file_count_bucket TEXT CHECK (changed_file_count_bucket IS NULL OR changed_file_count_bucket IN (${bucketValueValues})),
        lines_added_bucket TEXT CHECK (lines_added_bucket IS NULL OR lines_added_bucket IN (${bucketValueValues})),
        lines_removed_bucket TEXT CHECK (lines_removed_bucket IS NULL OR lines_removed_bucket IN (${bucketValueValues})),
        tests_outcome TEXT NOT NULL CHECK (tests_outcome IN (${verificationOutcomeValues})),
        build_outcome TEXT NOT NULL CHECK (build_outcome IN (${verificationOutcomeValues})),
        lint_outcome TEXT NOT NULL CHECK (lint_outcome IN (${verificationOutcomeValues})),
        typecheck_outcome TEXT NOT NULL CHECK (typecheck_outcome IN (${verificationOutcomeValues})),
        manual_review_outcome TEXT NOT NULL CHECK (manual_review_outcome IN (${finalOutcomeValues})),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    database
      .prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)")
      .run(migrationName, new Date().toISOString());
  });

  applyMigration();
}

function parseSessionWithGeneratedId(input: unknown): LocalSession {
  const record =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  return localSessionSchema.parse({
    ...record,
    session_id: record.session_id ?? randomUUID(),
  });
}

function parseSessionRow(row: SessionRow): LocalSession {
  const withoutNulls = Object.fromEntries(
    sessionColumns
      .map((column) => [column, row[column]] as const)
      .filter(([, value]) => value !== null),
  );

  return localSessionSchema.parse(withoutNulls);
}

function sqlStringList(values: readonly string[]): string {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(", ");
}

function chmodIfSupported(path: string, mode: number): void {
  try {
    chmodSync(path, mode);
  } catch {
    // Windows and some filesystems do not fully support POSIX modes.
  }
}
