import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/explore(.*)",
  "/search(.*)",
  "/map(.*)",
  "/activity(.*)",
  "/profile(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/p/(.*)",
  "/s/(.*)",
  "/articles(.*)",
  "/terms-of-service(.*)",
  "/privacy-policy(.*)",
  "/api/branding",
  "/api/legal",
  "/api/communities",
  "/api/listings(.*)",
  "/api/posts(.*)",
  "/api/spotlights",
  "/api/media(.*)",
  "/api/articles(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const isApiRoute = req.nextUrl.pathname.startsWith("/api");

  // All non-GET API routes strictly require authentication
  if (isApiRoute && req.method !== "GET") {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return;
  }

  // Protect non-public routes (including /tony-stark-2501 and /api/admin/*)
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
