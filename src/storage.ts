import Database from "better-sqlite3";
import { chmodSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { resolveDatabasePath } from "./config.js";
import {
  bucketValues,
  contributionConsentStates,
  contributionHistorySchema,
  contributionValidationStatuses,
  costSources,
  finalOutcomes,
  localSessionSchema,
  activityHeartbeatSchema,
  schemaVersion,
  taskTypes,
  verificationOutcomes,
  workModes,
  type LocalSession,
  type ActivityHeartbeat,
  type ContributionHistoryEntry,
} from "./schema.js";

const createSessionsMigration = "001_create_sessions";
const contributionConsentMigration = "002_add_contribution_consent";
const projectIdentityMigration = "003_add_project_identity_hash";
const activityHeartbeatMigration = "004_add_activity_heartbeats";
const importProvenanceMigration = "005_add_import_provenance";
const contributionHistoryMigration = "006_add_contribution_history";

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
  "import_source",
  "import_source_version",
  "language",
  "framework",
  "project_identity_hash",
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
  "contribution_consent",
] as const;

type SessionColumn = (typeof sessionColumns)[number];
type SessionRow = Record<SessionColumn, unknown>;
const contributionHistoryColumns = [
  "history_id",
  "exported_at",
  "session_id",
  "contribution_id",
  "payload_version",
  "output_path",
  "provider",
  "model_id",
  "tool",
  "language",
  "framework",
  "task_type",
  "final_outcome",
  "consent_state",
  "validation_status",
] as const;
type ContributionHistoryColumn = (typeof contributionHistoryColumns)[number];
type ContributionHistoryRow = Record<ContributionHistoryColumn, unknown>;
type ListSessionsOptions = {
  limit?: number;
  provider?: string;
  modelId?: string;
  tool?: string;
  language?: string;
  framework?: string;
  workMode?: string;
  taskType?: string;
  finalOutcome?: string;
  since?: string;
  until?: string;
};
type ListContributionHistoryOptions = {
  limit?: number;
  provider?: string;
  modelId?: string;
  tool?: string;
  language?: string;
  framework?: string;
  taskType?: string;
  finalOutcome?: string;
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

  recordActivityHeartbeat(input: unknown): ActivityHeartbeat {
    const record = input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
    const heartbeat = activityHeartbeatSchema.parse({
      ...record,
      heartbeat_id: record.heartbeat_id ?? randomUUID(),
    });
    this.database
      .prepare("INSERT INTO activity_heartbeats (heartbeat_id, timestamp, project_identity_hash) VALUES (@heartbeat_id, @timestamp, @project_identity_hash)")
      .run({
        heartbeat_id: heartbeat.heartbeat_id,
        timestamp: heartbeat.timestamp,
        project_identity_hash: heartbeat.project_identity_hash ?? null,
      });
    return heartbeat;
  }

  listActivityHeartbeats(limit?: number): ActivityHeartbeat[] {
    const rows = this.database
      .prepare("SELECT heartbeat_id, timestamp, project_identity_hash FROM activity_heartbeats ORDER BY datetime(timestamp) DESC, heartbeat_id DESC" + (limit ? " LIMIT @limit" : ""))
      .all(limit ? { limit } : {}) as Array<Record<string, unknown>>;
    return rows.map((row) => activityHeartbeatSchema.parse({
      heartbeat_id: row.heartbeat_id,
      timestamp: row.timestamp,
      ...(row.project_identity_hash ? { project_identity_hash: row.project_identity_hash } : {}),
    }));
  }

  recordContributionHistory(input: unknown): ContributionHistoryEntry {
    const record =
      input && typeof input === "object" && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};
    const history = contributionHistorySchema.parse({
      ...record,
      history_id: record.history_id ?? randomUUID(),
    });
    this.database
      .prepare(
        `INSERT INTO contribution_history (${contributionHistoryColumns.join(", ")})
         VALUES (${contributionHistoryColumns.map((column) => `@${column}`).join(", ")})`,
      )
      .run(
        Object.fromEntries(contributionHistoryColumns.map((column) => [column, history[column] ?? null])),
      );
    return history;
  }

  listContributionHistory(options: ListContributionHistoryOptions = {}): ContributionHistoryEntry[] {
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

    if (options.tool !== undefined) {
      filters.push("tool = @tool");
      parameters.tool = options.tool;
    }

    if (options.language !== undefined) {
      filters.push("language = @language");
      parameters.language = options.language;
    }

    if (options.framework !== undefined) {
      filters.push("framework = @framework");
      parameters.framework = options.framework;
    }

    if (options.taskType !== undefined) {
      filters.push("task_type = @taskType");
      parameters.taskType = options.taskType;
    }

    if (options.finalOutcome !== undefined) {
      filters.push("final_outcome = @finalOutcome");
      parameters.finalOutcome = options.finalOutcome;
    }

    if (options.limit !== undefined) {
      parameters.limit = options.limit;
    }

    const whereClause = filters.length > 0 ? ` WHERE ${filters.join(" AND ")}` : "";
    const limitClause = options.limit === undefined ? "" : " LIMIT @limit";
    const rows = this.database
      .prepare(
        `SELECT ${contributionHistoryColumns.join(", ")} FROM contribution_history${whereClause}
         ORDER BY datetime(exported_at) DESC, history_id DESC${limitClause}`,
      )
      .all(parameters) as ContributionHistoryRow[];

    return rows.map(parseContributionHistoryRow);
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

    if (options.tool !== undefined) {
      filters.push("tool = @tool");
      parameters.tool = options.tool;
    }

    if (options.language !== undefined) {
      filters.push("language = @language");
      parameters.language = options.language;
    }

    if (options.framework !== undefined) {
      filters.push("framework = @framework");
      parameters.framework = options.framework;
    }

    if (options.workMode !== undefined) {
      filters.push("work_mode = @workMode");
      parameters.workMode = options.workMode;
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
  return new OpenSasaStore(resolveDatabasePath(databasePath));
}

function runMigrations(database: Database.Database): void {
  const taskTypeValues = sqlStringList(taskTypes);
  const finalOutcomeValues = sqlStringList(finalOutcomes);
  const verificationOutcomeValues = sqlStringList(verificationOutcomes);
  const workModeValues = sqlStringList(workModes);
  const bucketValueValues = sqlStringList(bucketValues);
  const costSourceValues = sqlStringList(costSources);
  const contributionConsentValues = sqlStringList(contributionConsentStates);
  const contributionValidationValueList = sqlStringList(contributionValidationStatuses);

  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const migration = database
    .prepare("SELECT name FROM schema_migrations WHERE name = ?")
    .get(createSessionsMigration);

  if (!migration) {
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
          import_source TEXT,
          import_source_version TEXT,
          language TEXT,
          framework TEXT,
          project_identity_hash TEXT CHECK (project_identity_hash IS NULL OR length(project_identity_hash) = 64),
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
        .run(createSessionsMigration, new Date().toISOString());
    });

    applyMigration();
  }

  const consentMigration = database
    .prepare("SELECT name FROM schema_migrations WHERE name = ?")
    .get(contributionConsentMigration);

  if (!consentMigration) {
    const applyConsentMigration = database.transaction(() => {
      database.exec(`
        ALTER TABLE sessions ADD COLUMN contribution_consent TEXT NOT NULL DEFAULT 'not_granted'
          CHECK (contribution_consent IN (${contributionConsentValues}));
      `);

      database
        .prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)")
        .run(contributionConsentMigration, new Date().toISOString());
    });

    applyConsentMigration();
  }

  const identityMigration = database
    .prepare("SELECT name FROM schema_migrations WHERE name = ?")
    .get(projectIdentityMigration);

  if (!identityMigration) {
    const applyIdentityMigration = database.transaction(() => {
      const columns = database.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
      if (!columns.some((column) => column.name === "project_identity_hash")) {
        database.exec("ALTER TABLE sessions ADD COLUMN project_identity_hash TEXT CHECK (project_identity_hash IS NULL OR length(project_identity_hash) = 64);");
      }
      database
        .prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)")
        .run(projectIdentityMigration, new Date().toISOString());
    });

    applyIdentityMigration();
  }

  const heartbeatMigration = database
    .prepare("SELECT name FROM schema_migrations WHERE name = ?")
    .get(activityHeartbeatMigration);

  if (!heartbeatMigration) {
    const applyHeartbeatMigration = database.transaction(() => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS activity_heartbeats (
          heartbeat_id TEXT PRIMARY KEY CHECK (length(trim(heartbeat_id)) > 0),
          timestamp TEXT NOT NULL CHECK (length(trim(timestamp)) > 0),
          project_identity_hash TEXT CHECK (project_identity_hash IS NULL OR length(project_identity_hash) = 64)
        );
      `);
      database
        .prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)")
        .run(activityHeartbeatMigration, new Date().toISOString());
    });
    applyHeartbeatMigration();
  }

  const provenanceMigration = database
    .prepare("SELECT name FROM schema_migrations WHERE name = ?")
    .get(importProvenanceMigration);

  if (!provenanceMigration) {
    const applyProvenanceMigration = database.transaction(() => {
      const columns = database.prepare("PRAGMA table_info(sessions)").all() as Array<{ name: string }>;
      if (!columns.some((column) => column.name === "import_source")) {
        database.exec("ALTER TABLE sessions ADD COLUMN import_source TEXT;");
      }
      if (!columns.some((column) => column.name === "import_source_version")) {
        database.exec("ALTER TABLE sessions ADD COLUMN import_source_version TEXT;");
      }
      database
        .prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)")
        .run(importProvenanceMigration, new Date().toISOString());
    });
    applyProvenanceMigration();
  }

  const historyMigration = database
    .prepare("SELECT name FROM schema_migrations WHERE name = ?")
    .get(contributionHistoryMigration);

  if (!historyMigration) {
    const applyHistoryMigration = database.transaction(() => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS contribution_history (
          history_id TEXT PRIMARY KEY CHECK (length(trim(history_id)) > 0),
          exported_at TEXT NOT NULL CHECK (length(trim(exported_at)) > 0),
          session_id TEXT NOT NULL CHECK (length(trim(session_id)) > 0),
          contribution_id TEXT NOT NULL CHECK (length(trim(contribution_id)) > 0),
          payload_version TEXT NOT NULL CHECK (length(trim(payload_version)) > 0),
          output_path TEXT NOT NULL CHECK (length(trim(output_path)) > 0),
          provider TEXT NOT NULL CHECK (length(trim(provider)) > 0),
          model_id TEXT NOT NULL CHECK (length(trim(model_id)) > 0),
          tool TEXT,
          language TEXT,
          framework TEXT,
          task_type TEXT NOT NULL CHECK (task_type IN (${taskTypeValues})),
          final_outcome TEXT NOT NULL CHECK (final_outcome IN (${finalOutcomeValues})),
          consent_state TEXT NOT NULL CHECK (consent_state IN (${contributionConsentValues})),
          validation_status TEXT NOT NULL CHECK (validation_status IN (${contributionValidationValueList}))
        );
      `);
      database
        .prepare("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)")
        .run(contributionHistoryMigration, new Date().toISOString());
    });
    applyHistoryMigration();
  }
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

function parseContributionHistoryRow(row: ContributionHistoryRow): ContributionHistoryEntry {
  const withoutNulls = Object.fromEntries(
    contributionHistoryColumns
      .map((column) => [column, row[column]] as const)
      .filter(([, value]) => value !== null),
  );

  return contributionHistorySchema.parse(withoutNulls);
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
