import { validateContributionPreview } from "./inspect.js";
import {
  bucketValues,
  contributionPayloadVersion,
  finalOutcomes,
  schemaVersion,
  taskTypes,
  verificationOutcomes,
} from "./schema.js";

export type ServerContributionValidationIssueCode =
  | "missing_required_field"
  | "forbidden_field"
  | "unknown_field"
  | "invalid_type"
  | "invalid_version"
  | "invalid_enum"
  | "invalid_bucket"
  | "invalid_format"
  | "private_marker";

export type ServerContributionValidationIssue = {
  code: ServerContributionValidationIssueCode;
  field: string;
  message: string;
};

export type ServerContributionValidation = {
  status: "passed" | "failed";
  issues: ServerContributionValidationIssue[];
  summary: {
    issue_count: number;
    missing_required_field_count: number;
    forbidden_field_count: number;
    unknown_field_count: number;
    invalid_type_count: number;
    invalid_version_count: number;
    invalid_enum_count: number;
    invalid_bucket_count: number;
    invalid_format_count: number;
    private_marker_count: number;
  };
};

const requiredStringFields = [
  "contribution_id",
  "timestamp_bucket",
  "provider",
  "model_id",
  "task_type",
  "input_tokens_bucket",
  "output_tokens_bucket",
  "cached_tokens_bucket",
  "estimated_cost_bucket",
  "duration_bucket",
  "retry_count_bucket",
  "error_count_bucket",
  "tests_outcome",
  "build_outcome",
  "lint_outcome",
  "typecheck_outcome",
  "final_outcome",
  "data_source",
] as const;

const optionalStringFields = [
  "model_version",
  "tool",
  "language",
  "framework",
  "repo_size_bucket",
  "file_count_bucket",
  "changed_file_count_bucket",
  "lines_added_bucket",
  "lines_removed_bucket",
] as const;

const verificationOutcomeFields = [
  "tests_outcome",
  "build_outcome",
  "lint_outcome",
  "typecheck_outcome",
] as const;

const countBucketFields = [
  "input_tokens_bucket",
  "output_tokens_bucket",
  "cached_tokens_bucket",
  "retry_count_bucket",
  "error_count_bucket",
  "repo_size_bucket",
  "file_count_bucket",
  "changed_file_count_bucket",
  "lines_added_bucket",
  "lines_removed_bucket",
] as const;

const normalizedTextFields = [
  "provider",
  "model_id",
  "model_version",
  "tool",
  "language",
  "framework",
  "data_source",
] as const;

