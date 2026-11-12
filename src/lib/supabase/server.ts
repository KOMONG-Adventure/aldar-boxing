import "server-only";
import { createClient } from "@supabase/supabase-js";

export class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigurationError";
  }
}

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    const missing = [];
    if (!url) missing.push("SUPABASE_URL");
    if (!key) missing.push("SUPABASE_SECRET_KEY эсвэл SUPABASE_SERVICE_ROLE_KEY");
    throw new SupabaseConfigurationError(
      `Vercel Environment Variables-д ${missing.join(", ")} тохируулж Redeploy хийнэ үү.`,
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export const STUDENT_PHOTOS_BUCKET = "student-photos";
