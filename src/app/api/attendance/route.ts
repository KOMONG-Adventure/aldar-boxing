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
    const status = body.action === "REMOVE" ? null : body.action === "CHECKIN" ? "present" : body.status;
    if (
      typeof body.sessionId !== "string" ||
      !isScheduleDate(body.date) ||
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > 100 ||
      ids.some((id) => typeof id !== "string") ||
      !["CHECKIN", "REMOVE", "SET"].includes(body.action) ||
      (body.action !== "REMOVE" && !["present", "sick", "absent"].includes(status))
    ) {
      return NextResponse.json(
        { error: "Ирцийн мэдээллийг шалгана уу." },
        { status: 400 },
      );
    }
    const memberIds = [...new Set<string>(ids)];
    const { error } = await getSupabaseAdmin().rpc("set_training_attendance_status", {
      p_session: body.sessionId,
      p_students: memberIds,
      p_date: body.date,
      p_status: status,
    });
    if (error) throw error;
    const records = status !== null
      ? await getAttendance({ sessionId: body.sessionId, date: body.date, memberIds })
      : [];
    return NextResponse.json({
      success: true,
      attended: status === "present",
      records,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Сурагч, хичээлийн өдөр болон мэдээллээ шалгана уу." },
      { status: 400 },
    );
  }
}
