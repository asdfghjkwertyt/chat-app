import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { getCurrentUser, sanitizeInput } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { content, encryptedContent, iv } = await req.json();

    const isEncrypted = !!encryptedContent && !!iv;
    if (!isEncrypted && !content?.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      isEdited: true,
      updatedAt: new Date(),
    };

    if (isEncrypted) {
      updateData.content = "[Encrypted Message]";
      updateData.encryptedContent = encryptedContent;
      updateData.iv = iv;
      updateData.encryptionVersion = 1;
    } else {
      updateData.content = sanitizeInput(content.trim());
      updateData.encryptedContent = null;
      updateData.iv = null;
      updateData.encryptionVersion = 0;
    }

    const [msg] = await db
      .update(messages)
      .set(updateData)
      .where(and(eq(messages.id, id), eq(messages.senderId, userId)))
      .returning();

    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json({ message: msg });
  } catch (error) {
    console.error("Edit message error:", error);
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

    const [msg] = await db
      .update(messages)
      .set({
        isDeleted: true,
        content: "[Deleted]",
        encryptedContent: null,
        iv: null,
        updatedAt: new Date(),
      })
      .where(and(eq(messages.id, id), eq(messages.senderId, userId)))
      .returning();

    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json({ message: msg });
  } catch (error) {
    console.error("Delete message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
