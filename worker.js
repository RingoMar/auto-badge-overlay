const STREAM_DATABASE_EVENTS_URL = "https://api.streamdatabase.com/events";
const TWITCH_GQL_URL = "https://gql.twitch.tv/gql";
const DEFAULT_TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const EVENTS_CACHE_TTL_SECONDS = 3600;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function proxiedResponse(response, body, cacheControl) {
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json; charset=utf-8",
      "Cache-Control": cacheControl
    }
  });
}

async function proxyEvents(request, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL("/events", request.url).toString(), {
    method: "GET"
  });
  const cachedResponse = await cache.match(cacheKey);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(STREAM_DATABASE_EVENTS_URL, {
    headers: { "Accept": "application/json" }
  });
  const body = await response.text();
  const result = proxiedResponse(response, body, `public, max-age=${EVENTS_CACHE_TTL_SECONDS}`);

  if (response.ok) {
    ctx.waitUntil(cache.put(cacheKey, result.clone()));
  }

  return result;
}

async function proxyTwitchGql(request, env) {
  const clientId = env.TWITCH_CLIENT_ID || DEFAULT_TWITCH_CLIENT_ID;
  const response = await fetch(TWITCH_GQL_URL, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      "Content-Type": "application/json"
    },
    body: await request.text()
  });

  return proxiedResponse(response, await response.text(), "no-store");
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/events") {
        return proxyEvents(request, ctx);
      }

      if (request.method === "POST" && url.pathname === "/twitch-gql") {
        return proxyTwitchGql(request, env);
      }

      if (url.pathname === "/events" || url.pathname === "/twitch-gql") {
        return jsonResponse({ error: "Method not allowed" }, 405);
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      return jsonResponse({ error: error.message || "Proxy request failed" }, 502);
    }
  }
};
