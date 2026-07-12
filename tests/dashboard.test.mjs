import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDashboardServer, listenDashboardServer } from "../dist/dashboard.js";
import { openStore } from "../dist/storage.js";

test("serves a local dashboard and report API", async () => {
  const root = mkdtempSync(join(tmpdir(), "opensasa-dashboard-"));
  const dbPath = join(root, "dashboard.db");
  const store = openStore(dbPath);
  store.createSession({
    timestamp: "2026-07-11T12:00:00.000Z",
    provider: "OpenAI",
    model_id: "gpt-5",
    task_type: "bug_fix",
    final_outcome: "accepted",
    work_mode: "manual_log",
    tests_outcome: "passed",
    estimated_cost_usd: 0.5,
  });
  store.close();

  const server = createDashboardServer({ dbPath });
  const address = await listenDashboardServer(server, "127.0.0.1", 0);

  try {
    const page = await fetch(`http://${address.host}:${address.port}/`);
    assert.equal(page.status, 200);
    const pageHtml = await page.text();
    assert.match(pageHtml, /OpenSasa Dashboard/);
    assert.match(pageHtml, /No data is uploaded/);
    assert.match(pageHtml, /total-sessions/);
    assert.match(pageHtml, /useful-rate/);
    assert.match(pageHtml, /fetch\("\/api\/report"\)/);

    const reportResponse = await fetch(`http://${address.host}:${address.port}/api/report`);
    assert.equal(reportResponse.status, 200);
    const report = await reportResponse.json();
    assert.equal(report.totalSessions, 1);
    assert.equal(report.estimatedTotalCostUsd, 0.5);

    const missingResponse = await fetch(`http://${address.host}:${address.port}/missing`);
    assert.equal(missingResponse.status, 404);
  } finally {
    server.closeIdleConnections?.();
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  }
});
