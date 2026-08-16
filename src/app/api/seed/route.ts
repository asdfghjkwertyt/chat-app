import { NextResponse } from "next/server";
import { seed } from "@/db/seed";

export async function POST() {
  try {
    await seed();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed" },
      { status: 500 }
    );
  }
}
