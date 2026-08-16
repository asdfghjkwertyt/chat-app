import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  conversations,
  conversationMembers,
  messages,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, desc, and, ne, inArray, sql } from "drizzle-orm";

export async function GET() {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get conversations where user is a member
    const memberOf: { conversationId: string }[] = await db
      .select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers)
      .where(eq(conversationMembers.userId, userId));

    if (memberOf.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const convIds = memberOf.map((m: { conversationId: string }) => m.conversationId);

    const convs = await db
      .select()
      .from(conversations)
      .where(inArray(conversations.id, convIds))
      .orderBy(desc(conversations.updatedAt));

    // Get last message and other members for each conversation
    const result = await Promise.all(
      convs.map(async (conv: { id: string; isGroup: boolean; name: string | null; createdAt: Date; updatedAt: Date }) => {
        const [lastMsg] = await db
          .select({
            content: messages.content,
            createdAt: messages.createdAt,
            senderId: messages.senderId,
            senderName: users.displayName,
          })
          .from(messages)
          .innerJoin(users, eq(messages.senderId, users.id))
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        const members = await db
          .select({
            id: users.id,
            displayName: users.displayName,
            username: users.username,
            status: users.status,
            avatarUrl: users.avatarUrl,
          })
          .from(conversationMembers)
          .innerJoin(users, eq(conversationMembers.userId, users.id))
          .where(eq(conversationMembers.conversationId, conv.id));

        const otherMembers = members.filter(
          (m: { id: string }) => m.id !== userId
        );

        const unreadCount = 0; // Simplified for now

        return {
          ...conv,
          lastMessage: lastMsg || null,
          members,
          otherMembers,
          unreadCount,
          displayName: conv.isGroup
            ? conv.name
            : otherMembers[0]?.displayName || "Unknown",
          displayStatus: conv.isGroup
            ? `${members.length} members`
            : otherMembers[0]?.status || "offline",
        };
      })
    );

    // Sort by last message time
    result.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt?.getTime() || a.createdAt.getTime();
      const bTime = b.lastMessage?.createdAt?.getTime() || b.createdAt.getTime();
      return bTime - aTime;
    });

    return NextResponse.json({ conversations: result });
  } catch (error) {
    console.error("Get conversations error:", error);
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

    const { memberIds, name, isGroup } = await req.json();

    if (!memberIds || memberIds.length === 0) {
      return NextResponse.json(
        { error: "At least one member is required" },
        { status: 400 }
      );
    }

    // For DM, check if conversation already exists
    if (!isGroup && memberIds.length === 1) {
      const targetId = memberIds[0];

      // Find existing DM conversation
      const myConvs = await db
        .select({ conversationId: conversationMembers.conversationId })
        .from(conversationMembers)
        .where(eq(conversationMembers.userId, userId));

      for (const mc of myConvs) {
        const conv = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.id, mc.conversationId),
              eq(conversations.isGroup, false)
            )
          )
          .limit(1);

        if (conv.length > 0) {
          const otherMember = await db
            .select()
            .from(conversationMembers)
            .where(
              and(
                eq(conversationMembers.conversationId, mc.conversationId),
                eq(conversationMembers.userId, targetId)
              )
            )
            .limit(1);

          if (otherMember.length > 0) {
            return NextResponse.json({ conversation: { id: conv[0].id } });
          }
        }
      }
    }

    const [conv] = await db
      .insert(conversations)
      .values({
        name: isGroup ? name : null,
        isGroup: !!isGroup,
      })
      .returning();

    // Add current user as member
    const allMembers = [userId, ...memberIds];
    await db.insert(conversationMembers).values(
      allMembers.map((id: string) => ({
        conversationId: conv.id,
        userId: id,
        role: id === userId && isGroup ? "admin" : "member",
      }))
    );

    return NextResponse.json({ conversation: conv });
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
