import { NextResponse } from "next/server";
import { getDbData } from "@/lib/db";
import { teacherAccess } from "@/lib/teacher-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const denied = await teacherAccess(request);
  if (denied) return denied;
  try {
    const client = getSupabaseAdmin();
    const { error: reminderError } = await client.rpc(
      "refresh_payment_reminders",
    );
    if (reminderError) throw reminderError;
    const [settings, notifications] = await Promise.all([
      client.from("app_settings").select("value").eq("id", true).maybeSingle(),
      client
        .from("app_notifications")
        .select("*")
        .order("time", { ascending: false })
        .limit(100),
    ]);
    if (settings.error || notifications.error)
      throw settings.error || notifications.error;
    return NextResponse.json({
      settings: settings.data?.value || getDbData().settings,
      notifications: notifications.data,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Тохиргоо татахад алдаа гарлаа." },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  const denied = await teacherAccess(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const client = getSupabaseAdmin();
    if (body.action === "update_settings") {
      const s = body.settings;
      if (
        !s ||
        typeof s.clubName !== "string" ||
        !s.clubName.trim() ||
        s.clubName.length > 100 ||
        typeof s.coachName !== "string" ||
        s.coachName.length > 100 ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.gymOpenTime) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(s.gymCloseTime) ||
        s.gymOpenTime >= s.gymCloseTime
      )
        throw new Error("Клубын нэр, ажиллах цагийг шалгана уу.");
      const value = {
        clubName: s.clubName.trim(),
        coachName: s.coachName.trim(),
        gymOpenTime: s.gymOpenTime,
        gymCloseTime: s.gymCloseTime,
        monthlyFee: 100000,
        smsNotification: s.smsNotification === true,
        currency: "₮",
      };
      const { error } = await client
        .from("app_settings")
        .upsert({ id: true, value });
      if (error) throw error;
    } else if (
      body.action === "mark_all_read" ||
      (body.action === "read" && typeof body.id === "string")
    ) {
      let query = client.from("app_notifications").update({ read: true });
      query =
        body.action === "read"
          ? query.eq("id", body.id)
          : query.eq("read", false);
      const { error } = await query;
      if (error) throw error;
    } else throw new Error("Үйлдэл буруу байна.");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Тохиргоо хадгалахад алдаа гарлаа.",
      },
      { status: 400 },
    );
  }
}
