import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export type AppRole = "customer" | "staff" | "admin";
export type TrustedProfile = { id: string; full_name: string; phone: string | null; role: AppRole; is_active: boolean };
export class IdentityError extends Error {
  constructor(public readonly status: 401 | 403 | 503) { super("IDENTITY_ACCESS_DENIED"); }
}

export const getCurrentUser = cache(async () => {
  if (!getSupabaseConfig()) return null;
  const supabase = await createSupabaseServerClient();
  try {
    const { data, error } = await supabase.auth.getUser();
    return !error && data.user?.email_confirmed_at ? data.user : null;
  } catch { throw new IdentityError(503); }
});

export const getCurrentProfile = cache(async (): Promise<TrustedProfile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("profiles").select("id,full_name,phone,role,is_active").eq("id", user.id).maybeSingle();
  if (error) throw new IdentityError(503);
  // An inactive profile is invisible under the existing RLS; missing is denied, not elevated.
  if (!data || data.id !== user.id || !["customer", "staff", "admin"].includes(data.role) || typeof data.is_active !== "boolean") return null;
  return data as TrustedProfile;
});

export async function requireAuthenticatedUser() {
  if (!getSupabaseConfig()) throw new IdentityError(503);
  const user = await getCurrentUser();
  if (!user) throw new IdentityError(401);
  return user;
}
export async function requireActiveUser() {
  const user = await requireAuthenticatedUser();
  const profile = await getCurrentProfile();
  if (!profile?.is_active) throw new IdentityError(403);
  return { user, profile };
}
export async function requireRole(allowed: readonly AppRole[]) {
  const identity = await requireActiveUser();
  if (!allowed.includes(identity.profile.role)) throw new IdentityError(403);
  return identity;
}
