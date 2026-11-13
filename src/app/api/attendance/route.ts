import { NextResponse } from "next/server";
import { teacherAccess } from "@/lib/teacher-auth";
import { getAttendance } from "@/lib/operations-data";
import { getSessions } from "@/lib/session-data";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { isScheduleDate } from "@/lib/schedules";

export async function GET(request: Request) {
  const denied = await teacherAccess(request);
  if (denied) return denied;
  try {
    const params = new URL(request.url).searchParams;
    const [sessions, allAttendances] = await Promise.all([
      getSessions(),
      getAttendance(),
    ]);
    const attendances = allAttendances.filter(
      (a) =>
        (!params.get("date") || a.date === params.get("date")) &&
        (!params.get("sessionId") || a.sessionId === params.get("sessionId")),
    );
    return NextResponse.json({ sessions, attendances, allAttendances });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Ирц татахад алдаа гарлаа." },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  const denied = await teacherAccess(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    const ids = body.memberIds || [body.memberId];
    if (
      typeof body.sessionId !== "string" ||
      !isScheduleDate(body.date) ||
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > 100 ||
      ids.some((id) => typeof id !== "string") ||
      !["CHECKIN", "REMOVE"].includes(body.action)
    ) {
      return NextResponse.json(
        { error: "Ирцийн мэдээллийг шалгана уу." },
        { status: 400 },
      );
    }
    const { error } = await getSupabaseAdmin().rpc("set_training_attendance", {
      p_session: body.sessionId,
      p_students: ids,
      p_date: body.date,
      p_present: body.action === "CHECKIN",
    });
    if (error) throw error;
    return NextResponse.json({
      success: true,
      attended: body.action === "CHECKIN",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Сурагч, хичээлийн өдөр болон мэдээллээ шалгана уу." },
      { status: 400 },
    );
  }
}
