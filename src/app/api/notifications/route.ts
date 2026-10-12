import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { fetchUserNotifications, markUserNotificationsRead } from "@/lib/db";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const notifications = await fetchUserNotifications(user.id);
    return NextResponse.json({ notifications, unread_count: notifications.filter((item) => !item.is_read).length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Unable to load activity" }, { status: 500 });
  }
}

export async function PATCH() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await markUserNotificationsRead(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json({ error: "Unable to update activity" }, { status: 500 });
  }
}
