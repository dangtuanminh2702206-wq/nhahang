import { NextResponse } from "next/server";

// Liveness only: deliberately does not claim database, Auth or scheduler readiness.
export async function GET() {
  return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
