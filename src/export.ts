import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  buildContributionPreview,
  validateContributionPreview,
  type ContributionPreview,
  type ContributionValidation,
} from "./inspect.js";
import type { LocalSession } from "./schema.js";

export type ContributionExportResult = {
  status: "exported";
  session_id: string;
  contribution_id: string;
  path: string;
  validation: ContributionValidation;
};

export function writeContributionExport(
  session: LocalSession,
  outputPath: string,
): ContributionExportResult {
  const resolvedPath = resolve(outputPath);
  const payload = buildContributionPreview(session);
  const validation = validateContributionPreview(payload);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  writeFileSync(resolvedPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return {
    status: "exported",
    session_id: session.session_id ?? "unknown",
    contribution_id: payload.contribution_id,
    path: resolvedPath,
    validation,
  };
}

export type { ContributionPreview };
