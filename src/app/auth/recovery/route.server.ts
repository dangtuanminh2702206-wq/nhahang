import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getApplicationOrigin } from "@/lib/supabase/origin";

export async function GET(request: NextRequest) {
  const origin = getApplicationOrigin(request);
  const redirect = (path: string) => NextResponse.redirect(new URL(path, origin), {
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
  if (!getSupabaseConfig()) return redirect("/forgot-password?recovery=failed");
  try {
    const supabase = await createSupabaseServerClient();
    const code = request.nextUrl.searchParams.get("code");
    const tokenHash = request.nextUrl.searchParams.get("token_hash");
    const type = request.nextUrl.searchParams.get("type");
    const result = code ? await supabase.auth.exchangeCodeForSession(code)
      : tokenHash && type === "recovery" ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }) : null;
    if (!result || result.error || !result.data.user?.email_confirmed_at) return redirect("/forgot-password?recovery=failed");
    const { data, error } = await supabase.from("profiles").select("id,is_active").eq("id", result.data.user.id).maybeSingle();
    if (error || !data?.is_active || data.id !== result.data.user.id) {
      await supabase.auth.signOut({ scope: "local" });
      return redirect("/forgot-password?recovery=failed");
    }
    return redirect("/reset-password");
  } catch { return redirect("/forgot-password?recovery=failed"); }
}
