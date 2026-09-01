import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params;
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await req.json();

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'accept' or 'reject'" },
        { status: 400 }
      );
    }

    // Get the request
    const [request] = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.id, requestId),
          eq(contacts.contactId, userId)
        )
      )
      .limit(1);

    if (!request) {
      return NextResponse.json(
        { error: "Request not found or unauthorized" },
        { status: 404 }
      );
    }

    if (request.status !== "pending") {
      return NextResponse.json(
        { error: "Request is not pending" },
        { status: 400 }
      );
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";

    // Update the request
    const [updated] = await db
      .update(contacts)
      .set({ status: newStatus })
      .where(eq(contacts.id, requestId))
      .returning();

    // If accepted, also create reverse contact entry if it doesn't exist
    if (action === "accept") {
      const [reverseContact] = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, request.contactId),
            eq(contacts.contactId, request.userId)
          )
        )
        .limit(1);

      if (!reverseContact) {
        await db
          .insert(contacts)
          .values({
            userId: request.contactId,
            contactId: request.userId,
            status: "accepted",
          });
      } else if (reverseContact.status !== "accepted") {
        await db
          .update(contacts)
          .set({ status: "accepted" })
          .where(eq(contacts.id, reverseContact.id));
      }
    }

    return NextResponse.json({ 
      success: true,
      request: updated,
      message: action === "accept" ? "Request accepted" : "Request rejected"
    });
  } catch (error) {
    console.error("Update request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
