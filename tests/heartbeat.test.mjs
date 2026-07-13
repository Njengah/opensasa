import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openStore } from "../dist/storage.js";

test("stores privacy-safe activity heartbeats locally", () => {
  const root = mkdtempSync(join(tmpdir(), "opensasa-heartbeat-"));
  const store = openStore(join(root, "heartbeat.db"));
  try {
    const heartbeat = store.recordActivityHeartbeat({
      timestamp: "2026-07-13T12:00:00.000Z",
      project_identity_hash: "a".repeat(64),
    });
    assert.equal(heartbeat.project_identity_hash, "a".repeat(64));
    assert.deepEqual(store.listActivityHeartbeats(), [heartbeat]);
  } finally {
    store.close();
    rmSync(root, { recursive: true, force: true });
  }
});
