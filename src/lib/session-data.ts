import "server-only";
import type { SessionItem, SessionTimeSlot } from "./db";
import { scheduleSummary, WEEKDAYS } from "./schedules";
import { getSupabaseAdmin } from "./supabase/server";

interface SessionRow {
  id: string;
  title: string;
  coach: string;
  capacity: number;
  schedule_type: "recurring" | "single";
  specific_date: string | null;
  start_date: string | null;
  end_date: string | null;
  session_time_slots: {
    day_of_week: number;
    start_time: string;
    end_time: string;
  }[];
  session_enrollments: { student_id: string }[];
}

export async function getSessions(id?: string): Promise<SessionItem[]> {
  const sessions: SessionItem[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = getSupabaseAdmin()
      .from("sessions")
      .select("*,session_time_slots(*),session_enrollments(student_id)");
    if (id) query = query.eq("id", id);
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + 499);
    if (error) throw new Error("Ангийн хуваарь татахад алдаа гарлаа.");
    for (const row of data as SessionRow[]) {
      const slots: SessionTimeSlot[] = row.session_time_slots
        .map((slot) => ({
          dayOfWeek: slot.day_of_week,
          startTime: slot.start_time.slice(0, 5),
          endTime: slot.end_time.slice(0, 5),
        }))
        .sort(
          (a, b) =>
            a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
        );
      const days = [...new Set(slots.map((slot) => slot.dayOfWeek))];
      sessions.push({
        id: row.id,
        title: row.title,
        coach: row.coach,
        capacity: row.capacity,
        scheduleType: row.schedule_type,
        specificDate: row.specific_date || "",
        startDate: row.start_date || "",
        endDate: row.end_date || "",
        selectedDays: days,
        startTime: slots[0]?.startTime || "",
        endTime: slots[0]?.endTime || "",
        time: scheduleSummary(slots).join("; "),
        dayOfWeek:
          row.schedule_type === "single"
            ? `${row.specific_date} (1 удаа)`
            : WEEKDAYS.filter((day) => days.includes(day.id))
                .map((day) => day.name)
                .join(", "),
        timeSlots: slots,
        enrolledMemberIds: row.session_enrollments
          .map((item) => item.student_id)
          .sort(),
      });
    }
    if (data.length < 500) return sessions;
  }
}
