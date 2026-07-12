import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveDatabasePath } from "../dist/config.js";

test("resolves a database path from local config", () => {
  const root = mkdtempSync(join(tmpdir(), "opensasa-config-"));
  const configPath = join(root, "config.json");
  const dbPath = join(root, "configured.db");
  const previousConfig = process.env.OPENSASA_CONFIG_PATH;
  const previousDb = process.env.OPENSASA_DB_PATH;

  try {
    delete process.env.OPENSASA_DB_PATH;
    process.env.OPENSASA_CONFIG_PATH = configPath;
    mkdirSync(root, { recursive: true });
    writeFileSync(configPath, JSON.stringify({ db_path: dbPath }));
    assert.equal(resolveDatabasePath(), dbPath);
    assert.equal(resolveDatabasePath("explicit.db"), "explicit.db");
  } finally {
    if (previousConfig === undefined) delete process.env.OPENSASA_CONFIG_PATH;
    else process.env.OPENSASA_CONFIG_PATH = previousConfig;
    if (previousDb === undefined) delete process.env.OPENSASA_DB_PATH;
    else process.env.OPENSASA_DB_PATH = previousDb;
    rmSync(root, { recursive: true, force: true });
  }
});
