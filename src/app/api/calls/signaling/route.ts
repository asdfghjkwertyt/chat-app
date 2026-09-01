import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { callLogs } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

// In-memory store for SDP messages (in production, use database)
const sdpStore: Record<string, { offer?: string; answer?: string; candidates: string[] }> = {};

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { callId, type, data } = await req.json();

    if (!callId || !type) {
      return NextResponse.json(
        { error: "callId and type are required" },
        { status: 400 }
      );
    }

    if (!sdpStore[callId]) {
      sdpStore[callId] = { candidates: [] };
    }

    if (type === "offer" || type === "answer") {
      sdpStore[callId][type as "offer" | "answer"] = data;
    } else if (type === "candidate") {
      sdpStore[callId].candidates.push(data);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signaling error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUser();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callId = req.nextUrl.searchParams.get("callId");
    if (!callId) {
      return NextResponse.json(
        { error: "callId is required" },
        { status: 400 }
      );
    }

    const data = sdpStore[callId] || { candidates: [] };

    return NextResponse.json({
      offer: data.offer || null,
      answer: data.answer || null,
      candidates: data.candidates || [],
    });
  } catch (error) {
    console.error("Get signaling error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
