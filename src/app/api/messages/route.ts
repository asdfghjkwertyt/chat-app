import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  messages,
  conversations,
  conversationMembers,
  users,
} from "@/db/schema";
import { getCurrentUser, sanitizeInput } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

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

    // Verify membership
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const msgs = await db
      .select({
        id: messages.id,
        content: messages.content,
        encryptedContent: messages.encryptedContent,
        iv: messages.iv,
        encryptionVersion: messages.encryptionVersion,
        messageType: messages.messageType,
        isEdited: messages.isEdited,
        isDeleted: messages.isDeleted,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        senderName: users.displayName,
        senderUsername: users.username,
        senderStatus: users.status,
        senderAvatar: users.avatarUrl,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)
      .limit(200);

    return NextResponse.json({ messages: msgs });
  } catch (error) {
    console.error("Get messages error:", error);
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

    const { conversationId, content, encryptedContent, iv, messageType } = await req.json();

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    const allowedMessageTypes = new Set(["text", "photo", "video", "gif", "sticker", "document"]);
    const normalizedMessageType = allowedMessageTypes.has(messageType) ? messageType : "text";

    if (normalizedMessageType === "text") {
      // Need either encrypted or plaintext content for text messages
      if (!encryptedContent && !content?.trim()) {
        return NextResponse.json(
          { error: "Message content is required" },
          { status: 400 }
        );
      }
    } else if (!content?.trim()) {
      return NextResponse.json(
        { error: "Media content is required" },
        { status: 400 }
      );
    }

    // Verify membership
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const isEncrypted = normalizedMessageType === "text" && !!encryptedContent && !!iv;
    const rawContent = String(content || "").trim();

    const [msg] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId: userId,
        content:
          normalizedMessageType === "text"
            ? isEncrypted
              ? "[Encrypted Message]"
              : sanitizeInput(rawContent)
            : rawContent,
        encryptedContent: isEncrypted ? encryptedContent : null,
        iv: isEncrypted ? iv : null,
        encryptionVersion: isEncrypted ? 1 : 0,
        messageType: normalizedMessageType,
      })
      .returning();

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    const [user] = await db
      .select({
        displayName: users.displayName,
        username: users.username,
        status: users.status,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return NextResponse.json({
      message: {
        ...msg,
        senderName: user.displayName,
        senderUsername: user.username,
        senderStatus: user.status,
        senderAvatar: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
