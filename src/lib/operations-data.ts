import "server-only";
import { getSupabaseAdmin } from "./supabase/server";
import type { AttendanceRecord, FightRecord } from "./db";

export async function getAttendance(): Promise<AttendanceRecord[]> {
  const records: AttendanceRecord[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await getSupabaseAdmin()
      .from("attendance_records")
      .select("*, students(name,last_name), sessions(title)")
      .order("date", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    records.push(
      ...data.map((row) => ({
        id: row.id,
        sessionId: row.session_id,
        memberId: row.student_id,
        sessionTitle: row.sessions?.title,
        memberName:
          `${row.students?.last_name || ""} ${row.students?.name || ""}`.trim(),
        date: row.date,
        checkInTime: row.check_in_time,
      })),
    );
    if (data.length < 500) return records;
  }
}
export async function getFights(): Promise<Map<string, FightRecord[]>> {
  const result = new Map<string, FightRecord[]>();
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await getSupabaseAdmin()
      .from("student_fights")
      .select("*")
      .order("date", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    for (const row of data) {
      const fights = result.get(row.student_id) || [];
      fights.push({
        id: row.id,
        date: row.date,
        opponent: row.opponent,
        result: row.result,
        tournament: row.tournament,
        method: row.method,
        weightCategory: row.weight_category,
      });
      result.set(row.student_id, fights);
    }
    if (data.length < 500) return result;
  }
}
