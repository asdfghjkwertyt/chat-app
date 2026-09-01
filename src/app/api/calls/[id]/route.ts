import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { callLogs, conversationMembers, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: callId } = await params;
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await req.json();

    if (!action || !["accept", "reject", "end"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'accept', 'reject', or 'end'" },
        { status: 400 }
      );
    }

    // Get the call
    const [call] = await db
      .select()
      .from(callLogs)
      .where(eq(callLogs.id, callId))
      .limit(1);

    if (!call) {
      return NextResponse.json(
        { error: "Call not found" },
        { status: 404 }
      );
    }

    // Verify user is part of the conversation
    const [membership] = await db
      .select()
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, call.conversationId),
          eq(conversationMembers.userId, userId)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    let newStatus = call.status;
    let endedAt = call.endedAt;
    let duration = call.duration;

    if (action === "accept" && call.status === "initiated") {
      newStatus = "active";
    } else if (action === "reject" && call.status === "initiated") {
      newStatus = "rejected";
      endedAt = new Date();
    } else if (action === "end" && (call.status === "active" || call.status === "initiated")) {
      newStatus = call.status === "initiated" ? "missed" : "completed";
      endedAt = new Date();
      
      // Calculate duration if call was active
      if (call.startedAt && endedAt) {
        const durationMs = new Date(endedAt).getTime() - new Date(call.startedAt).getTime();
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        duration = `${minutes}:${String(seconds).padStart(2, "0")}`;
      }
    } else {
      return NextResponse.json(
        { error: `Cannot ${action} a call with status ${call.status}` },
        { status: 400 }
      );
    }

    // Update call status
    const [updated] = await db
      .update(callLogs)
      .set({
        status: newStatus,
        endedAt,
        duration,
      })
      .where(eq(callLogs.id, callId))
      .returning();

    return NextResponse.json({
      success: true,
      call: {
        id: updated.id,
        status: updated.status,
        startedAt: updated.startedAt,
        endedAt: updated.endedAt,
        duration: updated.duration,
      },
    });
  } catch (error) {
    console.error("Update call error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
