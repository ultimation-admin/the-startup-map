export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteProfileArticle, updateProfileArticle } from "@/lib/db";
import { cleanArticleInput } from "@/lib/articleValidation";

type RouteContext = { params: Promise<{ slug: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to edit this article." }, { status: 401 });

  try {
    const { slug } = await context.params;
    const input = cleanArticleInput(await req.json());
    if (!input) return NextResponse.json({ error: "Add a title and at least one text, image, or link block." }, { status: 400 });
    const article = await updateProfileArticle({ slug, ownerId: userId, ...input });
    if (!article) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    return NextResponse.json({ article });
  } catch (error) {
    console.error("PATCH /api/articles/[slug] error:", error);
    return NextResponse.json({ error: "The article could not be saved." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to delete this article." }, { status: 401 });

  const { slug } = await context.params;
  const deleted = await deleteProfileArticle(slug, userId);
  if (!deleted) return NextResponse.json({ error: "Article not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
