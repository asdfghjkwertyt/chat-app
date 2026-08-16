import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { getCurrentUser, clearAuthCookie, verifyToken, hashToken } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const userId = await getCurrentUser();

    if (userId) {
      await db
        .update(users)
        .set({ status: "offline", lastSeen: new Date(), updatedAt: new Date() })
        .where(eq(users.id, userId));

      // Invalidate session
      const cookieStore = await cookies();
      const token = cookieStore.get("auth_token")?.value;
      if (token) {
        await db
          .delete(sessions)
          .where(eq(sessions.tokenHash, hashToken(token)));
      }
    }

    await clearAuthCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    await clearAuthCookie();
    return NextResponse.json({ success: true });
  }
}
