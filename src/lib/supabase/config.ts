export function getSupabaseConfig() {
  if (process.env.NEXT_PUBLIC_STATIC_DEMO === "true") return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || key.startsWith("sb_secret_")) return null;
  // Reject legacy service-role JWTs as well as modern secret keys.
  if (key.split(".").length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()) as { role?: string };
      if (payload.role !== "anon") return null;
    } catch { return null; }
  }
  try { if (new URL(url).protocol !== "https:" && !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(url)) return null; }
  catch { return null; }
  return { url, key };
}
