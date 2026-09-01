import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pending requests for the current user
    const pendingRequests = await db
      .select({
        id: contacts.id,
        senderId: contacts.userId,
        senderName: users.displayName,
        senderUsername: users.username,
        senderAvatar: users.avatarUrl,
        status: contacts.status,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .innerJoin(users, eq(contacts.userId, users.id))
      .where(
        and(
          eq(contacts.contactId, userId),
          eq(contacts.status, "pending")
        )
      );

    return NextResponse.json({ requests: pendingRequests });
  } catch (error) {
    console.error("Get requests error:", error);
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

    const { recipientId } = await req.json();

    if (!recipientId) {
      return NextResponse.json(
        { error: "recipientId is required" },
        { status: 400 }
      );
    }

    if (userId === recipientId) {
      return NextResponse.json(
        { error: "Cannot send request to yourself" },
        { status: 400 }
      );
    }

    // Check if recipient exists
    const [recipient] = await db
      .select()
      .from(users)
      .where(eq(users.id, recipientId))
      .limit(1);

    if (!recipient) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if connection already exists
    const [existingContact] = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.userId, userId),
          eq(contacts.contactId, recipientId)
        )
      )
      .limit(1);

    if (existingContact) {
      if (existingContact.status === "accepted") {
        return NextResponse.json(
          { error: "Already connected with this user" },
          { status: 400 }
        );
      }
      if (existingContact.status === "pending") {
        return NextResponse.json(
          { error: "Request already sent" },
          { status: 400 }
        );
      }
    }

    // Create new contact request
    const [newContact] = await db
      .insert(contacts)
      .values({
        userId,
        contactId: recipientId,
        status: "pending",
      })
      .returning();

    return NextResponse.json({ 
      success: true,
      request: newContact 
    }, { status: 201 });
  } catch (error) {
    console.error("Send request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
