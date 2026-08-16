import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import {
  hashPassword,
  createToken,
  setAuthCookie,
  hashToken,
  validatePasswordStrength,
  validateUsername,
  validateEmail,
} from "@/lib/auth";
import { eq, or } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { username, displayName, email, password, publicKey } =
      await req.json();

    if (!username || !displayName || !email || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate username
    const usernameErr = validateUsername(username);
    if (usernameErr) {
      return NextResponse.json({ error: usernameErr }, { status: 400 });
    }

    // Validate email
    const emailErr = validateEmail(email);
    if (emailErr) {
      return NextResponse.json({ error: emailErr }, { status: 400 });
    }

    // Validate password strength
    const passwordErr = validatePasswordStrength(password);
    if (passwordErr) {
      return NextResponse.json({ error: passwordErr }, { status: 400 });
    }

    // Validate display name
    if (displayName.trim().length < 2 || displayName.trim().length > 50) {
      return NextResponse.json(
        { error: "Display name must be 2-50 characters" },
        { status: 400 }
      );
    }

    // Check uniqueness
    const existing = await db
      .select({ id: users.id, username: users.username, email: users.email })
      .from(users)
      .where(
        or(
          eq(users.username, username.toLowerCase()),
          eq(users.email, email.toLowerCase())
        )
      )
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].username === username.toLowerCase()) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const [user] = await db
      .insert(users)
      .values({
        username: username.toLowerCase(),
        displayName: displayName.trim(),
        email: email.toLowerCase(),
        passwordHash,
        publicKey: publicKey ? JSON.stringify(publicKey) : null,
        status: "online",
        lastSeen: new Date(),
      })
      .returning();

    // Create session
    const [session] = await db
      .insert(sessions)
      .values({
        userId: user.id,
        tokenHash: "pending",
        userAgent: req.headers.get("user-agent") || "unknown",
        ipAddress:
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .returning();

    const token = await createToken(user.id, session.id);
    await db
      .update(sessions)
      .set({ tokenHash: hashToken(token) })
      .where(eq(sessions.id, session.id));

    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        status: user.status,
        publicKey: user.publicKey,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
