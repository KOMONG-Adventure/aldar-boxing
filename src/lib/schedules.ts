import type { SessionItem, SessionTimeSlot } from "./db";

export const WEEKDAYS = [
  { id: 1, short: "Да", name: "Даваа" },
  { id: 2, short: "Мя", name: "Мягмар" },
  { id: 3, short: "Лх", name: "Лхагва" },
  { id: 4, short: "Пү", name: "Пүрэв" },
  { id: 5, short: "Ба", name: "Баасан" },
  { id: 6, short: "Бя", name: "Бямба" },
  { id: 7, short: "Ня", name: "Ням" },
];

export function isScheduleDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function scheduleWeekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
}

export function scheduleGroups(slots: SessionTimeSlot[]) {
  const groups = new Map<
    string,
    { days: number[]; startTime: string; endTime: string }
  >();
  for (const slot of slots) {
    const key = `${slot.startTime}-${slot.endTime}`;
    const group = groups.get(key) || {
      days: [],
      startTime: slot.startTime,
      endTime: slot.endTime,
    };
    group.days.push(slot.dayOfWeek);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    days: [...new Set(group.days)].sort((a, b) => a - b),
  }));
}

export function sessionSlots(session: SessionItem): SessionTimeSlot[] {
  if (session.timeSlots) return session.timeSlots;
  const range = session.time.match(/(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})/);
  const days =
    session.scheduleType === "single" && session.specificDate
      ? [scheduleWeekday(session.specificDate)]
      : session.selectedDays || [];
  return days.map((dayOfWeek) => ({
    dayOfWeek,
    startTime: session.startTime || range?.[1] || "",
    endTime: session.endTime || range?.[2] || "",
  }));
}

export function slotsOnDate(
  session: SessionItem,
  date: string,
): SessionTimeSlot[] {
  if (!isScheduleDate(date)) return [];
  if (session.scheduleType === "single") {
    return date === session.specificDate ? sessionSlots(session) : [];
  }
  if (
    (session.startDate && date < session.startDate) ||
    (session.endDate && date > session.endDate)
  )
    return [];
  return sessionSlots(session).filter(
    (slot) => slot.dayOfWeek === scheduleWeekday(date),
  );
}

export function scheduleSummary(slots: SessionTimeSlot[]): string[] {
  return scheduleGroups(slots).map(
    (group) =>
      `${WEEKDAYS.filter((day) => group.days.includes(day.id))
        .map((day) => day.short)
        .join(", ")} · ${group.startTime}–${group.endTime}`,
  );
}

export interface SessionDraft {
  title: string;
  coach: string;
  capacity: number;
  scheduleType: "recurring" | "single";
  specificDate: string;
  startDate: string;
  endDate: string;
  timeSlots: SessionTimeSlot[];
  enrolledMemberIds: string[];
}

export function validateSessionDraft(
  body: Record<string, unknown>,
): SessionDraft {
  if (
    typeof body.title !== "string" ||
    !body.title.trim() ||
    body.title.trim().length > 150
  )
    throw new Error("Ангийн нэрийг зөв оруулна уу.");
  if (
    body.coach !== undefined &&
    (typeof body.coach !== "string" || body.coach.length > 150)
  )
    throw new Error("Дасгалжуулагчийн нэрийг шалгана уу.");
  if (
    !Number.isInteger(body.capacity) ||
    Number(body.capacity) < 1 ||
    Number(body.capacity) > 100
  )
    throw new Error("Багтаамж 1–100 хүн байна.");
  const type = body.scheduleType || "recurring";
  if (type !== "recurring" && type !== "single")
    throw new Error("Хуваарийн төрлийг шалгана уу.");
  const dates = { specificDate: "", startDate: "", endDate: "" };
  for (const key of Object.keys(dates) as (keyof typeof dates)[]) {
    const value = body[key];
    if (value && (typeof value !== "string" || !isScheduleDate(value)))
      throw new Error("Огноог зөв оруулна уу.");
    dates[key] = typeof value === "string" ? value : "";
  }
  if (type === "single" && !dates.specificDate)
    throw new Error("Нэг өдрийн бэлтгэлийн огноог сонгоно уу.");
  if (
    type === "recurring" &&
    dates.endDate &&
    dates.startDate &&
    dates.endDate < dates.startDate
  )
    throw new Error("Дуусах огноо эхлэх огнооноос өмнө байж болохгүй.");
  let input = body.timeSlots;
  if (input === undefined) {
    const range =
      typeof body.time === "string"
        ? body.time.match(/^(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})$/)
        : null;
    const days =
      type === "single"
        ? [scheduleWeekday(dates.specificDate)]
        : body.selectedDays;
    input = Array.isArray(days)
      ? days.map((dayOfWeek) => ({
          dayOfWeek,
          startTime: body.startTime || range?.[1],
          endTime: body.endTime || range?.[2],
        }))
      : [];
  }
  if (!Array.isArray(input) || input.length === 0 || input.length > 49)
    throw new Error("Бэлтгэлийн өдөр, цагийг сонгоно уу.");
  const slots: SessionTimeSlot[] = [];
  for (const slot of input) {
    if (
      !slot ||
      typeof slot !== "object" ||
      !Number.isInteger(slot.dayOfWeek) ||
      slot.dayOfWeek < 1 ||
      slot.dayOfWeek > 7 ||
      typeof slot.startTime !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime) ||
      typeof slot.endTime !== "string" ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime) ||
      slot.startTime >= slot.endTime
    ) {
      throw new Error(
        "Дуусах цаг эхлэх цагаас хойш байх ёстой. Өдөр, цагийг шалгана уу.",
      );
    }
    slots.push({
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  }
  slots.sort(
    (a, b) =>
      a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
  );
  for (let index = 1; index < slots.length; index++) {
    if (
      slots[index].dayOfWeek === slots[index - 1].dayOfWeek &&
      slots[index].startTime < slots[index - 1].endTime
    ) {
      throw new Error(
        `${WEEKDAYS[slots[index].dayOfWeek - 1].name} гарагийн цаг давхцаж байна.`,
      );
    }
  }
  if (
    type === "single" &&
    slots.some((slot) => slot.dayOfWeek !== scheduleWeekday(dates.specificDate))
  )
    throw new Error("Бэлтгэлийн өдөр сонгосон огноотой таарахгүй байна.");
  const ids = body.enrolledMemberIds || [];
  if (
    !Array.isArray(ids) ||
    ids.some((id) => typeof id !== "string" || !id || id.length > 100)
  )
    throw new Error("Сурагчийн сонголтыг шалгана уу.");
  const uniqueIds = [...new Set(ids)] as string[];
  if (uniqueIds.length > Number(body.capacity))
    throw new Error("Сонгосон сурагчдын тоо багтаамжаас хэтэрсэн байна.");
  return {
    title: body.title.trim(),
    coach: typeof body.coach === "string" ? body.coach.trim() : "",
    capacity: Number(body.capacity),
    scheduleType: type,
    specificDate: type === "single" ? dates.specificDate : "",
    startDate: type === "recurring" ? dates.startDate : "",
    endDate: type === "recurring" ? dates.endDate : "",
    timeSlots: slots,
    enrolledMemberIds: uniqueIds.sort(),
  };
}
