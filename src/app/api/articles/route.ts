export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createProfileArticle,
  fetchListingById,
  fetchProfileArticles,
} from "@/lib/db";
import { cleanArticleInput } from "@/lib/articleValidation";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const profileId = new URL(req.url).searchParams.get("profile_id");
  if (!profileId) return NextResponse.json({ error: "A profile is required." }, { status: 400 });
  const profile = await fetchListingById(profileId);
  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const canManage = Boolean(userId && userId === profile.owner_id);
  return NextResponse.json({
    articles: await fetchProfileArticles(profileId, canManage ? userId! : undefined),
    can_manage: canManage,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to publish an article." }, { status: 401 });

  try {
    const body = await req.json() as { profile_id?: unknown };
    const profileId = typeof body.profile_id === "string" ? body.profile_id : "";
    const input = cleanArticleInput(body);
    if (!profileId || !input) return NextResponse.json({ error: "Add a title and at least one text, image, or link block." }, { status: 400 });

    const profile = await fetchListingById(profileId);
    if (!profile || profile.owner_id !== userId) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    const article = await createProfileArticle({ profile, ...input });
    if (!article) return NextResponse.json({ error: "The article could not be saved." }, { status: 500 });
    return NextResponse.json({ article }, { status: 201 });
  } catch (error) {
    console.error("POST /api/articles error:", error);
    return NextResponse.json({ error: "The article could not be published." }, { status: 500 });
  }
}
