import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildContributionPreview, type ContributionPreview } from "./inspect.js";
import type { LocalSession } from "./schema.js";

export type ContributionExportResult = {
  status: "exported";
  session_id: string;
  contribution_id: string;
  path: string;
};

export function writeContributionExport(
  session: LocalSession,
  outputPath: string,
): ContributionExportResult {
  const resolvedPath = resolve(outputPath);
  const payload = buildContributionPreview(session);
  mkdirSync(dirname(resolvedPath), { recursive: true });
  writeFileSync(resolvedPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return {
    status: "exported",
    session_id: session.session_id ?? "unknown",
    contribution_id: payload.contribution_id,
    path: resolvedPath,
  };
}

export type { ContributionPreview };
