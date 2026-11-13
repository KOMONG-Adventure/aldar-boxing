import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { teacherAccess } from "@/lib/teacher-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { billingToday } from "@/lib/billing";
import { isScheduleDate } from "@/lib/schedules";

export async function POST(request: Request) {
  const denied = await teacherAccess(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const date = body.date || billingToday();
    if (
      typeof body.memberId !== "string" ||
      typeof body.opponent !== "string" ||
      !body.opponent.trim() ||
      body.opponent.length > 150 ||
      !["WIN", "LOSS", "DRAW"].includes(body.result) ||
      !isScheduleDate(date)
    )
      return NextResponse.json(
        { error: "Тулааны мэдээллийг шалгана уу." },
        { status: 400 },
      );
    const entry = {
      id: body.requestId || randomUUID(),
      student_id: body.memberId,
      date,
      opponent: body.opponent.trim(),
      result: body.result,
      tournament: String(body.tournament || "Клубын спарринг").slice(0, 200),
      method: String(body.method || "Шүүгчийн шийдвэр").slice(0, 200),
      weight_category: String(body.weightCategory || "Жин заагаагүй").slice(
        0,
        100,
      ),
    };
    const client = getSupabaseAdmin();
    const { error } = await client
      .from("student_fights")
      .upsert(entry, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
    const { data, error: readError } = await client
      .from("student_fights")
      .select("*")
      .eq("id", entry.id)
      .single();
    if (readError) throw readError;
    if (
      Object.keys(entry).some(
        (key) => data[key] !== entry[key as keyof typeof entry],
      )
    )
      return NextResponse.json(
        { error: "Хүсэлтийн дугаар давхардсан байна." },
        { status: 409 },
      );
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Тулаан хадгалах боломжгүй байна." },
      { status: 400 },
    );
  }
}
