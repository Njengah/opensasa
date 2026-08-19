import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { buildContributionBundlePreview } from "./inspect.js";
import { buildSeedPublicDashboard } from "./public-dashboard.js";
import { calculateLocalReport, formatLocalReportJson } from "./report.js";
import { isUsefulOutcome, type LocalSession } from "./schema.js";
import { openStore } from "./storage.js";

export type DashboardServerOptions = {
  dbPath?: string;
  host?: string;
  port?: number;
};

export type DashboardTrendPoint = {
  date: string;
  sessions: number;
  usefulSessions: number;
  estimatedCostUsd: number | null;
};

export function createDashboardServer(options: DashboardServerOptions = {}): Server {
  return createServer((request, response) => {
    handleDashboardRequest(request, response, options.dbPath);
  });
}

export async function listenDashboardServer(
  server: Server,
  host = "127.0.0.1",
  port = 3210,
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
    throw new Error("Dashboard server did not expose a network address.");
  }

  return { host, port: address.port };
}

function handleDashboardRequest(
  request: IncomingMessage,
  response: ServerResponse,
  dbPath?: string,
): void {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  if (url.pathname === "/") {
    sendHtml(response, dashboardHtml());
    return;
  }

  if (url.pathname === "/public") {
    sendHtml(response, publicDashboardHtml());
    return;
  }

  if (url.pathname === "/api/public/aggregates") {
    sendJson(response, 200, buildSeedPublicDashboard());
    return;
  }

  if (url.pathname === "/api/report") {
    let store;
    try {
      store = openStore(dbPath);
      const sessions = listDashboardSessions(store, url);
      sendJson(response, 200, {
        ...JSON.parse(formatLocalReportJson(calculateLocalReport(sessions))),
        trendByDay: calculateDashboardTrend(sessions),
      });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Unable to read local report." });
    } finally {
      store?.close();
    }
    return;
  }

  if (url.pathname === "/api/contribution-bundle") {
    let store;
    try {
      store = openStore(dbPath);
      const sessions = listDashboardSessions(store, url);
      sendJson(response, 200, buildContributionBundlePreview(sessions));
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to build contribution bundle preview.",
      });
    } finally {
      store?.close();
    }
    return;
  }

  if (url.pathname === "/api/contribution-history") {
    let store;
    try {
      store = openStore(dbPath);
      sendJson(response, 200, store.listContributionHistory({
        provider: url.searchParams.get("provider") ?? undefined,
        modelId: url.searchParams.get("model") ?? undefined,
        tool: url.searchParams.get("tool") ?? undefined,
        language: url.searchParams.get("language") ?? undefined,
        framework: url.searchParams.get("framework") ?? undefined,
        taskType: url.searchParams.get("taskType") ?? undefined,
        finalOutcome: url.searchParams.get("outcome") ?? undefined,
        limit: 12,
      }));
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : "Unable to read contribution history.",
      });
    } finally {
      store?.close();
    }
    return;
  }

  sendJson(response, 404, { error: "Not found." });
}

