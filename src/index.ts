#!/usr/bin/env node

import { Command } from "commander";
import { ZodError } from "zod";
import { formatContributionPreview, formatLocalInspection } from "./inspect.js";
import { calculateLocalReport, formatLocalReport } from "./report.js";
import { deriveVerifiedSuccess, type LocalSession } from "./schema.js";
import { openStore } from "./storage.js";

const program = new Command();

type LogOptions = {
  provider?: string;
  modelId?: string;
  modelVersion?: string;
  tool?: string;
  taskType?: string;
  finalOutcome?: string;
  timestamp?: string;
  workMode?: string;
  language?: string;
  framework?: string;
  durationSeconds?: number;
  retryCount?: number;
  errorCount?: number;
  inputTokensEstimate?: number;
  outputTokensEstimate?: number;
  cachedTokensEstimate?: number;
  estimatedCostUsd?: number;
  costSource?: string;
  repoSizeBucket?: string;
  fileCountBucket?: string;
  changedFileCountBucket?: string;
  linesAddedBucket?: string;
  linesRemovedBucket?: string;
  testsOutcome?: string;
  buildOutcome?: string;
  lintOutcome?: string;
  typecheckOutcome?: string;
  manualReviewOutcome?: string;
  dbPath?: string;
};

type StoreOptions = {
  dbPath?: string;
};

type InspectOptions = StoreOptions & {
  contribution?: boolean;
};

program
  .name("opensasa")
  .description("Local-first AI coding workflow metadata tracker.")
  .version("0.1.0-alpha.1")
  .showHelpAfterError();

program
  .command("log")
  .description("Record an AI coding session manually.")
  .requiredOption("--provider <provider>", "model provider, such as OpenAI or Anthropic")
  .requiredOption("--model-id <model-id>", "provider model identifier")
  .requiredOption("--task-type <task-type>", "task type enum value")
  .requiredOption(
    "--final-outcome <final-outcome>",
    "accepted, partially_accepted, rejected, or unknown",
  )
  .option("--timestamp <timestamp>", "ISO timestamp for the session")
  .option("--work-mode <work-mode>", "work mode enum value", "manual_log")
  .option("--model-version <model-version>", "model version or release label")
  .option("--tool <tool>", "AI coding tool or agent")
  .option("--language <language>", "primary language, if known")
  .option("--framework <framework>", "primary framework, if known")
  .option("--duration-seconds <seconds>", "duration in seconds", parseNonNegativeInteger)
  .option("--retry-count <count>", "retry or follow-up count", parseNonNegativeInteger)
  .option("--error-count <count>", "workflow error count", parseNonNegativeInteger)
  .option(
    "--input-tokens-estimate <tokens>",
    "estimated input token count",
    parseNonNegativeInteger,
  )
  .option(
    "--output-tokens-estimate <tokens>",
    "estimated output token count",
    parseNonNegativeInteger,
  )
  .option(
    "--cached-tokens-estimate <tokens>",
    "estimated cached token count",
    parseNonNegativeInteger,
  )
  .option("--estimated-cost-usd <cost>", "estimated session cost in USD", parseNonNegativeNumber)
  .option("--cost-source <cost-source>", "cost source enum value")
  .option("--repo-size-bucket <bucket>", "coarse repository size bucket")
  .option("--file-count-bucket <bucket>", "coarse file count bucket")
  .option("--changed-file-count-bucket <bucket>", "coarse changed file count bucket")
  .option("--lines-added-bucket <bucket>", "coarse lines added bucket")
  .option("--lines-removed-bucket <bucket>", "coarse lines removed bucket")
  .option("--tests-outcome <outcome>", "test verification outcome")
  .option("--build-outcome <outcome>", "build verification outcome")
  .option("--lint-outcome <outcome>", "lint verification outcome")
  .option("--typecheck-outcome <outcome>", "typecheck verification outcome")
  .option("--manual-review-outcome <outcome>", "manual review outcome")
  .option("--db-path <path>", "override local database path")
  .action((options: LogOptions) => {
    let store;
    try {
      store = openStore(options.dbPath ?? process.env.OPENSASA_DB_PATH);
      const session = store.createSession({
        timestamp: options.timestamp ?? new Date().toISOString(),
        provider: options.provider,
        model_id: options.modelId,
        model_version: options.modelVersion,
        tool: options.tool,
        task_type: options.taskType,
        final_outcome: options.finalOutcome,
        work_mode: options.workMode,
        language: options.language,
        framework: options.framework,
        duration_seconds: options.durationSeconds,
        retry_count: options.retryCount,
        error_count: options.errorCount,
        input_tokens_estimate: options.inputTokensEstimate,
        output_tokens_estimate: options.outputTokensEstimate,
        cached_tokens_estimate: options.cachedTokensEstimate,
        estimated_cost_usd: options.estimatedCostUsd,
        cost_source: options.costSource,
        repo_size_bucket: options.repoSizeBucket,
        file_count_bucket: options.fileCountBucket,
        changed_file_count_bucket: options.changedFileCountBucket,
        lines_added_bucket: options.linesAddedBucket,
        lines_removed_bucket: options.linesRemovedBucket,
        tests_outcome: options.testsOutcome,
        build_outcome: options.buildOutcome,
        lint_outcome: options.lintOutcome,
        typecheck_outcome: options.typecheckOutcome,
        manual_review_outcome: options.manualReviewOutcome,
      });

      console.log(`Logged session ${session.session_id}`);
    } catch (error) {
      process.exitCode = 1;
      console.error(formatCliError(error));
    } finally {
      store?.close();
    }
  });

