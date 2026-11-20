"use client";

import React, { useState } from "react";
import {
  Clock,
  Users,
  UserCheck,
  LoaderCircle,
  Check,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Dumbbell,
  Trash2,
  Plus,
  Filter,
  UserX,
} from "lucide-react";
import { SessionItem, Member, AttendanceRecord, AttendanceStatus } from "@/lib/db";
import AddSessionModal from "./AddSessionModal";
import AttendanceReport from "./AttendanceReport";
import AttendanceDatePicker from "./AttendanceDatePicker";
import { billingToday } from "@/lib/billing";
import { scheduleSummary, sessionSlots, slotsOnDate } from "@/lib/schedules";

const attendanceLabels: Record<AttendanceStatus, string> = { present: "Ирсэн", sick: "Өвчтэй", absent: "Тасалсан" };

interface AttendanceManagerProps {
  onAttendanceSaved: (sessionId: string, date: string, ids: string[], records: AttendanceRecord[]) => void;
  sessions: SessionItem[];
  members: Member[];
  attendances: AttendanceRecord[];
  onRefresh: () => void;
}

export default function AttendanceManager({
  sessions,
  members,
  attendances,
  onRefresh,
  onAttendanceSaved,
}: AttendanceManagerProps) {
  // Огноо
  const [selectedDate, setSelectedDate] = useState<string>(billingToday);
  const todayStr = billingToday();
  const palette = ["#a78bfa", "#38bdf8", "#34d399", "#fbbf24", "#fb7185", "#fb923c", "#818cf8", "#2dd4bf"];
  const classColors = new Map(sessions.map((session, index) => [session.id, palette[index % palette.length]]));
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [searchMember, setSearchMember] = useState("");
  const [pendingAttendance, setPendingAttendance] = useState<{ sessionId: string; date: string; memberIds: string[]; status: AttendanceStatus | null; bulk: boolean } | null>(null);
  const [attendanceError, setAttendanceError] = useState("");
  const attendanceSaving = pendingAttendance !== null;

  // Сонгогдсон анги
  const daySessions = sessions.filter(
    (session) => slotsOnDate(session, selectedDate).length > 0,
  );
  const visibleSessions = showAllSessions ? sessions : daySessions;
  const currentSession =
    visibleSessions.find((session) => session.id === selectedSessionId);
  const currentSlots = currentSession
    ? slotsOnDate(currentSession, selectedDate)
    : [];

  const handleSessionSaved = () => {
    setShowAllSessions(true);
    onRefresh();
  };

  // Тухайн өдөр, тухайн ангийн ирцүүд
  const dayAttendances = attendances.filter(
    (a) => a.date === selectedDate && a.sessionId === currentSession?.id,
  );

  const pendingHere = pendingAttendance?.sessionId === currentSession?.id && pendingAttendance?.date === selectedDate ? pendingAttendance : null;
  const attendedMemberIds = dayAttendances.filter(row => row.status === "present" && !pendingHere?.memberIds.includes(row.memberId)).map(row => row.memberId);
  if (pendingHere?.status === "present") attendedMemberIds.push(...pendingHere.memberIds);

  // Огноо нааш цааш шилжүүлэх
  const changeDateByDays = (days: number) => {
    if (!selectedDate) return;
    const d = new Date(selectedDate);
    d.setUTCDate(d.getUTCDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
    setShowAllSessions(false);
  };

  const isToday = selectedDate === todayStr && todayStr !== "";

  const saveAttendance = async (memberIds: string[], status: AttendanceStatus | null, bulk = false) => {
    if (!currentSession || currentSlots.length === 0 || pendingAttendance || !memberIds.length) return;
    const sessionId = currentSession.id;
    const date = selectedDate;
    setAttendanceError("");
    setPendingAttendance({ sessionId, date, memberIds, status, bulk });
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, date, memberIds, action: status === null ? "REMOVE" : "SET", status }),
      });
      const result = await response.json();
      if (!response.ok || !Array.isArray(result.records)) {
        throw new Error(result.error || "Ирц хадгалах боломжгүй байна.");
      }
      onAttendanceSaved(sessionId, date, memberIds, result.records);
    } catch (error) {
      setAttendanceError(error instanceof Error ? error.message : "Ирц хадгалахад алдаа гарлаа.");
    } finally {
      setPendingAttendance(null);
    }
  };



  const handleMarkAllPresent = () =>
    saveAttendance((currentSession?.enrolledMemberIds || []).filter(id => !dayAttendances.some(row => row.memberId === id)), "present", true);
  // Анги устгах
  const handleDeleteSession = async (id: string, title: string) => {
    if (!confirm(`"${title}" бэлтгэлийн ангийг устгах уу?`)) return;
    try {
      const res = await fetch(`/api/sessions?id=${id}`, { method: "DELETE" });
      if (res.ok) onRefresh();
    } catch (e) {
      alert("Устгахад алдаа гарлаа");
    }
  };

  // Жагсаалтад харуулах сурагчдын тооцоо
  const enrolledList = members.filter((m) =>
    currentSession?.enrolledMemberIds?.includes(m.id),
  );

  const displayList = (
    enrolledList
  ).filter(
    (m) =>
      `${m.lastName || ""} ${m.name}`
        .toLowerCase()
        .includes(searchMember.toLowerCase()) || m.phone.includes(searchMember),
  );

  // Ирцийн хувь
  const attendedCount = enrolledList.filter((m) =>
    attendedMemberIds.includes(m.id),
  ).length;
  const attendanceRate =
    enrolledList.length > 0
      ? Math.round((attendedCount / enrolledList.length) * 100)
      : 0;

  return (
    <div className="space-y-4">
      <AttendanceReport date={selectedDate || todayStr} attendances={attendances} />
      {/* 1. ОГНОО СОНГОХ СЭЛГЭГЧ (Date Switcher - Gymdesk style) */}
      <div className="bg-[var(--club-panel)] border border-zinc-800 rounded-3xl p-3 sm:p-4 flex items-center justify-between shadow-lg">
        <button
          onClick={() => changeDateByDays(-1)}
          className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
          title="Өмнөх өдөр"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2 text-center">
          <AttendanceDatePicker
            value={selectedDate}
            today={todayStr}
            sessions={sessions}
            colors={classColors}
            onChange={(date) => {
              setSelectedDate(date);
              setShowAllSessions(false);
            }}
          />
          {isToday && (
            <span className="text-[10px] bg-red-600/20 text-red-400 font-bold px-2 py-0.5 rounded-full border border-red-500/30">
              Өнөөдөр
            </span>
          )}
        </div>

        <button
          onClick={() => changeDateByDays(1)}
          className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
          title="Дараах өдөр"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 2. БЭЛТГЭЛИЙН АНГИ СОНГОХ КАРТУУД (Session Carousel) */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <Clock size={15} className="text-red-500" /> Бэлтгэлийн цагууд
          </span>
          <AddSessionModal
            onSessionAdded={handleSessionSaved}
            members={members}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={!showAllSessions}
            onClick={() => setShowAllSessions(false)}
            className={`rounded-xl border px-3 py-2 text-xs ${!showAllSessions ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-zinc-800 text-zinc-400"}`}
          >
            Энэ өдөр ({daySessions.length})
          </button>
          <button
            type="button"
            aria-pressed={showAllSessions}
            onClick={() => setShowAllSessions(true)}
            className={`rounded-xl border px-3 py-2 text-xs ${showAllSessions ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-zinc-800 text-zinc-400"}`}
          >
            Бүх анги ({sessions.length})
          </button>
        </div>

        {visibleSessions.length === 0 ? (
          <div className="bg-[var(--club-panel)] border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-xs">
            {sessions.length === 0
              ? "Бэлтгэлийн хуваарь үүсгээгүй байна. Анги үүсгэх товчоор нэмнэ үү."
              : "Энэ өдөр бэлтгэлийн хуваарь байхгүй байна. Бүх анги хэсгээс бусад хуваарийг харна уу."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {visibleSessions.map((s) => {
              const isSelected = s.id === currentSession?.id;
              // Энэ өдөр тухайн ангид ирсэн тоо
              const sCount = attendances.filter(
                (a) => a.date === selectedDate && a.sessionId === s.id && a.status === "present",
              ).length;
              const totalEnrolled = s.enrolledMemberIds?.length || 0;

              return (
                <div
                  key={s.id}
                  style={{ borderInlineStart: `4px solid ${classColors.get(s.id)}` }}
                  onClick={() => { setSearchMember(""); setAttendanceError(""); setSelectedSessionId(isSelected ? "" : s.id); }}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative ${
                    isSelected
                      ? "bg-gradient-to-br from-red-950/40 via-[#18181c] to-[#121215] border-red-500 shadow-md shadow-red-950/40"
                      : "bg-[var(--club-panel)] border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <button type="button" aria-expanded={isSelected && currentSlots.length > 0} className="text-left text-xs font-bold text-white truncate max-w-[150px]">
                      <span aria-hidden="true" className="mr-1.5 inline-block size-2 rounded-full" style={{ backgroundColor: classColors.get(s.id) }} />
                      {s.title}
                    </button>
                    <div className="flex shrink-0 items-center">
                      <AddSessionModal
                        session={s}
                        members={members}
                        onSessionAdded={handleSessionSaved}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(s.id, s.title);
                        }}
                        className="text-zinc-600 hover:text-red-400 p-1 rounded-lg"
                        title="Анги устгах"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-red-400 font-semibold">
                      {slotsOnDate(s, selectedDate)
                        .map((slot) => `${slot.startTime}–${slot.endTime}`)
                        .join(", ") || "Энэ өдөр хуваарьгүй"}
                    </span>
                    <span className="text-zinc-400 font-medium">
                      Ирц: <b className="text-white">{sCount}</b> /{" "}
                      {totalEnrolled}
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-[11px] text-zinc-300">
                    {scheduleSummary(sessionSlots(s)).map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                    {s.scheduleType === "single" && (
                      <p>{s.specificDate} · Нэг удаа</p>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-2">
                    {s.coach}
                    {s.startDate && (
                      <span className="text-zinc-400 block mt-0.5 font-normal">
                        Хугацаа: {s.startDate}{" "}
                        {s.endDate ? `~ ${s.endDate}` : "эхлэн"}
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. ИРЦИЙН АМАРХАН БҮРТГЭЛИЙН ИНТЕРФЭЙС (One-Click Attendance Sheet) */}
      {currentSession && currentSlots.length > 0 && (
        <div className="bg-[var(--club-panel)] border border-zinc-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
          {/* Ангийн толгой ба Статистик прогресс */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  {currentSession.title}
                </h3>
                <span className="text-[11px] bg-red-600/20 text-red-400 px-2 py-0.5 rounded-lg border border-red-500/30 font-bold">
                  {currentSlots
                    .map((slot) => `${slot.startTime}–${slot.endTime}`)
                    .join(", ")}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Дасгалжуулагч: {currentSession.coach} • Багтаамж:{" "}
                {currentSession.capacity}
              </p>
            </div>

            {/* Ирцийн хувь прогресс бар */}
            <div className="flex items-center gap-3 bg-[var(--club-raised)] px-3.5 py-2 rounded-2xl border border-zinc-800 shrink-0">
              <div>
                <div className="flex justify-between text-[11px] gap-4">
                  <span className="text-zinc-400">Ирцийн хувь</span>
                  <span className="font-bold text-white">
                    {attendedCount}/{enrolledList.length} ({attendanceRate}%)
                  </span>
                </div>
                <div className="w-28 sm:w-32 bg-zinc-800 h-2 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
              </div>

              {/* Бүгдийг ирсэн болгох хурдан үйлдэл */}
              <button
                onClick={handleMarkAllPresent}
                disabled={attendanceSaving}
                title="Бүртгэлтэй бүх сурагчдыг 1 товшилтоор ирсэнд тооцох"
                className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95"
              >
                {pendingHere?.bulk ? <LoaderCircle size={14} className="motion-safe:animate-spin" /> : <CheckCircle2 size={14} />} Бүртгээгүйг ирсэн болгох
              </button>
            </div>
          </div>

          {/* Хайлт ба Табууд: (Энэ ангийнхан / Бүх сурагчид) */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-2.5 text-zinc-500"
                size={15}
              />
              <input
                type="text"
                placeholder="Сурагчийн нэр, утсаар хайх..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="w-full bg-[var(--club-raised)] border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-1.5 bg-[var(--club-raised)] p-1 rounded-xl border border-zinc-800 text-xs shrink-0">
            </div>
          </div>

          {attendanceError && <p role="alert" className="text-sm text-red-400">{attendanceError}</p>}
          {/* СУРАГЧДЫН ИРЦ АВАХ БОДИТ ЖАГСААЛТ (One-Tap Attendance Rows) */}
          <div className="space-y-2">
            {displayList.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs bg-[var(--club-raised)] rounded-2xl border border-zinc-800/80">
                Бүртгэлтэй сурагч олдсонгүй.
              </div>
            ) : (
              displayList.map((m) => {
                const isAttended = attendedMemberIds.includes(m.id);
                const isPaid = m.status === "PAID";
                const isExpired = new Date(m.expireDate) < new Date();
                const attRecord = dayAttendances.find(
                  (a) => a.memberId === m.id,
                );

                return (
                  <div
                    key={m.id}

                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 group select-none ${
                      isAttended
                        ? "bg-emerald-950/20 border-emerald-500/50 hover:bg-emerald-950/30"
                        : "bg-[var(--club-raised)] border-zinc-800/80 hover:border-zinc-700"
                    }`}
                  >
                    {/* Зүүн тал: Сурагчийн мэдээлэл */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt={m.name}
                          className={`w-10 h-10 rounded-xl object-cover shrink-0 border transition ${
                            isAttended
                              ? "border-emerald-500 shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/30"
                              : "border-zinc-700"
                          }`}
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition ${
                            isAttended
                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                              : "bg-gradient-to-br from-zinc-750 to-zinc-800 text-zinc-300 border border-zinc-700/60 group-hover:border-zinc-500"
                          }`}
                        >
                          {m.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-xs sm:text-sm truncate ${
                              isAttended ? "text-white" : "text-zinc-200"
                            }`}
                          >
                            {m.lastName ? `${m.lastName} ` : ""}
                            {m.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                            {m.level}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                          <span>📞 {m.phone}</span>
                          <span>•</span>
                          <span
                            className={`${
                              isPaid && !isExpired
                                ? "text-emerald-400"
                                : "text-red-400 font-semibold"
                            }`}
                          >
                            {isPaid && !isExpired
                              ? "Төлбөр OK"
                              : "Төлбөр дууссан"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Баруун тал: Ганц товшилтоор ИРЭЭГҮЙ / ИРСЭН болгох товч */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isAttended && attRecord && (
                        <span className="text-[10px] text-emerald-400 font-mono hidden sm:inline">
                          🕒 {attRecord.checkInTime}
                        </span>
                      )}

                      {pendingHere?.memberIds.includes(m.id) && <LoaderCircle size={16} role="status" aria-label="Ирц хадгалж байна" className="text-red-400 motion-safe:animate-spin" />}
                      <select
                        aria-label={`${m.name} сурагчийн ирц`}
                        aria-busy={pendingHere?.memberIds.includes(m.id) || undefined}
                        disabled={attendanceSaving}
                        value={pendingHere?.memberIds.includes(m.id) ? pendingHere.status ?? "" : attRecord?.status ?? ""}
                        onChange={event => void saveAttendance([m.id], (event.target.value || null) as AttendanceStatus | null)}
                        className={`min-h-10 max-w-full rounded-xl border px-2 text-xs font-semibold ${isAttended ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" : "border-zinc-700 bg-[var(--club-panel)] text-zinc-300"}`}
                      >
                        <option value="">Тэмдэглээгүй</option>
                        {Object.entries(attendanceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. СҮҮЛД БҮРТГЭГДСЭН ИРЦИЙН ЖАГСААЛТ (History Feed) */}
      {currentSession && currentSlots.length > 0 && <div className="bg-[var(--club-panel)] border border-zinc-800 rounded-3xl p-4">
        <h4 className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-1.5">
          <Clock size={14} className="text-red-500" /> {selectedDate} өдрийн
          бүртгэгдсэн ирцийн бүртгэл
        </h4>
        <div className="space-y-1.5">
          {dayAttendances.length === 0 ? (
            <p className="text-zinc-500 text-xs text-center py-4">
              Энэ өдөр ирц бүртгэгдээгүй байна
            </p>
          ) : (
            dayAttendances.map((att) => (
              <div
                key={att.id}
                className="flex justify-between items-center text-xs py-2 px-3 bg-[var(--club-raised)] rounded-xl border border-zinc-800/60"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${att.status === "present" ? "bg-emerald-500" : att.status === "sick" ? "bg-amber-500" : "bg-red-500"}`} />
                  <span className="text-white font-semibold">
                    {att.memberName}
                  </span>
                  <span className="text-zinc-400 text-[11px]">
                    ({att.sessionTitle})
                  </span>
                </div>
                <span className="text-zinc-500 font-mono text-[11px]">
                  {attendanceLabels[att.status]} · {att.checkInTime}
                </span>
              </div>
            ))
          )}
        </div>
      </div>}
    </div>
  );
}