function opensasaShellCss(): string {
  return `
      :root {
        color-scheme: dark;
        --bg: #0c100e;
        --panel: #151b18;
        --panel-2: #1b2320;
        --text: #e7eee9;
        --muted: #8b968f;
        --line: #2a332e;
        --accent: #e2a34a;
        --ok: #5dcc8a;
        --ok-dim: rgba(93, 204, 138, 0.16);
        --bar: #3d6ea8;
        --bar-fill: linear-gradient(90deg, #3d6ea8, #7eb3e8);
        --cost: linear-gradient(90deg, #2f7a52, #5dcc8a);
        --danger: #d36b6b;
        font-family: "Segoe UI", ui-sans-serif, system-ui, sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      * { box-sizing: border-box; }
      body { margin: 0; background:
        radial-gradient(1200px 500px at 10% -10%, rgba(226, 163, 74, 0.08), transparent 50%),
        var(--bg); }
      main { max-width: 1120px; margin: 0 auto; padding: 28px 20px 72px; }
      .topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
      .brand { display: flex; gap: 14px; align-items: center; }
      .mark { width: 36px; height: 36px; border-radius: 10px; background:
        conic-gradient(from 210deg, var(--accent), #5dcc8a, #3d6ea8, var(--accent));
        box-shadow: 0 0 0 4px rgba(226, 163, 74, 0.12); flex-shrink: 0; }
      h1 { margin: 0 0 4px; font-size: 1.55rem; letter-spacing: -0.03em; }
      h2 { margin: 0 0 12px; font-size: 0.92rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-weight: 650; }
      h3 { margin: 18px 0 10px; font-size: 0.85rem; color: var(--muted); font-weight: 600; }
      .muted { color: var(--muted); }
      .nav { display: flex; gap: 8px; flex-wrap: wrap; }
      .nav a { color: var(--text); text-decoration: none; border: 1px solid var(--line); background: var(--panel); border-radius: 999px; padding: 6px 12px; font-size: 0.85rem; }
      .nav a:hover { border-color: var(--accent); }
      .notice { border: 1px solid rgba(93, 204, 138, 0.35); background: var(--ok-dim); border-radius: 12px; padding: 12px 16px; color: #cfe9d8; }
      .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 20px 0; }
      .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 16px 16px 14px; }
      .card span, .card .muted { font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; }
      .card strong { display: block; font-size: 1.55rem; margin-top: 8px; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
      .comparison { background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 18px; margin-top: 16px; }
      .split { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
      @media (max-width: 840px) { .split { grid-template-columns: 1fr; } }
      table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
      th, td { border-bottom: 1px solid var(--line); padding: 10px 6px; text-align: left; }
      th { color: var(--muted); font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600; }
      th:last-child, td:last-child { text-align: right; }
      tr:last-child td { border-bottom: 0; }
      .trend-row { align-items: center; display: grid; gap: 10px; grid-template-columns: minmax(88px, 140px) 1fr 92px; margin: 10px 0; font-size: 0.9rem; }
      .trend-row span:last-child { text-align: right; color: var(--muted); font-variant-numeric: tabular-nums; }
      .bar-track { background: var(--panel-2); border-radius: 999px; height: 10px; overflow: hidden; }
      .trend-bar { background: var(--bar-fill); border-radius: 999px; min-width: 2px; height: 10px; }
      .cost-bar { background: var(--cost); border-radius: 999px; min-width: 2px; height: 10px; }
      .empty-state { background: rgba(226, 163, 74, 0.08); border: 1px solid rgba(226, 163, 74, 0.35); border-radius: 14px; padding: 16px 18px; }
      .bundle-summary { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin: 16px 0; }
      .bundle-list { display: grid; gap: 10px; }
      .bundle-item { background: var(--panel-2); border: 1px solid var(--line); border-radius: 12px; padding: 12px; }
      .bundle-meta { color: var(--muted); font-size: 0.9rem; }
      .pill { background: var(--panel-2); border: 1px solid var(--line); border-radius: 999px; display: inline-block; margin-right: 8px; padding: 4px 10px; font-size: 0.8rem; }
      .field-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
      code { background: var(--panel-2); border-radius: 6px; padding: 2px 6px; font-size: 0.88em; }
      a { color: var(--accent); }
      .filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
      .filters h2 { grid-column: 1 / -1; margin-bottom: 0; }
      .filters label { display: flex; flex-direction: column; gap: 6px; font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
      .filters select { background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 10px; padding: 9px 10px; }
      .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-top: 24px; }
      #status { margin-top: 20px; }
      .foot { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px; font-size: 0.9rem; }
  `;
}

function publicDashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OpenSasa Public Aggregate Preview</title>
    <style>${opensasaShellCss()}</style>
  </head>
  <body>
    <main>
      <div class="topbar">
        <div class="brand">
          <span class="mark" aria-hidden="true"></span>
          <div>
            <h1>OpenSasa Public Aggregate Preview</h1>
            <p class="muted">Seed-only public dashboard for methodology and UI validation.</p>
          </div>
        </div>
        <nav class="nav"><a href="/">Local dashboard</a></nav>
      </div>
      <p class="notice">This page shows illustrative seed data only. It does not use real contribution data, upload data, or publish rankings.</p>
      <p id="real-data-gate" class="notice">Checking real-data dashboard gate...</p>
      <section id="records" class="grid"><article class="card">Loading seed aggregates...</article></section>
      <p class="foot"><a href="/api/public/aggregates">View seed aggregate JSON</a><a href="/">Back to local dashboard</a></p>
    </main>
    <script>
      const records = document.querySelector("#records");
      const realDataGate = document.querySelector("#real-data-gate");
      fetch("/api/public/aggregates")
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("Seed aggregates unavailable")))
        .then((payload) => {
          realDataGate.textContent = "Real-data gate: " + payload.real_data_gate.status + ". " + payload.real_data_gate.notes.join(" ");
          records.replaceChildren(...payload.records.map((record) => {
            const article = document.createElement("article");
            article.className = "card";

            const title = document.createElement("h2");
            title.textContent = record.group.value;
            article.append(title);

            const group = document.createElement("p");
            group.className = "muted";
            group.textContent = record.view_type + " / " + record.group.dimension;
            article.append(group);

            const taskCount = document.createElement("p");
            taskCount.append("Tasks: ");
            const taskCountValue = document.createElement("strong");
            taskCountValue.textContent = String(record.metrics.task_count);
            taskCount.append(taskCountValue);
            article.append(taskCount);

            const acceptedCount = document.createElement("p");
            acceptedCount.append("Accepted or partial: ");
            const acceptedCountValue = document.createElement("strong");
            acceptedCountValue.textContent = String(record.metrics.accepted_count + record.metrics.partially_accepted_count);
            acceptedCount.append(acceptedCountValue);
            article.append(acceptedCount);

            const verifiedCount = document.createElement("p");
            verifiedCount.append("Verified success: ");
            const verifiedCountValue = document.createElement("strong");
            verifiedCountValue.textContent = String(record.metrics.verified_success_count);
            verifiedCount.append(verifiedCountValue);
            article.append(verifiedCount);

            const confidence = document.createElement("span");
            confidence.className = "pill";
            confidence.textContent = "confidence: " + record.quality.confidence_label;
            article.append(confidence);

            const quality = document.createElement("span");
            quality.className = "pill";
            quality.textContent = "quality: " + record.quality.data_quality_label;
            article.append(quality);

            const provenance = document.createElement("span");
            provenance.className = "pill";
            provenance.textContent = "provenance: " + record.data_provenance;
            article.append(provenance);

            const notes = document.createElement("p");
            notes.className = "muted";
            notes.textContent = record.quality.notes.join(" ");
            article.append(notes);

            return article;
          }));
        })
        .catch(() => {
          const fallback = document.createElement("article");
          fallback.className = "card";
          fallback.textContent = "Unable to load seed aggregates.";
          records.replaceChildren(fallback);
        });
    </script>
  </body>
