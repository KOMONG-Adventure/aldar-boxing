import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { memberId, siblingId, confirmed } = await request.json();
    if (typeof memberId !== "string" || !memberId ||
        (siblingId !== null && (typeof siblingId !== "string" || !siblingId)) || confirmed !== true) {
      return NextResponse.json({ error: "Хүүхдээ сонгож холбоосыг баталгаажуулна уу." }, { status: 400 });
    }
    const { error } = await getSupabaseAdmin().rpc("set_student_sibling", {
      p_student_id: memberId, p_sibling_id: siblingId,
    });
    if (error) {
      return NextResponse.json({ error: error.code === "P0001" ? error.message : "Хүүхдийн холбоос хадгалахад алдаа гарлаа." }, { status: error.code === "P0001" ? 409 : 503 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sibling link request failed", error);
    return NextResponse.json({ error: "Холбоосын мэдээллийг шалгаад дахин оролдоно уу." }, { status: 400 });
  }
}
