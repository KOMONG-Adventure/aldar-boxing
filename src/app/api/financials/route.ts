import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { teacherAccess } from "@/lib/teacher-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getPayments } from "@/lib/payment-data";
import { billingToday } from "@/lib/billing";
import { isScheduleDate } from "@/lib/schedules";

export async function GET(request: Request) {
  const denied = await teacherAccess(request);
  if (denied) return denied;
  try {
    const logs = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await getSupabaseAdmin()
        .from("financial_logs")
        .select("*")
        .order("date", { ascending: false })
        .order("id")
        .range(offset, offset + 499);
      if (error) throw error;
      logs.push(...data);
      if (data.length < 500) break;
    }
    const payments = await getPayments();
    const income = payments.map((p) => ({
      id: p.id,
      type: "INCOME",
      title: `${p.student_name} — Сургалтын төлбөр`,
      amount: p.amount,
      category: "Сургалтын төлбөр",
      date: p.start_date,
      memberId: p.student_id,
    }));
    return NextResponse.json(
      [...logs, ...income].sort((a, b) => b.date.localeCompare(a.date)),
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Санхүүгийн мэдээлэл татахад алдаа гарлаа." },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  const denied = await teacherAccess(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const date = body.date || billingToday();
    if (
      !["INCOME", "EXPENSE"].includes(body.type) ||
      typeof body.title !== "string" ||
      !body.title.trim() ||
      body.title.length > 300 ||
      !Number.isSafeInteger(Number(body.amount)) ||
      Number(body.amount) <= 0 ||
      Number(body.amount) > 2147483647 ||
      !isScheduleDate(date)
    )
      return NextResponse.json(
        { error: "Гарчиг, дүн, огноог шалгана уу." },
        { status: 400 },
      );
    const entry = {
      id: body.requestId || randomUUID(),
      type: body.type,
      title: body.title.trim(),
      amount: Number(body.amount),
      category: String(body.category || "Бусад").slice(0, 100),
      date,
    };
    const client = getSupabaseAdmin();
    const { error } = await client
      .from("financial_logs")
      .upsert(entry, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
    const { data, error: readError } = await client
      .from("financial_logs")
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
      { error: "Санхүүгийн бүртгэл хадгалах боломжгүй." },
      { status: 400 },
    );
  }
}
