import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { validateContributionPreview, type ContributionPreview } from "./inspect.js";
import {
  bucketValues,
  contributionPayloadVersion,
  finalOutcomes,
  schemaVersion,
  taskTypes,
  verificationOutcomes,
} from "./schema.js";

export type ContributionIngestionServerOptions = {
  host?: string;
  port?: number;
};

export type ContributionIngestionResult = {
  status: "accepted" | "rejected";
  stored: false;
  contribution_id?: string;
  payload_version?: string;
  validation: ReturnType<typeof validateContributionPreview>;
  contract_errors: string[];
  notice: string;
};

const maxBodyBytes = 128 * 1024;

export function createContributionIngestionServer(): Server {
  return createServer((request, response) => {
    void handleContributionIngestionRequest(request, response);
  });
}

export async function listenContributionIngestionServer(
  server: Server,
  host = "127.0.0.1",
  port = 3220,
): Promise<{ host: string; port: number }> {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Contribution ingestion server did not expose a network address.");
  }

  return { host, port: address.port };
}

async function handleContributionIngestionRequest(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, {
      status: "ok",
      service: "opensasa-contribution-ingestion",
      storage_enabled: false,
    });
    return;
  }

  if (url.pathname !== "/api/contributions") {
    sendJson(response, 404, { error: "Not found." });
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  if (!isJsonContentType(request.headers["content-type"])) {
    sendJson(response, 415, { error: "Expected application/json request body." });
    return;
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON body.";
    sendJson(response, message.includes("128KB") ? 413 : 400, { error: message });
    return;
  }

  const result = ingestContributionPayload(body);
  sendJson(response, result.status === "accepted" ? 202 : 422, result);
}

export function ingestContributionPayload(payload: unknown): ContributionIngestionResult {
  if (!isRecord(payload)) {
    const validation = validateContributionPreview({});
    return {
      status: "rejected",
      stored: false,
      validation,
      contract_errors: ["Payload must be a JSON object."],
      notice: "Contribution payload must be a JSON object. Nothing was stored.",
    };
  }

  const validation = validateContributionPreview(payload);
  const contractErrors = validateContributionPayloadContract(payload);
  if (validation.status === "failed" || contractErrors.length > 0) {
    return {
      status: "rejected",
      stored: false,
      contribution_id: typeof payload.contribution_id === "string" ? payload.contribution_id : undefined,
      payload_version: typeof payload.payload_version === "string" ? payload.payload_version : undefined,
      validation,
      contract_errors: contractErrors,
      notice: "Payload failed contribution-safe validation. Nothing was stored.",
    };
  }

  const contribution = payload as ContributionPreview;
  return {
    status: "accepted",
    stored: false,
    contribution_id: contribution.contribution_id,
    payload_version: contribution.payload_version,
    validation,
    contract_errors: [],
    notice: "Payload accepted by the intake boundary but not stored. Persistence is not enabled in this PR.",
  };
}

function validateContributionPayloadContract(payload: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const stringFields = [
    "contribution_id",
    "timestamp_bucket",
    "provider",
    "model_id",
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
  ];
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
  ];

  if (payload.schema_version !== schemaVersion) {
    errors.push(`schema_version must be ${schemaVersion}.`);
  }
  if (payload.payload_version !== contributionPayloadVersion) {
    errors.push(`payload_version must be ${contributionPayloadVersion}.`);
  }
  for (const field of stringFields) {
    if (typeof payload[field] !== "string" || payload[field].trim() === "") {
      errors.push(`${field} must be a non-empty string.`);
    }
  }
  for (const field of optionalStringFields) {
    if (payload[field] !== undefined && (typeof payload[field] !== "string" || payload[field].trim() === "")) {
      errors.push(`${field} must be a non-empty string when present.`);
    }
  }
  if (typeof payload.verified_success !== "boolean") {
    errors.push("verified_success must be a boolean.");
  }
  if (typeof payload.contribution_id === "string" && !/^contrib_[a-zA-Z0-9_-]+$/.test(payload.contribution_id)) {
    errors.push("contribution_id must be an opaque contrib_ identifier.");
  }
  if (typeof payload.timestamp_bucket === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(payload.timestamp_bucket)) {
    errors.push("timestamp_bucket must use YYYY-MM-DD format.");
  }
  if (typeof payload.task_type === "string" && !(taskTypes as readonly string[]).includes(payload.task_type)) {
    errors.push("task_type must be a documented task type.");
  }
  if (typeof payload.final_outcome === "string" && !(finalOutcomes as readonly string[]).includes(payload.final_outcome)) {
    errors.push("final_outcome must be a documented final outcome.");
  }
  for (const field of ["tests_outcome", "build_outcome", "lint_outcome", "typecheck_outcome"]) {
    const value = payload[field];
    if (typeof value === "string" && !(verificationOutcomes as readonly string[]).includes(value)) {
      errors.push(`${field} must be a documented verification outcome.`);
    }
  }
  for (const field of [
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
  ]) {
    const value = payload[field];
    if (typeof value === "string" && !isAllowedCountBucket(value)) {
      errors.push(`${field} must be a documented bucket value.`);
    }
  }
  if (typeof payload.duration_bucket === "string" && !isAllowedDurationBucket(payload.duration_bucket)) {
    errors.push("duration_bucket must be a documented duration bucket value.");
  }
  if (typeof payload.estimated_cost_bucket === "string" && !isAllowedCostBucket(payload.estimated_cost_bucket)) {
    errors.push("estimated_cost_bucket must be a documented cost bucket value.");
  }
  for (const field of ["provider", "model_id", "model_version", "tool", "language", "framework", "data_source"]) {
    const value = payload[field];
    if (typeof value === "string" && containsPrivateMarker(value)) {
      errors.push(`${field} contains private-looking text and must be normalized before ingestion.`);
    }
  }

  return errors;
}

function isJsonContentType(contentType: string | string[] | undefined): boolean {
  const value = Array.isArray(contentType) ? contentType[0] : contentType;
  return value?.toLowerCase().split(";")[0].trim() === "application/json";
}

function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    let byteLength = 0;

    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      byteLength += Buffer.byteLength(chunk);
      if (byteLength > maxBodyBytes) {
        reject(new Error("Request body exceeds the 128KB limit."));
        return;
      }
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    request.on("error", reject);
  });
}

function isAllowedCostBucket(value: string): boolean {
  return ["free", "under_1_cent", "under_10_cents", "under_1_usd", "under_10_usd", "over_10_usd", "unknown"].includes(value);
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

function sendJson(response: ServerResponse, statusCode: number, value: unknown): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
