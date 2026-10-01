import "server-only";
import type { NextRequest } from "next/server";

export function getApplicationOrigin(request: NextRequest) {
  // Next.js Proxy may normalize loopback URLs to localhost. Prefer the configured
  // public origin, then the actual Host header rather than that internal URL.
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  return new URL(configured || `${request.nextUrl.protocol}//${request.headers.get("host") || request.nextUrl.host}`).origin;
}
