import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getApplicationOrigin } from "@/lib/supabase/origin";

export async function GET(request: NextRequest) {
  const origin = getApplicationOrigin(request);
  const failure = () => NextResponse.redirect(new URL("/login?confirmation=failed", origin), { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  if (!getSupabaseConfig()) return failure();
  try {
    const supabase = await createSupabaseServerClient();
    const code = request.nextUrl.searchParams.get("code");
    const tokenHash = request.nextUrl.searchParams.get("token_hash");
    const type = request.nextUrl.searchParams.get("type");
    // Default PKCE email redirect; token_hash supports an operator-configured SSR email template.
    const result = code ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && (type === "signup" || type === "email") ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type }) : null;
    if (!result || result.error || !result.data.user?.email_confirmed_at) return failure();
    const { data, error } = await supabase.from("profiles").select("id,is_active").eq("id", result.data.user.id).maybeSingle();
    if (error || !data?.is_active) {
      await supabase.auth.signOut({ scope: "local" });
      return failure();
    }
    // Never trust a return URL supplied by the browser.
    return NextResponse.redirect(new URL("/profile", origin), { headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" } });
  } catch { return failure(); }
}
