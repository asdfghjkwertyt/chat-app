import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  conversations,
  conversationMembers,
  messages,
  users,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify membership
    const [membership] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, id),
          eq(conversationMembers.userId, userId)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    const members = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        username: users.username,
        status: users.status,
        avatarUrl: users.avatarUrl,
        statusMessage: users.statusMessage,
        role: conversationMembers.role,
      })
      .from(conversationMembers)
      .innerJoin(users, eq(conversationMembers.userId, users.id))
      .where(eq(conversationMembers.conversationId, id));

    return NextResponse.json({ conversation: { ...conv, members } });
  } catch (error) {
    console.error("Get conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { action } = await req.json().catch(() => ({}));

    const [membership] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, id),
          eq(conversationMembers.userId, userId)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const isGroupConversation: boolean = await db
      .select({ isGroup: conversations.isGroup })
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1)
      .then((rows: { isGroup: boolean }[]) => rows[0]?.isGroup ?? false);

    const normalizedAction = action === "delete-group" ? "delete-group" : action === "leave-group" ? "leave-group" : "delete-for-me";

    if (normalizedAction === "delete-group" && isGroupConversation) {
      const [adminMembership] = await db
        .select()
        .from(conversationMembers)
        .where(
          and(
            eq(conversationMembers.conversationId, id),
            eq(conversationMembers.userId, userId),
          )
        )
        .limit(1);

      if (adminMembership?.role !== "admin") {
        await db
          .delete(conversationMembers)
          .where(
            and(
              eq(conversationMembers.conversationId, id),
              eq(conversationMembers.userId, userId)
            )
          );

        return NextResponse.json({ success: true, action: "left-group" });
      }

      await db.delete(conversations).where(eq(conversations.id, id));
      return NextResponse.json({ success: true, action: "deleted-group" });
    }

    await db
      .delete(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, id),
          eq(conversationMembers.userId, userId)
        )
      );

    return NextResponse.json({
      success: true,
      action: isGroupConversation ? "left-group" : "deleted-for-me",
    });
  } catch (error) {
    console.error("Delete conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
