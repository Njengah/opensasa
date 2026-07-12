import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { calculateDashboardTrend, createDashboardServer, listenDashboardServer } from "../dist/dashboard.js";
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
    assert.match(pageHtml, /model-comparison/);
    assert.match(pageHtml, /tool-comparison/);
    assert.match(pageHtml, /renderComparison/);

    const reportResponse = await fetch(`http://${address.host}:${address.port}/api/report`);
    assert.equal(reportResponse.status, 200);
    const report = await reportResponse.json();
    assert.equal(report.totalSessions, 1);
    assert.equal(report.estimatedTotalCostUsd, 0.5);
    assert.deepEqual(report.trendByDay, [{
      date: "2026-07-11",
      sessions: 1,
      usefulSessions: 1,
      estimatedCostUsd: 0.5,
    }]);

    const missingResponse = await fetch(`http://${address.host}:${address.port}/missing`);
    assert.equal(missingResponse.status, 404);
  } finally {
    server.closeIdleConnections?.();
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  }
});

test("calculates a sorted daily dashboard trend", () => {
  const trend = calculateDashboardTrend([
    { timestamp: "2026-07-12T12:00:00.000Z", final_outcome: "rejected", estimated_cost_usd: 1 },
    { timestamp: "2026-07-11T12:00:00.000Z", final_outcome: "accepted" },
    { timestamp: "2026-07-12T13:00:00.000Z", final_outcome: "partially_accepted", estimated_cost_usd: 0.5 },
  ]);

  assert.deepEqual(trend, [
    { date: "2026-07-11", sessions: 1, usefulSessions: 1, estimatedCostUsd: null },
    { date: "2026-07-12", sessions: 2, usefulSessions: 1, estimatedCostUsd: 1.5 },
  ]);
});
