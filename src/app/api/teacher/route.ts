import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  getTeacher,
  saveTeacherSession,
  teacherAccess,
} from "@/lib/teacher-auth";

export async function GET() {
  return NextResponse.json(
    { teacher: await getTeacher(true) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json(
      { error: "Хүсэлт зөвшөөрөгдөөгүй." },
      { status: 403 },
    );
  try {
    const body = await request.json();
    const client = getSupabaseAdmin();
    if (body.action === "logout") {
      await getTeacher(true);
      const jar = await cookies();
      const token = jar.get("teacher_access")?.value;
      if (token) await client.auth.admin.signOut(token, "local");
      jar.delete("teacher_access");
      jar.delete("teacher_refresh");
      return NextResponse.json({ success: true });
    }
    if (body.action === "invite") {
      const denied = await teacherAccess(request);
      if (denied) return denied;
      const token = randomBytes(32).toString("hex");
      const { error } = await client
        .from("teacher_invitations")
        .insert({
          token_hash: createHash("sha256").update(token).digest("hex"),
        });
      if (error) throw error;
      return NextResponse.json({ path: `/bagsh?invite=${token}` });
    }
    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (
      !/^[a-z0-9._-]{3,40}$/.test(username) ||
      password.length < 10 ||
      password.length > 128
    ) {
      return NextResponse.json(
        {
          error:
            "Нэвтрэх нэр 3–40 латин тэмдэгт, нууц үг 10–128 тэмдэгт байна.",
        },
        { status: 400 },
      );
    }
    if (body.action === "setup") {
      if (
        typeof body.invite !== "string" ||
        !/^[a-f0-9]{64}$/.test(body.invite)
      )
        throw new Error("Багшийн урилгын холбоос буруу байна.");
      const hash = createHash("sha256").update(body.invite).digest("hex");
      const { data: invitation } = await client
        .from("teacher_invitations")
        .select("token_hash")
        .eq("token_hash", hash)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (!invitation)
        throw new Error("Урилга ашиглагдсан эсвэл хугацаа дууссан байна.");
      if (
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.length > 100
      )
        throw new Error("Багшийн нэрээ оруулна уу.");
      const email = `${randomUUID()}@teachers.aldar.invalid`;
      const { data, error } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error || !data.user)
        throw new Error("Багшийн эрх үүсгэх боломжгүй байна.");
      const { error: profileError } = await client.rpc(
        "accept_teacher_invitation",
        {
          p_hash: hash,
          p_user: data.user.id,
          p_username: username,
          p_name: body.name.trim(),
          p_email: email,
        },
      );
      if (profileError) {
        await client.auth.admin.deleteUser(data.user.id);
        throw new Error("Урилга эсвэл нэвтрэх нэр ашиглагдсан байна.");
      }
    }
    const { data: profile } = await client
      .from("teacher_profiles")
      .select("login_email")
      .eq("username", username)
      .eq("enabled", true)
      .maybeSingle();
    // Always call Auth so invalid usernames receive the same authentication response.
    const { data, error } = await client.auth.signInWithPassword({
      email: profile?.login_email || "unknown@teachers.aldar.invalid",
      password,
    });
    if (error || !data.session || !profile)
      return NextResponse.json(
        { error: "Нэвтрэх нэр эсвэл нууц үг буруу байна." },
        { status: 401 },
      );
    await saveTeacherSession(data.session);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Teacher sign-in failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Нэвтрэхэд алдаа гарлаа.",
      },
      { status: 400 },
    );
  }
}
