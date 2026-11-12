import { NextResponse } from "next/server";
import type { Guardian, Member } from "@/lib/db";
import { createPublicRegistration } from "@/lib/student-data";
import { getSupabaseAdmin, SupabaseConfigurationError } from "@/lib/supabase/server";

const editableFields = [
  "lastName", "birthDate", "registerNumber", "gender", "level", "joinedDate",
  "weight", "height", "familyCount", "bloodType", "district", "addressDetail",
] as const;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Бүртгэлийн хуудсаар дамжуулан илгээнэ үү." }, { status: 403 });
  }
  try {
    const raw = await request.text();
    if (raw.length > 2_000_000) {
      return NextResponse.json({ error: "Зургийн хэмжээ хэтэрсэн байна. Жижиг зураг сонгоно уу." }, { status: 413 });
    }
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Бүртгэлийн мэдээлэл буруу байна." }, { status: 400 });
    }
    if (typeof body.submissionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.submissionId)) {
      return NextResponse.json({ error: "Хуудсыг дахин нээгээд бүртгэлээ илгээнэ үү." }, { status: 400 });
    }
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 120 ||
        typeof body.phone !== "string" || !/^\+?[\d ()-]{8,25}$/.test(body.phone.trim())) {
      return NextResponse.json({ error: "Сурагчийн нэр болон утасны дугаарыг зөв оруулна уу." }, { status: 400 });
    }
    const fields: Partial<Member> = {};
    for (const field of editableFields) {
      if (body[field] !== undefined && (typeof body[field] !== "string" || body[field].length > 250)) {
        return NextResponse.json({ error: "Бүртгэлийн талбарын утгыг шалгана уу." }, { status: 400 });
      }
      fields[field] = body[field]?.trim() || "";
    }
    const guardians: Guardian[] = [];
    if (body.guardians !== undefined && (!Array.isArray(body.guardians) || body.guardians.length > 5)) {
      return NextResponse.json({ error: "Асран хамгаалагчийн мэдээллийг шалгана уу." }, { status: 400 });
    }
    for (const guardian of body.guardians || []) {
      if (!guardian || ["name", "phone", "relation", "profession"].some(field =>
        guardian[field] !== undefined && (typeof guardian[field] !== "string" || guardian[field].length > 120))) {
        return NextResponse.json({ error: "Асран хамгаалагчийн мэдээллийг шалгана уу." }, { status: 400 });
      }
      if (guardian.name?.trim()) guardians.push({
        name: guardian.name.trim(), phone: guardian.phone?.trim() || "",
        relation: guardian.relation?.trim() || "", profession: guardian.profession?.trim() || "",
      });
    }
    if (body.avatarUrl && (typeof body.avatarUrl !== "string" || !body.avatarUrl.startsWith("data:image/"))) {
      return NextResponse.json({ error: "Профайл зургаа файлаас сонгоно уу." }, { status: 400 });
    }
    const id = `public_${body.submissionId}`;
    const client = getSupabaseAdmin();
    const { data: existing, error } = await client.from("students").select("id").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!existing) {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(new Date());
      await createPublicRegistration({
        id, lastName: "", gender: "", level: "Beginner", joinedDate: today, ...fields,
        name: body.name.trim(), phone: body.phone.trim(), guardians,
        status: "UNPAID", paymentDate: "", expireDate: "", createdAt: new Date().toISOString(),
        avatarUrl: body.avatarUrl || "", attendancesCount: 0, assignedSessionIds: [],
      });
    }
    return NextResponse.json({ success: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Бүртгэлийн мэдээлэл буруу байна." }, { status: 400 });
    }
    console.error("Public student registration failed", error);
    return NextResponse.json({ error: error instanceof SupabaseConfigurationError
      ? "Бүртгэлийн холболтыг тохируулж байна. Түр хүлээгээд дахин оролдоно уу."
      : "Бүртгэл илгээхэд алдаа гарлаа. Дахин оролдоно уу." }, { status: 503 });
  }
}
