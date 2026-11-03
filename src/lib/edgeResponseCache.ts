import { NextRequest, NextResponse } from "next/server";

function cacheKeyFor(request: NextRequest, namespace: string): Request {
  const url = new URL(request.url);
  url.pathname = `/_edge-cache/${namespace}${url.pathname}`;
  url.hash = "";
  return new Request(url, { method: "GET" });
}

function workerCache(): Cache | null {
  if (typeof caches === "undefined") return null;
  return (caches as unknown as { default: Cache }).default || null;
}

export async function getEdgeCachedResponse(
  request: NextRequest,
  namespace: string
): Promise<NextResponse | null> {
  try {
    const cache = workerCache();
    if (!cache) return null;
    const response = await cache.match(cacheKeyFor(request, namespace));
    if (!response) return null;
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch {
    // The Worker Cache API is unavailable during local Next development.
    return null;
  }
}

export async function storeEdgeCachedResponse(
  request: NextRequest,
  namespace: string,
  response: NextResponse,
  ttlSeconds: number
): Promise<void> {
  try {
    const cache = workerCache();
    if (!cache) return;
    response.headers.set("Cache-Control", `public, max-age=0, s-maxage=${ttlSeconds}`);
    const cacheKey = cacheKeyFor(request, namespace);
    const cacheWrite = cache.put(cacheKey, response.clone());
    const { ctx } = await import("@opennextjs/cloudflare").then((module) =>
      module.getCloudflareContext()
    );
    ctx.waitUntil(cacheWrite);
  } catch {
    // Cache failures should not prevent a response from being served.
  }
}
