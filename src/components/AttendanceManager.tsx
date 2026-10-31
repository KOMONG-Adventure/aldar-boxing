"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, Clock, Users, UserCheck, 
  Check, X, Search, ChevronLeft, ChevronRight, 
  Sparkles, CheckCircle2, AlertCircle, Dumbbell, 
  Trash2, Plus, Filter, UserX
} from "lucide-react";
import { SessionItem, Member, AttendanceRecord } from "@/lib/db";
import AddSessionModal from "./AddSessionModal";

interface AttendanceManagerProps {
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
}: AttendanceManagerProps) {
  // Огноо
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [todayStr, setTodayStr] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions[0]?.id || ""
  );
  const [searchMember, setSearchMember] = useState("");
  const [activeView, setActiveView] = useState<"enrolled" | "all">("enrolled");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
    setTodayStr(today);
  }, []);

  useEffect(() => {
    if (!selectedSessionId && sessions.length > 0) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  // Сонгогдсон анги
  const currentSession = sessions.find((s) => s.id === selectedSessionId) || sessions[0];

  // Тухайн өдөр, тухайн ангийн ирцүүд
  const dayAttendances = attendances.filter(
    (a) => a.date === selectedDate && (!selectedSessionId || a.sessionId === selectedSessionId)
  );

  const attendedMemberIds = dayAttendances.map((a) => a.memberId);

  // Огноо нааш цааш шилжүүлэх
  const changeDateByDays = (days: number) => {
    if (!selectedDate) return;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === todayStr && todayStr !== "";

  // Ирц тэмдэглэх эсвэл цуцлах
  const handleToggleAttendance = async (memberId: string) => {
    if (!currentSession) return;
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSession.id,
          memberId,
          date: selectedDate,
          action: "TOGGLE",
        }),
      });
      onRefresh();
    } catch (e) {
      alert("Ирц бүртгэхэд алдаа гарлаа");
    }
  };

  // "Бүгдийг ирсэн болгох" (Mark All Present)
  const handleMarkAllPresent = async () => {
    if (!currentSession) return;
    const enrolledIds = currentSession.enrolledMemberIds || [];
    const toCheckIn = enrolledIds.filter((id) => !attendedMemberIds.includes(id));
    
    if (toCheckIn.length === 0) return;

    for (const memberId of toCheckIn) {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSession.id,
          memberId,
          date: selectedDate,
          action: "CHECKIN",
        }),
      });
    }
    onRefresh();
  };

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
    currentSession?.enrolledMemberIds?.includes(m.id)
  );

  const displayList = (activeView === "enrolled" ? enrolledList : members).filter((m) =>
    `${m.lastName || ""} ${m.name}`.toLowerCase().includes(searchMember.toLowerCase()) ||
    m.phone.includes(searchMember)
  );

  // Ирцийн хувь
  const attendedCount = enrolledList.filter((m) => attendedMemberIds.includes(m.id)).length;
  const attendanceRate = enrolledList.length > 0 
    ? Math.round((attendedCount / enrolledList.length) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      
      {/* 1. ОГНОО СОНГОХ СЭЛГЭГЧ (Date Switcher - Gymdesk style) */}
      <div className="bg-[#121215] border border-zinc-800 rounded-3xl p-3 sm:p-4 flex items-center justify-between shadow-lg">
        <button
          onClick={() => changeDateByDays(-1)}
          className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
          title="Өмнөх өдөр"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-2 text-center">
          <CalendarIcon size={18} className="text-red-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-white font-bold text-sm sm:text-base cursor-pointer focus:outline-none border-b border-transparent hover:border-zinc-700"
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
          <AddSessionModal onSessionAdded={onRefresh} members={members} />
        </div>

        {sessions.length === 0 ? (
          <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-xs">
            Бэлтгэлийн хуваарь үүсгээгүй байна. Дээрх "+ Анги үүсгэх" товчоор нэмнэ үү.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {sessions.map((s) => {
              const isSelected = s.id === currentSession?.id;
              // Энэ өдөр тухайн ангид ирсэн тоо
              const sCount = attendances.filter(
                (a) => a.date === selectedDate && a.sessionId === s.id
              ).length;
              const totalEnrolled = s.enrolledMemberIds?.length || 0;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative ${
                    isSelected
                      ? "bg-gradient-to-br from-red-950/40 via-[#18181c] to-[#121215] border-red-500 shadow-md shadow-red-950/40"
                      : "bg-[#121215] border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-white truncate max-w-[150px]">{s.title}</span>
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

                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-red-400 font-semibold">{s.time}</span>
                    <span className="text-zinc-400 font-medium">
                      Ирц: <b className="text-white">{sCount}</b> / {totalEnrolled}
                    </span>
                  </div>

                  <p className="text-[10px] text-zinc-500 mt-1 truncate">
                    {s.coach} • {s.dayOfWeek}
                    {s.startDate && (
                      <span className="text-zinc-400 block mt-0.5 font-normal">
                        Хугацаа: {s.startDate} {s.endDate ? `~ ${s.endDate}` : "эхлэн"}
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
      {currentSession && (
        <div className="bg-[#121215] border border-zinc-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-xl">
          
          {/* Ангийн толгой ба Статистик прогресс */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">{currentSession.title}</h3>
                <span className="text-[11px] bg-red-600/20 text-red-400 px-2 py-0.5 rounded-lg border border-red-500/30 font-bold">
                  {currentSession.time}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Дасгалжуулагч: {currentSession.coach} • Багтаамж: {currentSession.capacity}
              </p>
            </div>

            {/* Ирцийн хувь прогресс бар */}
            <div className="flex items-center gap-3 bg-[#18181c] px-3.5 py-2 rounded-2xl border border-zinc-800 shrink-0">
              <div>
                <div className="flex justify-between text-[11px] gap-4">
                  <span className="text-zinc-400">Ирцийн хувь</span>
                  <span className="font-bold text-white">{attendedCount}/{enrolledList.length} ({attendanceRate}%)</span>
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
                title="Бүртгэлтэй бүх сурагчдыг 1 товшилтоор ирсэнд тооцох"
                className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1 active:scale-95"
              >
                <CheckCircle2 size={14} /> Бүгд ирсэн
              </button>
            </div>
          </div>

          {/* Хайлт ба Табууд: (Энэ ангийнхан / Бүх сурагчид) */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-zinc-500" size={15} />
              <input
                type="text"
                placeholder="Сурагчийн нэр, утсаар хайх..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                className="w-full bg-[#18181c] border border-zinc-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-1.5 bg-[#18181c] p-1 rounded-xl border border-zinc-800 text-xs shrink-0">
              <button
                onClick={() => setActiveView("enrolled")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeView === "enrolled"
                    ? "bg-red-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Бүртгэлтэй ({enrolledList.length})
              </button>
              <button
                onClick={() => setActiveView("all")}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeView === "all"
                    ? "bg-red-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Бүх сурагчид ({members.length})
              </button>
            </div>
          </div>

          {/* СУРАГЧДЫН ИРЦ АВАХ БОДИТ ЖАГСААЛТ (One-Tap Attendance Rows) */}
          <div className="space-y-2">
            {displayList.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-xs bg-[#18181c] rounded-2xl border border-zinc-800/80">
                Сурагч олдсонгүй. "Бүх сурагчид" табыг сонгож эсвэл "Шинэ гишүүн" нэмнэ үү.
              </div>
            ) : (
              displayList.map((m) => {
                const isAttended = attendedMemberIds.includes(m.id);
                const isPaid = m.status === "PAID";
                const isExpired = new Date(m.expireDate) < new Date();
                const attRecord = dayAttendances.find((a) => a.memberId === m.id);

                return (
                  <div
                    key={m.id}
                    onClick={() => handleToggleAttendance(m.id)}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group select-none ${
                      isAttended
                        ? "bg-emerald-950/20 border-emerald-500/50 hover:bg-emerald-950/30"
                        : "bg-[#18181c] border-zinc-800/80 hover:border-zinc-700"
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
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition ${
                          isAttended 
                            ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30" 
                            : "bg-gradient-to-br from-zinc-750 to-zinc-800 text-zinc-300 border border-zinc-700/60 group-hover:border-zinc-500"
                        }`}>
                          {m.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-xs sm:text-sm truncate ${
                            isAttended ? "text-white" : "text-zinc-200"
                          }`}>
                            {m.lastName ? `${m.lastName} ` : ""}{m.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                            {m.level}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                          <span>📞 {m.phone}</span>
                          <span>•</span>
                          <span className={`${
                            isPaid && !isExpired ? "text-emerald-400" : "text-red-400 font-semibold"
                          }`}>
                            {isPaid && !isExpired ? "Төлбөр OK" : "Төлбөр дууссан"}
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

                      <button
                        type="button"
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md ${
                          isAttended
                            ? "bg-emerald-600 text-white shadow-emerald-600/30"
                            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
                        }`}
                      >
                        {isAttended ? (
                          <>
                            <Check size={14} strokeWidth={3} /> ИРСЭН
                          </>
                        ) : (
                          <>
                            <UserCheck size={14} /> ИРЦ АВАХ
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. СҮҮЛД БҮРТГЭГДСЭН ИРЦИЙН ЖАГСААЛТ (History Feed) */}
      <div className="bg-[#121215] border border-zinc-800 rounded-3xl p-4">
        <h4 className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-1.5">
          <Clock size={14} className="text-red-500" /> {selectedDate} өдрийн бүртгэгдсэн ирцийн бүртгэл
        </h4>
        <div className="space-y-1.5">
          {dayAttendances.length === 0 ? (
            <p className="text-zinc-500 text-xs text-center py-4">Энэ өдөр ирц бүртгэгдээгүй байна</p>
          ) : (
            dayAttendances.map((att) => (
              <div
                key={att.id}
                className="flex justify-between items-center text-xs py-2 px-3 bg-[#18181c] rounded-xl border border-zinc-800/60"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-white font-semibold">{att.memberName}</span>
                  <span className="text-zinc-400 text-[11px]">({att.sessionTitle})</span>
                </div>
                <span className="text-zinc-500 font-mono text-[11px]">{att.checkInTime}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
