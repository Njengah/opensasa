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
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>OpenSasa Dashboard</title></head>
  <body>
    <main>
      <h1>OpenSasa Dashboard</h1>
      <p>Local report dashboard foundation.</p>
      <p>This dashboard reads only your local OpenSasa database. No data is uploaded.</p>
      <p><a href="/api/report">View local report JSON</a></p>
    </main>
  </body>
</html>`;
}
