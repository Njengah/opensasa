import { z } from "zod";

export const schemaVersion = "opensasa.metadata.v0";

export const taskTypes = [
  "bug_fix",
  "feature",
  "frontend_ui",
  "refactor",
  "test_generation",
  "documentation",
  "code_review",
  "debugging",
  "migration",
  "dependency_update",
  "performance",
  "security",
  "data_analysis",
  "setup",
  "other",
  "unknown",
] as const;

export const finalOutcomes = [
  "accepted",
  "partially_accepted",
  "rejected",
  "unknown",
] as const;

export const verificationOutcomes = [
  "passed",
  "failed",
  "not_run",
  "unknown",
] as const;

export const workModes = [
  "manual_log",
  "cli_wrapper",
  "tool_import",
  "agent_log",
  "unknown",
] as const;

export const bucketValues = [
  "tiny",
  "small",
  "medium",
  "large",
  "very_large",
  "unknown",
] as const;

export const costSources = [
  "provider_usage",
  "tool_reported",
  "estimated",
  "unknown",
] as const;

const nonEmptyString = z.string().trim().min(1);
const nonNegativeInteger = z.number().int().min(0);
const nonNegativeNumber = z.number().min(0);

export const isoTimestampSchema = z.string().datetime({ offset: true });

const optionalVerificationOutcome = z
  .enum(verificationOutcomes)
  .optional()
  .default("unknown");

export const localSessionSchema = z
  .object({
    schema_version: z.literal(schemaVersion).default(schemaVersion),
    session_id: nonEmptyString.optional(),
    timestamp: isoTimestampSchema,
    provider: nonEmptyString,
    model_id: nonEmptyString,
    model_version: nonEmptyString.optional(),
    tool: nonEmptyString.optional(),
    task_type: z.enum(taskTypes),
    final_outcome: z.enum(finalOutcomes),
    work_mode: z.enum(workModes),
    language: nonEmptyString.optional(),
    framework: nonEmptyString.optional(),
    duration_seconds: nonNegativeInteger.optional(),
    retry_count: nonNegativeInteger.optional(),
    error_count: nonNegativeInteger.optional(),
    input_tokens_estimate: nonNegativeInteger.optional(),
    output_tokens_estimate: nonNegativeInteger.optional(),
    cached_tokens_estimate: nonNegativeInteger.optional(),
    estimated_cost_usd: nonNegativeNumber.optional(),
    cost_source: z.enum(costSources).optional(),
    repo_size_bucket: z.enum(bucketValues).optional(),
    file_count_bucket: z.enum(bucketValues).optional(),
    changed_file_count_bucket: z.enum(bucketValues).optional(),
    lines_added_bucket: z.enum(bucketValues).optional(),
    lines_removed_bucket: z.enum(bucketValues).optional(),
    tests_outcome: optionalVerificationOutcome,
    build_outcome: optionalVerificationOutcome,
    lint_outcome: optionalVerificationOutcome,
    typecheck_outcome: optionalVerificationOutcome,
    manual_review_outcome: z.enum(finalOutcomes).optional().default("unknown"),
  })
  .strict();

export type LocalSession = z.infer<typeof localSessionSchema>;
export type FinalOutcome = (typeof finalOutcomes)[number];
export type VerificationOutcome = (typeof verificationOutcomes)[number];

const usefulOutcomes = new Set<FinalOutcome>(["accepted", "partially_accepted"]);

export function isUsefulOutcome(outcome: FinalOutcome): boolean {
  return usefulOutcomes.has(outcome);
}

export function hasPassingVerification(session: Pick<
  LocalSession,
  | "tests_outcome"
  | "build_outcome"
  | "lint_outcome"
  | "typecheck_outcome"
  | "manual_review_outcome"
>): boolean {
  return (
    session.tests_outcome === "passed" ||
    session.build_outcome === "passed" ||
    session.lint_outcome === "passed" ||
    session.typecheck_outcome === "passed" ||
    session.manual_review_outcome === "accepted" ||
    session.manual_review_outcome === "partially_accepted"
  );
}

export function deriveVerifiedSuccess(session: LocalSession): boolean {
  return isUsefulOutcome(session.final_outcome) && hasPassingVerification(session);
}

