import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase/server";

export async function saveTeacherSession(session: Session) {
  const jar = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  jar.set("teacher_access", session.access_token, {
    ...options,
    maxAge: session.expires_in,
  });
  jar.set("teacher_refresh", session.refresh_token, {
    ...options,
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getTeacher(refresh = false) {
  const jar = await cookies();
  const client = getSupabaseAdmin();
  let token = jar.get("teacher_access")?.value;
  if (!token && refresh && jar.get("teacher_refresh")?.value) {
    const { data, error } = await client.auth.refreshSession({
      refresh_token: jar.get("teacher_refresh")!.value,
    });
    if (error || !data.session) return null;
    await saveTeacherSession(data.session);
    token = data.session.access_token;
  }
  if (!token) return null;
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  if (error || !user) return null;
  const { data, error: profileError } = await getSupabaseAdmin()
    .from("teacher_profiles")
    .select("user_id, username, name")
    .eq("user_id", user.id)
    .eq("enabled", true)
    .maybeSingle();
  if (profileError) throw profileError;
  return data;
}

export async function teacherAccess(request: Request) {
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return NextResponse.json(
        { error: "Хүсэлтийн эх үүсвэрийг шалгана уу." },
        { status: 403 },
      );
    }
  }
  if (!(await getTeacher(true))) {
    return NextResponse.json(
      { error: "Багшийн эрхээр нэвтэрнэ үү." },
      { status: 401 },
    );
  }
  return null;
}
