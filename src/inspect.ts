import { createHash } from "node:crypto";
import { costBucket, countBucket, durationBucket } from "./buckets.js";
import {
  deriveVerifiedSuccess,
  schemaVersion,
  type LocalSession,
} from "./schema.js";

const excludedContributionFields = [
  "source code",
  "private prompts",
  "model responses",
  "exact file paths",
  "repository names",
  "organization names",
  "company names",
  "customer names",
  "secrets",
  "API keys",
  "terminal output",
  "private local notes",
  "personally identifying information",
] as const;

const forbiddenContributionKeys = [
  "session_id",
  "timestamp",
  "estimated_cost_usd",
  "duration_seconds",
  "retry_count",
  "error_count",
  "input_tokens_estimate",
  "output_tokens_estimate",
  "cached_tokens_estimate",
  "prompt",
  "source_code",
  "model_response",
  "terminal_output",
  "file_path",
  "repository_name",
  "organization_name",
  "company_name",
  "customer_name",
  "secret",
  "api_key",
  "private_notes",
] as const;

type LocalInspection = {
  local_record: Record<string, unknown>;
  privacy_boundary: string[];
};

type ContributionPreview = {
  schema_version: string;
  contribution_id: string;
  timestamp_bucket: string;
  provider: string;
  model_id: string;
  model_version?: string;
  tool?: string;
  task_type: string;
  language?: string;
  framework?: string;
  repo_size_bucket?: string;
  file_count_bucket?: string;
  changed_file_count_bucket?: string;
  lines_added_bucket?: string;
  lines_removed_bucket?: string;
  input_tokens_bucket: string;
  output_tokens_bucket: string;
  cached_tokens_bucket: string;
  estimated_cost_bucket: string;
  duration_bucket: string;
  retry_count_bucket: string;
  error_count_bucket: string;
  tests_outcome: string;
  build_outcome: string;
  lint_outcome: string;
  typecheck_outcome: string;
  final_outcome: string;
  verified_success: boolean;
  data_source: string;
};

type ContributionValidation = {
  status: "passed" | "failed";
  checked_fields: string[];
  forbidden_fields_present: string[];
};

type ContributionPreviewInspection = {
  status: "preview only";
  consent: "not granted";
  upload_enabled: false;
  destination: "none";
  no_upload_notice: string;
  validation: ContributionValidation;
  included_fields: ContributionPreview;
  excluded_fields: string[];
};

export function formatLocalInspection(session: LocalSession): string {
  const inspection = buildLocalInspection(session);

  return [
    "OpenSasa Session Inspection",
    "",
    "Local record:",
    ...formatObject(inspection.local_record),
    "",
    "Privacy boundary:",
    ...inspection.privacy_boundary.map((item) => `- ${item}`),
  ].join("\n");
}

export function formatContributionPreview(session: LocalSession): string {
  const preview = buildContributionPreviewInspection(session);

  return [
    "OpenSasa Contribution Preview",
    "",
    `Status: ${preview.status}`,
    `Consent: ${preview.consent}`,
    `Upload enabled: ${preview.upload_enabled ? "yes" : "no"}`,
    `Destination: ${preview.destination}`,
    preview.no_upload_notice,
    "",
    "Validation:",
    `- status: ${preview.validation.status}`,
    `- checked_fields: ${preview.validation.checked_fields.length}`,
    `- forbidden_fields_present: ${
      preview.validation.forbidden_fields_present.length === 0
        ? "none"
        : preview.validation.forbidden_fields_present.join(", ")
    }`,
    "",
    "Included fields:",
    ...formatObject(preview.included_fields),
    "",
    "Excluded fields:",
    ...preview.excluded_fields.map((field) => `- ${field}`),
  ].join("\n");
}

export function formatLocalInspectionJson(session: LocalSession): string {
  return `${JSON.stringify(buildLocalInspection(session), null, 2)}\n`;
}

export function formatContributionPreviewJson(session: LocalSession): string {
  return `${JSON.stringify(buildContributionPreviewInspection(session), null, 2)}\n`;
}

export function buildLocalInspection(session: LocalSession): LocalInspection {
  return {
    local_record: localInspectionFields(session),
    privacy_boundary: [
      "No source code stored.",
      "No private prompts stored.",
      "No model responses stored.",
      "No exact file paths stored.",
      "No raw terminal output stored.",
    ],
  };
}

