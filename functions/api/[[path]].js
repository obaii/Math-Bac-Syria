/**
 * Same-origin API proxy for the Math-Bac-Syria Cloudflare Worker.
 * Browser requests are accepted only from this Pages deployment's own origin.
 */
const WORKER_ORIGIN = "https://math-bac-syria-assistant.obaii-helow-373.workers.dev";

export async function onRequest({ request }) {
  const incomingUrl = new URL(request.url);
  const ownOrigin = incomingUrl.origin;
  const suppliedOrigin = request.headers.get("Origin");

  // Reject cross-origin browser requests. Safe GET/HEAD requests may omit Origin.
  if (suppliedOrigin && suppliedOrigin !== ownOrigin) {
    return new Response(JSON.stringify({ error: "origin_not_allowed" }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  }
  if (!suppliedOrigin && !["GET", "HEAD"].includes(request.method)) {
    return new Response(JSON.stringify({ error: "origin_required" }), {
      status: 403,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  }

  const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, WORKER_ORIGIN);
  const headers = new Headers(request.headers);
  headers.set("Origin", ownOrigin);
  headers.delete("host");

  const upstreamRequest = new Request(upstreamUrl, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual"
  });
  const upstream = await fetch(upstreamRequest);
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("cache-control", "no-store");
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  });
}
