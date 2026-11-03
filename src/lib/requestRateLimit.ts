import { NextRequest, NextResponse } from "next/server";

type RateLimitBinding = {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
};

type LimiterName = "PUBLIC_READ_LIMITER" | "MEDIA_READ_LIMITER";

/**
 * Use Cloudflare's location-local rate limiter at the edge. Local Next dev has
 * no Worker bindings, so the guard is intentionally disabled there.
 */
export async function rateLimitRequest(
  request: NextRequest,
  limiterName: LimiterName,
  scope: string,
  authenticatedUserId?: string
): Promise<NextResponse | null> {
  try {
    const { env } = await import("@opennextjs/cloudflare").then((module) =>
      module.getCloudflareContext()
    );
    const limiter = (env as unknown as Record<string, unknown>)[limiterName] as
      | RateLimitBinding
      | undefined;

    if (!limiter || typeof limiter.limit !== "function") {
      if (process.env.NODE_ENV !== "production") return null;
      console.error(`Cloudflare rate limit binding ${limiterName} is unavailable.`);
      return NextResponse.json(
        { error: "Request protection is temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Cloudflare sets this header at the edge; do not trust arbitrary forwarded
    // IP headers as a substitute in production.
    const clientIp = authenticatedUserId ? "" : request.headers.get("cf-connecting-ip");
    if (!authenticatedUserId && !clientIp) {
      return NextResponse.json(
        { error: "Request protection is temporarily unavailable." },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    const identity = authenticatedUserId ? `user:${authenticatedUserId}` : `ip:${clientIp}`;
    const { success } = await limiter.limit({ key: `${scope}:${identity}` });
    if (success) return null;

    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") return null;
    console.error("Cloudflare request rate limiting failed:", error);
    return NextResponse.json(
      { error: "Request protection is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
