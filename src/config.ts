import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type OpenSasaConfig = {
  db_path?: string;
};

export function getConfigPath(): string {
  return process.env.OPENSASA_CONFIG_PATH ?? join(homedir(), ".opensasa", "config.json");
}

export function readConfig(): OpenSasaConfig {
  const path = getConfigPath();
  if (!existsSync(path)) {
    return {};
  }

  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`OpenSasa config must contain a JSON object: ${path}`);
  }

  const config = parsed as Record<string, unknown>;
  if (config.db_path !== undefined && (typeof config.db_path !== "string" || config.db_path.trim() === "")) {
    throw new Error(`OpenSasa config db_path must be a non-empty string: ${path}`);
  }

  return { db_path: config.db_path as string | undefined };
}

export function resolveDatabasePath(explicitPath?: string): string | undefined {
  if (explicitPath) return explicitPath;
  if (process.env.OPENSASA_DB_PATH) return process.env.OPENSASA_DB_PATH;
  return readConfig().db_path;
}
