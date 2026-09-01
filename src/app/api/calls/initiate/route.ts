import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { callLogs, conversationMembers, contacts, conversations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, callType } = await req.json();

    if (!conversationId || !["audio", "video"].includes(callType)) {
      return NextResponse.json(
        { error: "conversationId and valid callType are required" },
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
        { error: "Not a member of this conversation" },
        { status: 403 }
      );
    }

    // Get conversation details
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // For DM calls, check if users are connected (accepted contact)
    if (!conv.isGroup) {
      const members = await db
        .select({ userId: conversationMembers.userId })
        .from(conversationMembers)
        .where(eq(conversationMembers.conversationId, conversationId));

      const recipientId = members.find((m: { userId: string }) => m.userId !== userId)?.userId;

      if (!recipientId) {
        return NextResponse.json(
          { error: "Invalid conversation" },
          { status: 400 }
        );
      }

      // Check if connection is accepted
      const [connectionStatus] = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, userId),
            eq(contacts.contactId, recipientId)
          )
        )
        .limit(1);

      if (!connectionStatus || connectionStatus.status !== "accepted") {
        return NextResponse.json(
          { error: "You must be connected to call this user" },
          { status: 403 }
        );
      }
    }

    // Create call log (will be marked as active initially)
    const [call] = await db
      .insert(callLogs)
      .values({
        conversationId,
        callerId: userId,
        callType,
        status: "initiated",
        startedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ 
      call: {
        id: call.id,
        conversationId: call.conversationId,
        callType: call.callType,
        callerId: call.callerId,
        status: "initiated"
      }
    }, { status: 201 });
  } catch (error) {
    console.error("Initiate call error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