export function validateServerContributionPayload(payload: unknown): ServerContributionValidation {
  if (!isRecord(payload)) {
    return buildValidation([
      {
        code: "invalid_type",
        field: "$",
        message: "Payload must be a JSON object.",
      },
    ]);
  }

  const fieldValidation = validateContributionPreview(payload);
  const issues: ServerContributionValidationIssue[] = [
    ...fieldValidation.missing_required_fields.map((field) => issue("missing_required_field", field, `${field} is required.`)),
    ...fieldValidation.forbidden_fields_present.map((field) => issue("forbidden_field", field, `${field} is forbidden in contribution payloads.`)),
    ...fieldValidation.unknown_fields_present.map((field) => issue("unknown_field", field, `${field} is not part of the contribution payload contract.`)),
  ];

  if (payload.schema_version !== schemaVersion) {
    issues.push(issue("invalid_version", "schema_version", `schema_version must be ${schemaVersion}.`));
  }
  if (payload.payload_version !== contributionPayloadVersion) {
    issues.push(issue("invalid_version", "payload_version", `payload_version must be ${contributionPayloadVersion}.`));
  }
  for (const field of requiredStringFields) {
    if (typeof payload[field] !== "string" || payload[field].trim() === "") {
      issues.push(issue("invalid_type", field, `${field} must be a non-empty string.`));
    }
  }
  for (const field of optionalStringFields) {
    if (payload[field] !== undefined && (typeof payload[field] !== "string" || payload[field].trim() === "")) {
      issues.push(issue("invalid_type", field, `${field} must be a non-empty string when present.`));
    }
  }
  if (typeof payload.verified_success !== "boolean") {
    issues.push(issue("invalid_type", "verified_success", "verified_success must be a boolean."));
  }
  if (typeof payload.contribution_id === "string" && !/^contrib_[a-zA-Z0-9_-]+$/.test(payload.contribution_id)) {
    issues.push(issue("invalid_format", "contribution_id", "contribution_id must be an opaque contrib_ identifier."));
  }
  if (typeof payload.timestamp_bucket === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(payload.timestamp_bucket)) {
    issues.push(issue("invalid_format", "timestamp_bucket", "timestamp_bucket must use YYYY-MM-DD format."));
  }
  if (typeof payload.task_type === "string" && !(taskTypes as readonly string[]).includes(payload.task_type)) {
    issues.push(issue("invalid_enum", "task_type", "task_type must be a documented task type."));
  }
  if (typeof payload.final_outcome === "string" && !(finalOutcomes as readonly string[]).includes(payload.final_outcome)) {
    issues.push(issue("invalid_enum", "final_outcome", "final_outcome must be a documented final outcome."));
  }
  for (const field of verificationOutcomeFields) {
    const value = payload[field];
    if (typeof value === "string" && !(verificationOutcomes as readonly string[]).includes(value)) {
      issues.push(issue("invalid_enum", field, `${field} must be a documented verification outcome.`));
    }
  }
  for (const field of countBucketFields) {
    const value = payload[field];
    if (typeof value === "string" && !isAllowedCountBucket(value)) {
      issues.push(issue("invalid_bucket", field, `${field} must be a documented bucket value.`));
    }
  }
  if (typeof payload.duration_bucket === "string" && !isAllowedDurationBucket(payload.duration_bucket)) {
    issues.push(issue("invalid_bucket", "duration_bucket", "duration_bucket must be a documented duration bucket value."));
  }
  if (typeof payload.estimated_cost_bucket === "string" && !isAllowedCostBucket(payload.estimated_cost_bucket)) {
    issues.push(issue("invalid_bucket", "estimated_cost_bucket", "estimated_cost_bucket must be a documented cost bucket value."));
  }
  for (const field of normalizedTextFields) {
    const value = payload[field];
    if (typeof value === "string" && containsPrivateMarker(value)) {
      issues.push(issue("private_marker", field, `${field} contains private-looking text and must be normalized before ingestion.`));
    }
  }

  return buildValidation(issues);
}

function buildValidation(issues: ServerContributionValidationIssue[]): ServerContributionValidation {
  return {
    status: issues.length === 0 ? "passed" : "failed",
    issues,
    summary: {
      issue_count: issues.length,
      missing_required_field_count: countIssues(issues, "missing_required_field"),
      forbidden_field_count: countIssues(issues, "forbidden_field"),
      unknown_field_count: countIssues(issues, "unknown_field"),
      invalid_type_count: countIssues(issues, "invalid_type"),
      invalid_version_count: countIssues(issues, "invalid_version"),
      invalid_enum_count: countIssues(issues, "invalid_enum"),
      invalid_bucket_count: countIssues(issues, "invalid_bucket"),
      invalid_format_count: countIssues(issues, "invalid_format"),
      private_marker_count: countIssues(issues, "private_marker"),
    },
  };
}

function issue(
  code: ServerContributionValidationIssueCode,
  field: string,
  message: string,
): ServerContributionValidationIssue {
  return { code, field, message };
}

function countIssues(
  issues: ServerContributionValidationIssue[],
  code: ServerContributionValidationIssueCode,
): number {
  return issues.filter((item) => item.code === code).length;
}

function isAllowedCostBucket(value: string): boolean {
  return [
    "free",
    "under_1_cent",
    "under_10_cents",
    "under_1_usd",
    "under_10_usd",
    "over_10_usd",
    "unknown",
  ].includes(value);
}

function isAllowedCountBucket(value: string): boolean {
  return value === "zero" || (bucketValues as readonly string[]).includes(value);
}

function isAllowedDurationBucket(value: string): boolean {
  return ["under_1m", "1m_to_5m", "5m_to_30m", "30m_to_2h", "over_2h", "unknown"].includes(value);
}

function containsPrivateMarker(value: string): boolean {
  return /\b(customer|client|company|secret|private[_ -]?repo|api[_ -]?key|token)\b/i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
