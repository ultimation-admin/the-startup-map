import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/s/(.*)",
  "/p/(.*)",
  "/tony-stark-2501(.*)",
  "/api/communities(.*)",
  "/api/listings(.*)",
  "/api/posts(.*)",
  "/api/spotlights(.*)",
  "/api/media(.*)",
  "/api/profile/sync(.*)",
  "/api/geocode(.*)",
]);

export default function middleware(request: any, event: any) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!publishableKey || !secretKey) {
    return NextResponse.next();
  }

  const handler = clerkMiddleware(
    async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    },
    { publishableKey, secretKey }
  );

  return handler(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
