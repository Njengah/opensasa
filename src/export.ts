import { createHash, createHmac } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  buildContributionPreview,
  validateContributionPreview,
  type ContributionPreview,
  type ContributionValidation,
} from "./inspect.js";
import {
  contributionExportMetadataSchema,
  exportMetadataSchemaVersion,
  type ContributionExportMetadata,
  type LocalSession,
} from "./schema.js";

type ContributionExportOptions = {
  metadataPath?: string;
  signingSecret?: string;
  signingKeySource?: string;
  exportedAt?: string;
};

type ContributionExportMetadataResult = {
  path: string;
  document: ContributionExportMetadata;
};

export type ContributionExportResult = {
  status: "exported";
  session_id: string;
  contribution_id: string;
  payload_version: string;
  path: string;
  validation: ContributionValidation;
  metadata?: ContributionExportMetadataResult;
};

export function writeContributionExport(
  session: LocalSession,
  outputPath: string,
  options: ContributionExportOptions = {},
): ContributionExportResult {
  const resolvedPath = resolve(outputPath);
  const payload = buildContributionPreview(session);
  const validation = validateContributionPreview(payload);
  const payloadContents = `${JSON.stringify(payload, null, 2)}\n`;
  const payloadBuffer = Buffer.from(payloadContents, "utf8");
  mkdirSync(dirname(resolvedPath), { recursive: true });
  writeFileSync(resolvedPath, payloadContents, "utf8");

  if (options.signingSecret && !options.metadataPath) {
    throw new Error("Signed export metadata requires a metadata output path.");
  }

  const metadata = options.metadataPath
    ? writeContributionExportMetadata(
        payload,
        validation,
        payloadBuffer,
        options.metadataPath,
        resolvedPath,
        options.exportedAt,
        options.signingSecret,
        options.signingKeySource,
      )
    : undefined;

  return {
    status: "exported",
    session_id: session.session_id ?? "unknown",
    contribution_id: payload.contribution_id,
    payload_version: payload.payload_version,
    path: resolvedPath,
    validation,
    ...(metadata ? { metadata } : {}),
  };
}

export type { ContributionPreview };

function writeContributionExportMetadata(
  payload: ContributionPreview,
  validation: ContributionValidation,
  payloadBuffer: Buffer,
  metadataPath: string,
  payloadPath: string,
  exportedAt = new Date().toISOString(),
  signingSecret?: string,
  signingKeySource?: string,
): ContributionExportMetadataResult {
  const resolvedPath = resolve(metadataPath);

  if (resolvedPath === payloadPath) {
    throw new Error("Export metadata path must be different from the payload output path.");
  }

  const unsignedMetadata = contributionExportMetadataSchema.parse({
    schema_version: exportMetadataSchemaVersion,
    exported_at: exportedAt,
    contribution_id: payload.contribution_id,
    payload_version: payload.payload_version,
    payload_sha256: sha256Hex(payloadBuffer),
    payload_bytes: payloadBuffer.byteLength,
    validation_status: validation.status,
  });
  const document = contributionExportMetadataSchema.parse({
    ...unsignedMetadata,
    ...(signingSecret
      ? {
          signature: {
            algorithm: "hmac-sha256",
            key_source: signingKeySource ?? "provided",
            value: hmacSha256Hex(signingSecret, JSON.stringify(unsignedMetadata)),
          },
        }
      : {}),
  });
  mkdirSync(dirname(resolvedPath), { recursive: true });
  writeFileSync(resolvedPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");

  return {
    path: resolvedPath,
    document,
  };
}

function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

function hmacSha256Hex(secret: string, input: string): string {
  return createHmac("sha256", secret).update(input).digest("hex");
}