</html>`;
}

export function calculateDashboardTrend(sessions: LocalSession[]): DashboardTrendPoint[] {
  const points = new Map<string, DashboardTrendPoint>();

  for (const session of sessions) {
    const date = session.timestamp.slice(0, 10);
    const point = points.get(date) ?? {
      date,
      sessions: 0,
      usefulSessions: 0,
      estimatedCostUsd: null,
    };
    point.sessions += 1;
    if (isUsefulOutcome(session.final_outcome)) {
      point.usefulSessions += 1;
    }
    if (session.estimated_cost_usd !== undefined) {
      point.estimatedCostUsd = (point.estimatedCostUsd ?? 0) + session.estimated_cost_usd;
    }
    points.set(date, point);
  }

  return [...points.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function sendHtml(response: ServerResponse, html: string): void {
  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(html);
}

function sendJson(response: ServerResponse, statusCode: number, value: unknown): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}

function listDashboardSessions(
  store: ReturnType<typeof openStore>,
  url: URL,
): LocalSession[] {
  return store.listSessions({
    provider: url.searchParams.get("provider") ?? undefined,
    modelId: url.searchParams.get("model") ?? undefined,
    tool: url.searchParams.get("tool") ?? undefined,
    language: url.searchParams.get("language") ?? undefined,
    framework: url.searchParams.get("framework") ?? undefined,
    taskType: url.searchParams.get("taskType") ?? undefined,
    finalOutcome: url.searchParams.get("outcome") ?? undefined,
  });
}

function dashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OpenSasa Dashboard</title>
    <style>${opensasaShellCss()}</style>
  </head>
  <body>
    <main>
      <header class="topbar">
        <div class="brand">
          <span class="mark" aria-hidden="true"></span>
          <div>
            <h1>OpenSasa Dashboard</h1>
            <p class="muted">Your private AI coding workflow report.</p>
          </div>
        </div>
        <nav class="nav">
          <a href="/">Local</a>
          <a href="/public">Public preview</a>
          <a href="/api/report">Report JSON</a>
        </nav>
      </header>
      <p class="notice">This dashboard reads only your local OpenSasa database. No data is uploaded.</p>
      <section id="empty-state" class="empty-state" hidden>
        <h2>No sessions yet</h2>
        <p>Your local dashboard is ready. Log a session or create safe demo data to explore the report.</p>
        <p><code>node ./dist/index.js demo-seed</code></p>
        <p>After seeding, refresh this page to see the dashboard populate.</p>
      </section>
      <form id="filters" class="comparison filters" aria-label="Dashboard filters">
        <h2>Filters</h2>
        <label>Provider <select name="provider"><option value="">All</option></select></label>
        <label>Model <select name="model"><option value="">All</option></select></label>
        <label>Tool <select name="tool"><option value="">All</option></select></label>
        <label>Language <select name="language"><option value="">All</option></select></label>
        <label>Framework <select name="framework"><option value="">All</option></select></label>
        <label>Task type <select name="taskType"><option value="">All</option></select></label>
        <label>Outcome <select name="outcome"><option value="">All</option><option value="accepted">Accepted</option><option value="partially_accepted">Partially accepted</option><option value="rejected">Rejected</option><option value="unknown">Unknown</option></select></label>
      </form>
      <section class="cards" aria-label="Report overview">
        <article class="card">Sessions<strong id="total-sessions">Loading…</strong></article>
        <article class="card">Useful outcome rate<strong id="useful-rate">Loading…</strong></article>
        <article class="card">Estimated cost<strong id="estimated-cost">Loading…</strong></article>
        <article class="card">Confidence<strong id="confidence">Loading…</strong></article>
      </section>
      <div class="split">
      <section class="comparison" aria-labelledby="model-comparison-title">
        <h2 id="model-comparison-title">Models</h2>
        <table><thead><tr><th>Model</th><th>Sessions</th><th>Cost</th></tr></thead><tbody id="model-comparison"><tr><td colspan="3">Loading…</td></tr></tbody></table>
      </section>
      <section class="comparison" aria-labelledby="tool-comparison-title">
        <h2 id="tool-comparison-title">Tools</h2>
        <table><thead><tr><th>Tool</th><th>Sessions</th><th>Cost</th></tr></thead><tbody id="tool-comparison"><tr><td colspan="3">Loading…</td></tr></tbody></table>
      </section>
      </div>
      <div class="split">
      <section class="comparison" aria-labelledby="trend-title">
        <h2 id="trend-title">Daily trend</h2>
        <div id="daily-trend"><p class="muted">Loading…</p></div>
      </section>
      <section class="comparison" aria-labelledby="cost-title">
        <h2 id="cost-title">Cost summary</h2>
        <p>Total estimated cost: <strong id="total-cost">Loading…</strong></p>
        <h3>By model</h3>
        <div id="model-cost-chart"><p class="muted">Loading…</p></div>
        <h3>By tool</h3>
        <div id="tool-cost-chart"><p class="muted">Loading…</p></div>
      </section>
      </div>
      <section class="comparison" aria-labelledby="outcome-title">
        <h2 id="outcome-title">Outcomes</h2>
        <div id="outcome-chart"><p class="muted">Loading…</p></div>
        <h2>Verification</h2>
        <div id="verification-chart"><p class="muted">Loading…</p></div>
      </section>
      <section class="comparison" aria-labelledby="contribution-bundle-title">
        <h2 id="contribution-bundle-title">Contribution bundle preview</h2>
        <p class="muted">This local-only preview shows which consent-granted sessions would be included in a future privacy-safe contribution bundle.</p>
        <div id="contribution-bundle-summary" class="bundle-summary"><p class="muted">Loading…</p></div>
        <p id="contribution-bundle-status" class="muted">Loading…</p>
        <div id="contribution-bundle-list" class="bundle-list"><p class="muted">Loading…</p></div>
        <h3>Excluded fields</h3>
        <div id="contribution-bundle-excluded-fields" class="field-list"><p class="muted">Loading…</p></div>
      </section>
      <section class="comparison" aria-labelledby="contribution-history-title">
        <h2 id="contribution-history-title">Contribution history</h2>
        <p class="muted">Recent local exports recorded on this machine. This is local bookkeeping only; no upload destination exists in the MVP.</p>
        <div id="contribution-history-list" class="bundle-list"><p class="muted">Loading…</p></div>
      </section>
      <p id="status" class="muted">Loading your local report…</p>
      <p class="foot">
        <a href="/api/report">View local report JSON</a>
        <a href="/api/contribution-bundle">View contribution bundle JSON</a>
        <a href="/api/contribution-history">View contribution history JSON</a>
      </p>
    </main>
    <script>
      const formatRate = (metric) => metric.rate === null ? "unknown" : (metric.rate * 100).toFixed(1) + "%";
      const formatCost = (value) => value === null ? "unknown" : "$" + value.toFixed(4);
      const filterForm = document.querySelector("#filters");
      const query = new URLSearchParams(window.location.search);
      const optionValues = (selectName, values) => {
        const select = filterForm.elements[selectName];
        const selected = query.get(selectName) || "";
        for (const value of values) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          option.selected = value === selected;
          select.append(option);
        }
      };
      const setFilterOptions = (report) => {
        optionValues("provider", Object.keys(report.sessionsByProvider));
        optionValues("model", Object.keys(report.sessionsByModel).map((value) => value.split("/").slice(1).join("/")));
        optionValues("tool", Object.keys(report.sessionsByTool));
        optionValues("language", Object.keys(report.sessionsByLanguage));
        optionValues("framework", Object.keys(report.sessionsByFramework));
        optionValues("taskType", Object.keys(report.sessionsByTaskType));
      };
      filterForm.addEventListener("change", () => {
        const nextQuery = new URLSearchParams(new FormData(filterForm));
        for (const [key, value] of [...nextQuery]) if (!value) nextQuery.delete(key);
        window.location.search = nextQuery.toString();
      });
      const renderComparison = (elementId, counts, costs) => {
        const rows = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        const element = document.querySelector("#" + elementId);
        element.innerHTML = rows.length === 0
          ? '<tr><td colspan="3">No sessions recorded.</td></tr>'
          : rows.map(([name, count]) => '<tr><td>' + name + '</td><td>' + count + '</td><td>' + formatCost(costs[name] ?? null) + '</td></tr>').join("");
      };
      const renderTrend = (points) => {
        const element = document.querySelector("#daily-trend");
        if (points.length === 0) { element.innerHTML = '<p class="muted">No sessions recorded.</p>'; return; }
        const maximum = Math.max(...points.map((point) => point.sessions));
        element.innerHTML = points.map((point) => {
          const width = Math.max(2, (point.sessions / maximum) * 100);
          return '<div class="trend-row"><span>' + point.date + '</span><div class="bar-track"><div class="trend-bar" style="width:' + width + '%" title="' + point.sessions + ' sessions"></div></div><span>' + point.usefulSessions + '/' + point.sessions + ' useful</span></div>';
        }).join("");
      };
      const renderCostChart = (elementId, costs) => {
        const rows = Object.entries(costs).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        const element = document.querySelector("#" + elementId);
        if (rows.length === 0) { element.innerHTML = '<p class="muted">No cost data recorded.</p>'; return; }
        const maximum = Math.max(...rows.map((row) => row[1]));
        element.innerHTML = rows.map(([name, cost]) => {
          const width = Math.max(2, (cost / maximum) * 100);
          return '<div class="trend-row"><span>' + name + '</span><div class="bar-track"><div class="cost-bar" style="width:' + width + '%" title="' + formatCost(cost) + '"></div></div><span>' + formatCost(cost) + '</span></div>';
        }).join("");
      };
      const renderCountChart = (elementId, counts) => {
        const rows = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        const element = document.querySelector("#" + elementId);
        if (rows.length === 0) { element.innerHTML = '<p class="muted">No verification data recorded.</p>'; return; }
        const maximum = Math.max(...rows.map((row) => row[1]));
        element.innerHTML = rows.map(([name, count]) => {
          const width = Math.max(2, (count / maximum) * 100);
          return '<div class="trend-row"><span>' + name + '</span><div class="bar-track"><div class="trend-bar" style="width:' + width + '%" title="' + count + ' sessions"></div></div><span>' + count + '</span></div>';
        }).join("");
      };
      const renderVerification = (summary) => {
        const element = document.querySelector("#verification-chart");
        element.innerHTML = Object.entries(summary).map(([field, counts]) => {
          const recorded = Object.entries(counts).filter(([outcome]) => outcome !== "unknown").reduce((total, [, count]) => total + count, 0);
          return '<div class="trend-row"><span>' + field.replace("_outcome", "") + '</span><div class="bar-track"><div class="trend-bar" style="width:' + Math.min(100, recorded * 10) + '%" title="' + recorded + ' recorded"></div></div><span>' + recorded + ' recorded</span></div>';
        }).join("");
      };
      const renderContributionBundle = (bundle) => {
        const summary = document.querySelector("#contribution-bundle-summary");
        summary.innerHTML = [
          ["Included payloads", bundle.included_session_count],
          ["Consent granted", bundle.consent_summary.granted],
          ["Consent pending", bundle.consent_summary.not_granted],
          ["Consent revoked", bundle.consent_summary.revoked],
        ].map(([label, value]) => '<article class="card"><span class="muted">' + label + '</span><strong>' + value + '</strong></article>').join("");
        document.querySelector("#contribution-bundle-status").textContent =
          "Bundle " + bundle.validation_summary.status + ": " +
          bundle.validation_summary.payload_count + " payloads, " +
          bundle.validation_summary.failed_count + " failed validation, " +
          bundle.validation_summary.forbidden_field_count + " forbidden fields, " +
          bundle.validation_summary.unknown_field_count + " unknown fields.";
        const list = document.querySelector("#contribution-bundle-list");
        list.innerHTML = bundle.included_payloads.length === 0
          ? '<p class="muted">No consent-granted sessions match the current filters.</p>'
          : bundle.included_payloads.map((item) =>
              '<article class="bundle-item">' +
              '<strong>' + item.payload.contribution_id + '</strong>' +
              '<div class="bundle-meta">' + item.payload.provider + ' / ' + item.payload.model_id + ' · ' + item.payload.task_type + ' · ' + item.payload.timestamp_bucket + '</div>' +
              '<div class="field-list">' +
              '<span class="pill">validation: ' + item.validation.status + '</span>' +
              '<span class="pill">verified_success: ' + item.payload.verified_success + '</span>' +
              '<span class="pill">payload_version: ' + item.payload.payload_version + '</span>' +
              '</div>' +
              '</article>'
            ).join("");
        const excluded = document.querySelector("#contribution-bundle-excluded-fields");
        excluded.innerHTML = bundle.excluded_fields.map((field) => '<span class="pill">' + field + '</span>').join("");
      };
      const renderContributionHistory = (history) => {
        const list = document.querySelector("#contribution-history-list");
        list.innerHTML = history.length === 0
          ? '<p class="muted">No local contribution exports have been recorded yet.</p>'
          : history.map((entry) =>
              (entry.is_revoked ? '<article class="bundle-item" style="border-color: rgba(176, 64, 64, 0.35);">' : '<article class="bundle-item">') +
              (entry.is_revoked ? '<div class="bundle-meta">Local consent was revoked after this export. The record remains for inspection only.</div>' : '') +
              '<strong>' + entry.contribution_id + '</strong>' +
              '<div class="bundle-meta">' + entry.provider + ' / ' + entry.model_id + ' · ' + entry.task_type + ' · exported ' + entry.exported_at.slice(0, 19).replace("T", " ") + '</div>' +
              '<div class="field-list">' +
              '<span class="pill">validation: ' + entry.validation_status + '</span>' +
              '<span class="pill">exported with: ' + entry.consent_state + '</span>' +
              '<span class="pill">current consent: ' + entry.current_consent_state + '</span>' +
              '<span class="pill">consent active: ' + (entry.consent_active ? 'yes' : 'no') + '</span>' +
              '<span class="pill">payload_version: ' + entry.payload_version + '</span>' +
              '</div>' +
              '<div class="bundle-meta">' + entry.output_path + '</div>' +
              '</article>'
            ).join("");
      };
      const queryString = window.location.search;
      Promise.all([
        fetch("/api/report" + queryString).then((response) => response.ok ? response.json() : Promise.reject(new Error("Report unavailable"))),
        fetch("/api/contribution-bundle" + queryString).then((response) => response.ok ? response.json() : Promise.reject(new Error("Contribution bundle unavailable"))),
        fetch("/api/contribution-history" + queryString).then((response) => response.ok ? response.json() : Promise.reject(new Error("Contribution history unavailable"))),
      ])
        .then(([report, bundle, history]) => {
          setFilterOptions(report);
          document.querySelector("#empty-state").hidden = report.totalSessions !== 0;
          document.querySelector("#total-sessions").textContent = report.totalSessions;
          document.querySelector("#useful-rate").textContent = formatRate(report.usefulOutcomeRate);
          document.querySelector("#estimated-cost").textContent = formatCost(report.estimatedTotalCostUsd);
          document.querySelector("#total-cost").textContent = formatCost(report.estimatedTotalCostUsd);
          document.querySelector("#confidence").textContent = report.confidenceSummary.level;
          renderComparison("model-comparison", report.sessionsByModel, report.costByModelUsd);
          renderComparison("tool-comparison", report.sessionsByTool, report.costByToolUsd);
          renderTrend(report.trendByDay);
          renderCostChart("model-cost-chart", report.costByModelUsd);
          renderCostChart("tool-cost-chart", report.costByToolUsd);
          renderCountChart("outcome-chart", { accepted: report.acceptedOrPartiallyAcceptedCount, rejected: report.rejectedCount, unknown: report.unknownOutcomeCount });
          renderVerification(report.verificationOutcomeSummary);
          renderContributionBundle(bundle);
          renderContributionHistory(history);
          document.querySelector("#status").textContent = "Report loaded from local storage.";
        })
        .catch(() => { document.querySelector("#status").textContent = "Unable to load the local report."; });
    </script>
  </body>
</html>`;
}
