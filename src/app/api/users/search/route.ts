import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { ilike, ne, or, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = req.nextUrl.searchParams.get("q") || "";

    if (q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const results = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        status: users.status,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(
        and(
          ne(users.id, userId),
          or(
            ilike(users.username, `%${q}%`),
            ilike(users.displayName, `%${q}%`)
          )
        )
      )
      .limit(10);

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error("Search users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
