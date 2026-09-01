import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { callLogs, conversationMembers, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversationId = req.nextUrl.searchParams.get("conversationId");
    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    // Verify user is member of conversation
    const [membership] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Get active/initiated calls in this conversation
    const activeCalls = await db
      .select({
        id: callLogs.id,
        callType: callLogs.callType,
        callerId: callLogs.callerId,
        status: callLogs.status,
        startedAt: callLogs.startedAt,
        callerName: users.displayName,
        callerAvatar: users.avatarUrl,
      })
      .from(callLogs)
      .innerJoin(users, eq(callLogs.callerId, users.id))
      .where(
        and(
          eq(callLogs.conversationId, conversationId),
          inArray(callLogs.status, ["initiated", "active"])
        )
      )
      .orderBy(callLogs.startedAt);

    return NextResponse.json({ calls: activeCalls });
  } catch (error) {
    console.error("Get active calls error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
