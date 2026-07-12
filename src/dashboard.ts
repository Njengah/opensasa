import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
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

  if (url.pathname === "/api/report") {
    let store;
    try {
      store = openStore(dbPath ?? process.env.OPENSASA_DB_PATH);
      const sessions = store.listSessions({
        provider: url.searchParams.get("provider") ?? undefined,
        modelId: url.searchParams.get("model") ?? undefined,
        tool: url.searchParams.get("tool") ?? undefined,
        language: url.searchParams.get("language") ?? undefined,
        framework: url.searchParams.get("framework") ?? undefined,
        taskType: url.searchParams.get("taskType") ?? undefined,
        finalOutcome: url.searchParams.get("outcome") ?? undefined,
      });
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

  sendJson(response, 404, { error: "Not found." });
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

function dashboardHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>OpenSasa Dashboard</title>
    <style>
      :root { color-scheme: light; font-family: system-ui, sans-serif; background: #f6f7f9; color: #17202a; }
      body { margin: 0; }
      main { max-width: 960px; margin: 0 auto; padding: 32px 20px 56px; }
      header { margin-bottom: 28px; }
      h1 { margin: 0 0 8px; font-size: 2rem; }
      .muted { color: #5f6b76; }
      .notice { border: 1px solid #b8d9c2; background: #edf8f0; border-radius: 10px; padding: 12px 16px; }
      .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 24px 0; }
      .card { background: white; border: 1px solid #dfe4e8; border-radius: 10px; padding: 16px; }
      .card strong { display: block; font-size: 1.45rem; margin-top: 6px; }
      .comparison { background: white; border: 1px solid #dfe4e8; border-radius: 10px; padding: 16px; margin-top: 16px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border-bottom: 1px solid #edf0f2; padding: 10px 4px; text-align: left; }
      th:last-child, td:last-child { text-align: right; }
      .trend-bar { background: #dcecff; border-radius: 4px; min-width: 2px; height: 18px; }
      .trend-row { align-items: center; display: grid; gap: 10px; grid-template-columns: 100px 1fr 80px; margin: 10px 0; }
      .cost-bar { background: #d8f0df; border-radius: 4px; min-width: 2px; height: 18px; }
      a { color: #1459a6; }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>OpenSasa Dashboard</h1>
        <p class="muted">Your private AI coding workflow report.</p>
      </header>
      <p class="notice">This dashboard reads only your local OpenSasa database. No data is uploaded.</p>
      <form id="filters" class="comparison" aria-label="Dashboard filters">
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
      <section class="comparison" aria-labelledby="model-comparison-title">
        <h2 id="model-comparison-title">Models</h2>
        <table><thead><tr><th>Model</th><th>Sessions</th><th>Cost</th></tr></thead><tbody id="model-comparison"><tr><td colspan="3">Loading…</td></tr></tbody></table>
      </section>
      <section class="comparison" aria-labelledby="tool-comparison-title">
        <h2 id="tool-comparison-title">Tools</h2>
        <table><thead><tr><th>Tool</th><th>Sessions</th><th>Cost</th></tr></thead><tbody id="tool-comparison"><tr><td colspan="3">Loading…</td></tr></tbody></table>
      </section>
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
      <p id="status" class="muted">Loading your local report…</p>
      <p><a href="/api/report">View local report JSON</a></p>
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
          ? "<tr><td colspan=\"3\">No sessions recorded.</td></tr>"
          : rows.map(([name, count]) => "<tr><td>" + name + "</td><td>" + count + "</td><td>" + formatCost(costs[name] ?? null) + "</td></tr>").join("");
      };
      const renderTrend = (points) => {
        const element = document.querySelector("#daily-trend");
        if (points.length === 0) { element.innerHTML = "<p class=\"muted\">No sessions recorded.</p>"; return; }
        const maximum = Math.max(...points.map((point) => point.sessions));
        element.innerHTML = points.map((point) => {
          const width = Math.max(2, (point.sessions / maximum) * 100);
          return "<div class=\"trend-row\"><span>" + point.date + "</span><div class=\"trend-bar\" style=\"width:" + width + "%\" title=\"" + point.sessions + " sessions\"></div><span>" + point.usefulSessions + "/" + point.sessions + " useful</span></div>";
        }).join("");
      };
      const renderCostChart = (elementId, costs) => {
        const rows = Object.entries(costs).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        const element = document.querySelector("#" + elementId);
        if (rows.length === 0) { element.innerHTML = "<p class=\"muted\">No cost data recorded.</p>"; return; }
        const maximum = Math.max(...rows.map((row) => row[1]));
        element.innerHTML = rows.map(([name, cost]) => {
          const width = Math.max(2, (cost / maximum) * 100);
          return "<div class=\"trend-row\"><span>" + name + "</span><div class=\"cost-bar\" style=\"width:" + width + "%\" title=\"" + formatCost(cost) + "\"></div><span>" + formatCost(cost) + "</span></div>";
        }).join("");
      };
      fetch("/api/report")
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("Report unavailable")))
        .then((report) => {
          setFilterOptions(report);
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
          document.querySelector("#status").textContent = "Report loaded from local storage.";
        })
        .catch(() => { document.querySelector("#status").textContent = "Unable to load the local report."; });
    </script>
  </body>
</html>`;
}
