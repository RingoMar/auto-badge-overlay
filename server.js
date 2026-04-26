const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 5301);
const ROOT_DIR = __dirname;
const STREAM_DATABASE_EVENTS_URL = "https://api.streamdatabase.com/events";
const TWITCH_GQL_URL = "https://gql.twitch.tv/gql";
const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const ROBOTS_HEADER_VALUE = "noindex, nofollow, noarchive, nosnippet, noimageindex";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function send(res, status, body, headers = {}) {
  headers["X-Robots-Tag"] = ROBOTS_HEADER_VALUE;
  res.writeHead(status, headers);
  res.end(body);
}

function sendJson(res, status, payload) {
  send(res, status, JSON.stringify(payload), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function proxyEvents(res) {
  const response = await fetch(STREAM_DATABASE_EVENTS_URL, {
    headers: { "Accept": "application/json" }
  });

  const body = await response.text();
  send(res, response.status, body, {
    "Content-Type": response.headers.get("content-type") || "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=3600"
  });
}

async function proxyTwitchGql(req, res) {
  const requestBody = await readRequestBody(req);
  const response = await fetch(TWITCH_GQL_URL, {
    method: "POST",
    headers: {
      "Client-ID": TWITCH_CLIENT_ID,
      "Content-Type": "application/json"
    },
    body: requestBody
  });

  const body = await response.text();
  send(res, response.status, body, {
    "Content-Type": response.headers.get("content-type") || "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
}

function serveStatic(req, res, pathname) {
  const cleanPathname = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(ROOT_DIR, `.${decodeURIComponent(cleanPathname)}`);

  if (!filePath.startsWith(ROOT_DIR)) {
    send(res, 403, "Forbidden", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      send(res, 404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }

    send(res, 200, data, {
      "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/events") {
      await proxyEvents(res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/twitch-gql") {
      await proxyTwitchGql(req, res);
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      serveStatic(req, res, url.pathname);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    sendJson(res, 502, { error: error.message || "Proxy request failed" });
  }
});

server.listen(PORT, () => {
  console.log(`Overlay server running at http://localhost:${PORT}/`);
});
