import { NextRequest, NextResponse } from "next/server";
import { fetchLegalDocument, upsertLegalDocument } from "@/lib/db";
import { isAuthorizedAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const privacyPolicy = await fetchLegalDocument("privacy_policy");
    const termsOfService = await fetchLegalDocument("terms_of_service");

    return NextResponse.json({
      privacy_policy: privacyPolicy,
      terms_of_service: termsOfService,
    });
  } catch (error) {
    console.error("GET /api/admin/legal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(req))) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { doc, content } = body;

    if (doc !== "privacy_policy" && doc !== "terms_of_service") {
      return NextResponse.json({ error: "Invalid doc parameter" }, { status: 400 });
    }

    if (typeof content !== "string") {
      return NextResponse.json({ error: "Content must be a string" }, { status: 400 });
    }

    await upsertLegalDocument(doc, content);
    return NextResponse.json({ success: true, doc });
  } catch (error) {
    console.error("POST /api/admin/legal error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
