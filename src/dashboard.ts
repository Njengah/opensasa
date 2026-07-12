import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { calculateLocalReport, formatLocalReportJson } from "./report.js";
import { openStore } from "./storage.js";

export type DashboardServerOptions = {
  dbPath?: string;
  host?: string;
  port?: number;
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
      sendJson(response, 200, JSON.parse(formatLocalReportJson(calculateLocalReport(store.listSessions()))));
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : "Unable to read local report." });
    } finally {
      store?.close();
    }
    return;
  }

  sendJson(response, 404, { error: "Not found." });
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
      <section class="cards" aria-label="Report overview">
        <article class="card">Sessions<strong id="total-sessions">Loading…</strong></article>
        <article class="card">Useful outcome rate<strong id="useful-rate">Loading…</strong></article>
        <article class="card">Estimated cost<strong id="estimated-cost">Loading…</strong></article>
        <article class="card">Confidence<strong id="confidence">Loading…</strong></article>
      </section>
      <p id="status" class="muted">Loading your local report…</p>
      <p><a href="/api/report">View local report JSON</a></p>
    </main>
    <script>
      const formatRate = (metric) => metric.rate === null ? "unknown" : (metric.rate * 100).toFixed(1) + "%";
      const formatCost = (value) => value === null ? "unknown" : "$" + value.toFixed(4);
      fetch("/api/report")
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("Report unavailable")))
        .then((report) => {
          document.querySelector("#total-sessions").textContent = report.totalSessions;
          document.querySelector("#useful-rate").textContent = formatRate(report.usefulOutcomeRate);
          document.querySelector("#estimated-cost").textContent = formatCost(report.estimatedTotalCostUsd);
          document.querySelector("#confidence").textContent = report.confidenceSummary.level;
          document.querySelector("#status").textContent = "Report loaded from local storage.";
        })
        .catch(() => { document.querySelector("#status").textContent = "Unable to load the local report."; });
    </script>
  </body>
</html>`;
}
