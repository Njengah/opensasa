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
  const openAiSession = store.createSession({
    timestamp: "2026-07-11T12:00:00.000Z",
    provider: "OpenAI",
    model_id: "gpt-5",
    task_type: "bug_fix",
    final_outcome: "accepted",
    work_mode: "manual_log",
    tests_outcome: "passed",
    estimated_cost_usd: 0.5,
    contribution_consent: "granted",
  });
  store.createSession({
    timestamp: "2026-07-12T12:00:00.000Z",
    provider: "Anthropic",
    model_id: "claude-sonnet-4.5",
    task_type: "feature",
    final_outcome: "accepted",
    work_mode: "manual_log",
    contribution_consent: "not_granted",
  });
  store.createSession({
    timestamp: "2026-07-13T12:00:00.000Z",
    provider: "OpenAI",
    model_id: "gpt-5-mini",
    task_type: "data_analysis",
    final_outcome: "accepted",
    work_mode: "manual_log",
    contribution_consent: "granted",
  });
  store.recordContributionHistory({
    exported_at: "2026-07-12T15:00:00.000Z",
    session_id: openAiSession.session_id,
    contribution_id: "contrib_dashboard_openai",
    payload_version: "v0.2.0",
    output_path: "C:\\exports\\openai.json",
    provider: "OpenAI",
    model_id: "gpt-5",
    tool: "Codex",
    language: "TypeScript",
    framework: "Node.js",
    task_type: "bug_fix",
    final_outcome: "accepted",
    consent_state: "granted",
    validation_status: "passed",
  });
  store.recordContributionHistory({
    exported_at: "2026-07-12T16:00:00.000Z",
    session_id: "session-export-anthropic",
    contribution_id: "contrib_dashboard_anthropic",
    payload_version: "v0.2.0",
    output_path: "C:\\exports\\anthropic.json",
    provider: "Anthropic",
    model_id: "claude-sonnet-4.5",
    task_type: "feature",
    final_outcome: "accepted",
    consent_state: "not_granted",
    validation_status: "passed",
  });
  store.updateSession(openAiSession.session_id, {
    contribution_consent: "revoked",
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
    assert.match(pageHtml, /fetch\("\/api\/report" \+ queryString\)/);
    assert.match(pageHtml, /model-comparison/);
    assert.match(pageHtml, /tool-comparison/);
    assert.match(pageHtml, /renderComparison/);
    assert.match(pageHtml, /id="filters"/);
    assert.match(pageHtml, /name="provider"/);
    assert.match(pageHtml, /id="empty-state"/);
    assert.match(pageHtml, /demo-seed/);
    assert.match(pageHtml, /id="model-cost-chart"/);
    assert.match(pageHtml, /id="tool-cost-chart"/);
    assert.match(pageHtml, /renderCostChart/);
    assert.match(pageHtml, /id="outcome-chart"/);
    assert.match(pageHtml, /id="verification-chart"/);
    assert.match(pageHtml, /renderVerification/);
    assert.match(pageHtml, /Contribution bundle preview/);
    assert.match(pageHtml, /fetch\("\/api\/contribution-bundle" \+ queryString\)/);
    assert.match(pageHtml, /contribution-bundle-list/);
    assert.match(pageHtml, /renderContributionBundle/);
    assert.match(pageHtml, /Contribution history/);
    assert.match(pageHtml, /fetch\("\/api\/contribution-history" \+ queryString\)/);
    assert.match(pageHtml, /renderContributionHistory/);

    const reportResponse = await fetch(`http://${address.host}:${address.port}/api/report`);
    assert.equal(reportResponse.status, 200);
    const report = await reportResponse.json();
    assert.equal(report.totalSessions, 3);
    assert.equal(report.estimatedTotalCostUsd, 0.5);
    assert.deepEqual(report.trendByDay, [
      {
        date: "2026-07-11",
        sessions: 1,
        usefulSessions: 1,
        estimatedCostUsd: 0.5,
      },
      {
        date: "2026-07-12",
        sessions: 1,
        usefulSessions: 1,
        estimatedCostUsd: null,
      },
      {
        date: "2026-07-13",
        sessions: 1,
        usefulSessions: 1,
        estimatedCostUsd: null,
      },
    ]);

    const bundleResponse = await fetch(`http://${address.host}:${address.port}/api/contribution-bundle`);
    assert.equal(bundleResponse.status, 200);
    const bundle = await bundleResponse.json();
    assert.equal(bundle.included_session_count, 1);
    assert.deepEqual(bundle.consent_summary, {
      granted: 1,
      not_granted: 1,
      revoked: 1,
    });
    assert.equal(bundle.validation_summary.status, "passed");
    assert.equal(bundle.validation_summary.payload_count, 1);
    assert.equal(bundle.included_payloads.length, 1);
    assert.equal(bundle.included_payloads[0].payload.model_id, "gpt-5-mini");
    assert.match(bundle.excluded_fields.join("\n"), /terminal output/);

    const historyResponse = await fetch(`http://${address.host}:${address.port}/api/contribution-history`);
    assert.equal(historyResponse.status, 200);
    const history = await historyResponse.json();
    assert.equal(history.length, 2);
    assert.equal(history[0].contribution_id, "contrib_dashboard_anthropic");
    assert.equal(history[1].contribution_id, "contrib_dashboard_openai");
    assert.equal(history[0].output_path, "C:\\exports\\anthropic.json");
    assert.equal(history[0].current_consent_state, "not_granted");
    assert.equal(history[0].is_revoked, false);
    assert.equal(history[1].current_consent_state, "revoked");
    assert.equal(history[1].is_revoked, true);
    assert.equal(history[1].consent_active, false);

    const filteredResponse = await fetch(`http://${address.host}:${address.port}/api/report?provider=Anthropic`);
    assert.equal((await filteredResponse.json()).totalSessions, 1);

    const filteredBundleResponse = await fetch(`http://${address.host}:${address.port}/api/contribution-bundle?provider=Anthropic`);
    const filteredBundle = await filteredBundleResponse.json();
    assert.equal(filteredBundle.included_session_count, 0);
    assert.deepEqual(filteredBundle.consent_summary, {
      granted: 0,
      not_granted: 1,
      revoked: 0,
    });

    const filteredHistoryResponse = await fetch(`http://${address.host}:${address.port}/api/contribution-history?provider=Anthropic`);
    const filteredHistory = await filteredHistoryResponse.json();
    assert.equal(filteredHistory.length, 1);
    assert.equal(filteredHistory[0].contribution_id, "contrib_dashboard_anthropic");

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

test("renders the dashboard empty state when no sessions exist", async () => {
  const root = mkdtempSync(join(tmpdir(), "opensasa-dashboard-empty-"));
  const server = createDashboardServer({ dbPath: join(root, "empty.db") });
  const address = await listenDashboardServer(server, "127.0.0.1", 0);

  try {
    const page = await fetch(`http://${address.host}:${address.port}/`);
    const html = await page.text();
    assert.match(html, /No sessions yet/);
    assert.match(html, /demo-seed/);
    const report = await (await fetch(`http://${address.host}:${address.port}/api/report`)).json();
    assert.equal(report.totalSessions, 0);
  } finally {
    server.closeIdleConnections?.();
    await new Promise((resolve) => server.close(resolve));
    rmSync(root, { recursive: true, force: true });
  }
});