program
  .command("sessions")
  .description("List local AI coding sessions.")
  .option("--db-path <path>", "override local database path")
  .action((options: StoreOptions) => {
    let store;
    try {
      store = openStore(options.dbPath ?? process.env.OPENSASA_DB_PATH);
      const sessions = store.listSessions();

      if (sessions.length === 0) {
        console.log("No local sessions found.");
        return;
      }

      console.log(formatSessions(sessions));
    } catch (error) {
      process.exitCode = 1;
      console.error(formatCliError(error));
    } finally {
      store?.close();
    }
  });

program
  .command("report")
  .description("Generate a local personal report.")
  .option("--db-path <path>", "override local database path")
  .action((options: StoreOptions) => {
    let store;
    try {
      store = openStore(options.dbPath ?? process.env.OPENSASA_DB_PATH);
      const report = calculateLocalReport(store.listSessions());
      console.log(formatLocalReport(report));
    } catch (error) {
      process.exitCode = 1;
      console.error(formatCliError(error));
    } finally {
      store?.close();
    }
  });

program
  .command("inspect")
  .description("Inspect a local session or contribution preview.")
  .argument("<session-id>", "local session ID to inspect")
  .option("--contribution", "preview a sanitized contribution payload")
  .option("--db-path <path>", "override local database path")
  .action((sessionId: string, options: InspectOptions) => {
    let store;
    try {
      store = openStore(options.dbPath ?? process.env.OPENSASA_DB_PATH);
      const session = store.getSession(sessionId);

      if (!session) {
        process.exitCode = 1;
        console.error(`Session not found: ${sessionId}`);
        return;
      }

      console.log(
        options.contribution
          ? formatContributionPreview(session)
          : formatLocalInspection(session),
      );
    } catch (error) {
      process.exitCode = 1;
      console.error(formatCliError(error));
    } finally {
      store?.close();
    }
  });

program.parse();

function parseNonNegativeInteger(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error("Expected a non-negative integer.");
  }

  return Number(value);
}

function parseNonNegativeNumber(value: string): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Expected a non-negative number.");
  }

  return parsed;
}

function formatCliError(error: unknown): string {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const path = firstIssue.path.join(".");
    return `Invalid session metadata: ${path ? `${path}: ` : ""}${firstIssue.message}`;
  }

  if (error instanceof Error) {
    return `Unable to log session: ${error.message}`;
  }

  return "Unable to log session.";
}

function formatSessions(sessions: LocalSession[]): string {
  const rows = sessions.map((session) => ({
    id: session.session_id ?? "",
    timestamp: session.timestamp,
    provider: session.provider,
    model: session.model_id,
    task: session.task_type,
    outcome: session.final_outcome,
    verified: formatVerifiedSuccess(session),
    cost: formatEstimatedCost(session.estimated_cost_usd),
  }));
  const headers = {
    id: "Session ID",
    timestamp: "Timestamp",
    provider: "Provider",
    model: "Model",
    task: "Task",
    outcome: "Outcome",
    verified: "Verified",
    cost: "Cost",
  };
  const widths = Object.fromEntries(
    Object.keys(headers).map((key) => [
      key,
      Math.max(
        headers[key as keyof typeof headers].length,
        ...rows.map((row) => row[key as keyof typeof row].length),
      ),
    ]),
  ) as Record<keyof typeof headers, number>;

  return [
    formatSessionRow(headers, widths),
    formatSessionRow(
      {
        id: "-".repeat(widths.id),
        timestamp: "-".repeat(widths.timestamp),
        provider: "-".repeat(widths.provider),
        model: "-".repeat(widths.model),
        task: "-".repeat(widths.task),
        outcome: "-".repeat(widths.outcome),
        verified: "-".repeat(widths.verified),
        cost: "-".repeat(widths.cost),
      },
      widths,
    ),
    ...rows.map((row) => formatSessionRow(row, widths)),
  ].join("\n");
}

function formatSessionRow(
  row: Record<"id" | "timestamp" | "provider" | "model" | "task" | "outcome" | "verified" | "cost", string>,
  widths: Record<"id" | "timestamp" | "provider" | "model" | "task" | "outcome" | "verified" | "cost", number>,
): string {
  return [
    row.id.padEnd(widths.id),
    row.timestamp.padEnd(widths.timestamp),
    row.provider.padEnd(widths.provider),
    row.model.padEnd(widths.model),
    row.task.padEnd(widths.task),
    row.outcome.padEnd(widths.outcome),
    row.verified.padEnd(widths.verified),
    row.cost.padStart(widths.cost),
  ].join("  ");
}

function formatVerifiedSuccess(session: LocalSession): string {
  if (
    session.tests_outcome === "unknown" &&
    session.build_outcome === "unknown" &&
    session.lint_outcome === "unknown" &&
    session.typecheck_outcome === "unknown" &&
    session.manual_review_outcome === "unknown"
  ) {
    return "unknown";
  }

  return deriveVerifiedSuccess(session) ? "yes" : "no";
}

function formatEstimatedCost(cost: number | undefined): string {
  return cost === undefined ? "unknown" : `$${cost.toFixed(4)}`;
}
