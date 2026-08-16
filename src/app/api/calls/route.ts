import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { callLogs, conversationMembers, users, conversations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, desc, inArray } from "drizzle-orm";

export async function GET() {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's conversations
    const memberOf = await db
      .select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers)
      .where(eq(conversationMembers.userId, userId));

    if (memberOf.length === 0) {
      return NextResponse.json({ calls: [] });
    }

    const convIds = memberOf.map((m) => m.conversationId);

    const calls = await db
      .select({
        id: callLogs.id,
        conversationId: callLogs.conversationId,
        callerId: callLogs.callerId,
        callType: callLogs.callType,
        status: callLogs.status,
        startedAt: callLogs.startedAt,
        endedAt: callLogs.endedAt,
        duration: callLogs.duration,
        callerName: users.displayName,
        callerUsername: users.username,
        callerAvatar: users.avatarUrl,
        convName: conversations.name,
        isGroup: conversations.isGroup,
      })
      .from(callLogs)
      .innerJoin(users, eq(callLogs.callerId, users.id))
      .innerJoin(conversations, eq(callLogs.conversationId, conversations.id))
      .where(inArray(callLogs.conversationId, convIds))
      .orderBy(desc(callLogs.startedAt))
      .limit(50);

    // Add other member info for DM calls
    const enrichedCalls = await Promise.all(
      calls.map(async (call) => {
        if (!call.isGroup) {
          const members = await db
            .select({
              id: users.id,
              displayName: users.displayName,
              username: users.username,
              avatarUrl: users.avatarUrl,
            })
            .from(conversationMembers)
            .innerJoin(users, eq(conversationMembers.userId, users.id))
            .where(
              and(
                eq(conversationMembers.conversationId, call.conversationId),
                // get the other person
              )
            );

          const otherMember = members.find((m) => m.id !== userId);
          return {
            ...call,
            displayName: otherMember?.displayName || call.callerName,
          };
        }
        return {
          ...call,
          displayName: call.convName || "Group Call",
        };
      })
    );

    return NextResponse.json({ calls: enrichedCalls });
  } catch (error) {
    console.error("Get calls error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, callType } = await req.json();

    const [call] = await db
      .insert(callLogs)
      .values({
        conversationId,
        callerId: userId,
        callType: callType || "voice",
        status: "completed",
        duration: `${Math.floor(Math.random() * 30) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
        endedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ call });
  } catch (error) {
    console.error("Create call error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