export function buildContributionPreviewInspection(
  session: LocalSession,
): ContributionPreviewInspection {
  const includedFields = buildContributionPreview(session);

  return {
    status: "preview only",
    consent: "not granted",
    upload_enabled: false,
    destination: "none",
    no_upload_notice: "No upload will occur in this MVP.",
    validation: validateContributionPreview(includedFields),
    included_fields: includedFields,
    excluded_fields: [...excludedContributionFields],
  };
}

export function validateContributionPreview(
  preview: Record<string, unknown>,
): ContributionValidation {
  const checkedFields = Object.keys(preview);
  const forbiddenFieldsPresent = checkedFields.filter((field) =>
    (forbiddenContributionKeys as readonly string[]).includes(field),
  );

  return {
    status: forbiddenFieldsPresent.length === 0 ? "passed" : "failed",
    checked_fields: checkedFields,
    forbidden_fields_present: forbiddenFieldsPresent,
  };
}

export function buildContributionPreview(session: LocalSession): ContributionPreview {
  return removeUndefinedValues({
    schema_version: schemaVersion,
    contribution_id: contributionIdFor(session),
    timestamp_bucket: timestampBucket(session.timestamp),
    provider: session.provider,
    model_id: session.model_id,
    model_version: session.model_version,
    tool: session.tool,
    task_type: session.task_type,
    language: session.language,
    framework: session.framework,
    repo_size_bucket: session.repo_size_bucket,
    file_count_bucket: session.file_count_bucket,
    changed_file_count_bucket: session.changed_file_count_bucket,
    lines_added_bucket: session.lines_added_bucket,
    lines_removed_bucket: session.lines_removed_bucket,
    input_tokens_bucket: countBucket(session.input_tokens_estimate),
    output_tokens_bucket: countBucket(session.output_tokens_estimate),
    cached_tokens_bucket: countBucket(session.cached_tokens_estimate),
    estimated_cost_bucket: costBucket(session.estimated_cost_usd),
    duration_bucket: durationBucket(session.duration_seconds),
    retry_count_bucket: countBucket(session.retry_count),
    error_count_bucket: countBucket(session.error_count),
    tests_outcome: session.tests_outcome,
    build_outcome: session.build_outcome,
    lint_outcome: session.lint_outcome,
    typecheck_outcome: session.typecheck_outcome,
    final_outcome: session.final_outcome,
    verified_success: deriveVerifiedSuccess(session),
    data_source: dataSourceFor(session),
  });
}

function localInspectionFields(session: LocalSession): Record<string, unknown> {
  return {
    schema_version: session.schema_version,
    session_id: session.session_id,
    timestamp: session.timestamp,
    provider: session.provider,
    model_id: session.model_id,
    model_version: session.model_version,
    tool: session.tool,
    task_type: session.task_type,
    final_outcome: session.final_outcome,
    work_mode: session.work_mode,
    language: session.language,
    framework: session.framework,
    duration_seconds: session.duration_seconds,
    retry_count: session.retry_count,
    error_count: session.error_count,
    input_tokens_estimate: session.input_tokens_estimate,
    output_tokens_estimate: session.output_tokens_estimate,
    cached_tokens_estimate: session.cached_tokens_estimate,
    estimated_cost_usd: session.estimated_cost_usd,
    cost_source: session.cost_source,
    repo_size_bucket: session.repo_size_bucket,
    file_count_bucket: session.file_count_bucket,
    changed_file_count_bucket: session.changed_file_count_bucket,
    lines_added_bucket: session.lines_added_bucket,
    lines_removed_bucket: session.lines_removed_bucket,
    tests_outcome: session.tests_outcome,
    build_outcome: session.build_outcome,
    lint_outcome: session.lint_outcome,
    typecheck_outcome: session.typecheck_outcome,
    manual_review_outcome: session.manual_review_outcome,
    verified_success: deriveVerifiedSuccess(session),
  };
}

function formatObject(record: Record<string, unknown>): string[] {
  return Object.entries(record)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `- ${key}: ${String(value)}`);
}

function removeUndefinedValues<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as T;
}

function contributionIdFor(session: LocalSession): string {
  const input = session.session_id ?? `${session.provider}:${session.model_id}:${session.timestamp}`;
  return `contrib_${createHash("sha256").update(input).digest("hex").slice(0, 16)}`;
}

function timestampBucket(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function dataSourceFor(session: LocalSession): string {
  switch (session.work_mode) {
    case "manual_log":
      return "manual";
    case "tool_import":
      return "imported";
    case "cli_wrapper":
      return "wrapper";
    default:
      return "unknown";
  }
}
