import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, like, ne, notInArray } from "drizzle-orm";

export async function GET() {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contactList = await db
      .select({
        id: contacts.id,
        contactId: contacts.contactId,
        nickname: contacts.nickname,
        status: contacts.status,
        displayName: users.displayName,
        username: users.username,
        userStatus: users.status,
        statusMessage: users.statusMessage,
        avatarUrl: users.avatarUrl,
        email: users.email,
      })
      .from(contacts)
      .innerJoin(users, eq(contacts.contactId, users.id))
      .where(eq(contacts.userId, userId))
      .orderBy(users.displayName);

    return NextResponse.json({ contacts: contactList });
  } catch (error) {
    console.error("Get contacts error:", error);
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

    const { username } = await req.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    // Find user by username
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.id === userId) {
      return NextResponse.json(
        { error: "Cannot add yourself" },
        { status: 400 }
      );
    }

    // Check if already contacts
    const [existing] = await db
      .select()
      .from(contacts)
      .where(
        and(eq(contacts.userId, userId), eq(contacts.contactId, targetUser.id))
      )
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Already in your contacts" },
        { status: 409 }
      );
    }

    // Add contact both ways
    await db.insert(contacts).values([
      { userId, contactId: targetUser.id },
      { userId: targetUser.id, contactId: userId },
    ]);

    return NextResponse.json({
      contact: {
        contactId: targetUser.id,
        displayName: targetUser.displayName,
        username: targetUser.username,
        userStatus: targetUser.status,
      },
    });
  } catch (error) {
    console.error("Add contact error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
