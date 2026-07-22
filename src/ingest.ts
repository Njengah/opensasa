import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { validateServerContributionPayload, type ServerContributionValidation } from "./contribution-validation.js";
import { validateContributionPreview, type ContributionPreview } from "./inspect.js";

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
  server_validation: ServerContributionValidation;
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
    const serverValidation = validateServerContributionPayload(payload);
    return {
      status: "rejected",
      stored: false,
      validation,
      server_validation: serverValidation,
      contract_errors: serverValidation.issues.map((issue) => issue.message),
      notice: "Contribution payload must be a JSON object. Nothing was stored.",
    };
  }

  const validation = validateContributionPreview(payload);
  const serverValidation = validateServerContributionPayload(payload);
  if (serverValidation.status === "failed") {
    return {
      status: "rejected",
      stored: false,
      contribution_id: typeof payload.contribution_id === "string" ? payload.contribution_id : undefined,
      payload_version: typeof payload.payload_version === "string" ? payload.payload_version : undefined,
      validation,
      server_validation: serverValidation,
      contract_errors: serverValidation.issues.map((issue) => issue.message),
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
    server_validation: serverValidation,
    contract_errors: [],
    notice: "Payload accepted by the intake boundary but not stored. Persistence is not enabled in this PR.",
  };
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
