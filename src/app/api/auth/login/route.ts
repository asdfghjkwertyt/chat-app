import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import {
  verifyPassword,
  createToken,
  setAuthCookie,
  hashToken,
  isAccountLocked,
  getLockoutExpiry,
  MAX_LOGIN_ATTEMPTS,
} from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check account lockout
    if (isAccountLocked(user.lockedUntil)) {
      const mins = Math.ceil(
        (user.lockedUntil!.getTime() - Date.now()) / 60000
      );
      return NextResponse.json(
        {
          error: `Account locked. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`,
        },
        { status: 423 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const update: Record<string, unknown> = { failedLoginAttempts: attempts };
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        update.lockedUntil = getLockoutExpiry();
      }
      await db.update(users).set(update).where(eq(users.id, user.id));

      return NextResponse.json(
        {
          error:
            attempts >= MAX_LOGIN_ATTEMPTS
              ? "Too many failed attempts. Account locked for 15 minutes."
              : `Invalid credentials. ${MAX_LOGIN_ATTEMPTS - attempts} attempt${MAX_LOGIN_ATTEMPTS - attempts !== 1 ? "s" : ""} remaining.`,
        },
        { status: 401 }
      );
    }

    // Reset failed attempts, update status
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        status: "online",
        lastSeen: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

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
        status: "online",
        publicKey: user.publicKey,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
