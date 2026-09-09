import { NextRequest } from "next/server";
import { auth, currentUser, createClerkClient } from "@clerk/nextjs/server";
import { isAdminUser, fetchUserProfile } from "./db";

export const STRICT_ADMIN_EMAIL = "ultimation.teams@gmail.com";

export async function isAuthorizedAdmin(req: NextRequest): Promise<boolean> {
  try {
    const authObj = await auth();
    const userId = authObj?.userId;

    if (userId) {
      const emailCandidates: string[] = [];

      // 1. JWT Claims from auth()
      const claims = authObj.sessionClaims as any;
      if (claims) {
        if (claims.email) emailCandidates.push(String(claims.email));
        if (claims.primary_email) emailCandidates.push(String(claims.primary_email));
        if (claims.email_address) emailCandidates.push(String(claims.email_address));
        if (claims.user_email) emailCandidates.push(String(claims.user_email));
      }

      // 2. currentUser() from Clerk SDK
      try {
        const user = await currentUser();
        if (user) {
          if (user.primaryEmailAddress?.emailAddress) {
            emailCandidates.push(user.primaryEmailAddress.emailAddress);
          }
          (user.emailAddresses || []).forEach((e) => {
            if (e?.emailAddress) emailCandidates.push(e.emailAddress);
          });
        }
      } catch (err) {
        console.warn("isAuthorizedAdmin currentUser warning:", err);
      }

      // 3. Direct clerkClient REST API lookup
      if (emailCandidates.length === 0 && process.env.CLERK_SECRET_KEY) {
        try {
          const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
          const user = await clerk.users.getUser(userId);
          if (user) {
            (user.emailAddresses || []).forEach((e) => {
              if (e?.emailAddress) emailCandidates.push(e.emailAddress);
            });
          }
        } catch (err) {
          console.warn("isAuthorizedAdmin clerkClient warning:", err);
        }
      }

      // 4. D1 User Profile lookup
      try {
        const profile = await fetchUserProfile(userId);
        if (profile?.email) {
          emailCandidates.push(profile.email);
        }
      } catch (err) {
        console.warn("isAuthorizedAdmin fetchUserProfile warning:", err);
      }

      // Normalize all emails collected
      const normalizedEmails = emailCandidates
        .map((e) => e.toLowerCase().trim())
        .filter(Boolean);

      const envAdminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();

      // Strictly check if ultimation.teams@gmail.com (or env ADMIN_EMAIL) is matched
      const isAuthorized = normalizedEmails.some(
        (email) => email === STRICT_ADMIN_EMAIL || (envAdminEmail && email === envAdminEmail)
      );

      if (isAuthorized) {
        return true;
      }

      // Fallback check against DB profile role
      if (await isAdminUser(userId)) {
        return true;
      }
    }
  } catch (err) {
    console.error("Error in isAuthorizedAdmin:", err);
  }

  // Emergency header fallback if passkey is set in environment
  const passkeyHeader = (req.headers.get("x-admin-passkey") || "").trim().toUpperCase();
  const configuredPasskey = (process.env.ADMIN_PASSKEY || "").trim().toUpperCase();
  if (passkeyHeader && configuredPasskey && passkeyHeader === configuredPasskey) {
    return true;
  }

  return false;
}
