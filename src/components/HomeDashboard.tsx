"use client";

import React, { useEffect, useState } from "react";
import AddMemberModal from "@/components/AddMemberModal";
import RegistrationLink from "@/components/RegistrationLink";
import TeacherControls from "@/components/TeacherControls";
import NotificationsModal from "@/components/NotificationsModal";
import SettingsModal from "@/components/SettingsModal";
import MemberDetailModal from "@/components/MemberDetailModal";
import AttendanceManager from "@/components/AttendanceManager";
import BoxingTimer from "@/components/BoxingTimer";
import FinanceManager from "@/components/FinanceManager";
import * as XLSX from "xlsx";
import { billingToday } from "@/lib/billing";
import { 
  Users, Calendar, Search, Trash2, CheckCircle2, AlertCircle,
  RefreshCw, FileSpreadsheet, QrCode, Timer, DollarSign
} from "lucide-react";
import { Member, SessionItem, AttendanceRecord, AppNotification, AppSettings, FinancialLog } from "@/lib/db";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"members" | "schedule" | "timer" | "finance">("members");
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [financials, setFinancials] = useState<FinancialLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    clubName: "ALDAR BOXING CLUB",
    coachName: "",
    monthlyFee: 100000,
    gymOpenTime: "07:00",
    gymCloseTime: "22:00",
    smsNotification: false,
    currency: "₮"
  });

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberTab, setMemberTab] = useState<"profile" | "payments" | "card">("profile");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterPayment, setFilterPayment] = useState<"all" | "paid" | "unpaid">("all");
  const [loading, setLoading] = useState(true);
  const [memberLoadError, setMemberLoadError] = useState("");

  // Бүх өгөгдлийг татах
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setMemberLoadError("");
      const [membersRes, attRes, settRes, finRes] = await Promise.all([
        fetch("/api/members"),
        fetch("/api/attendance"),
        fetch("/api/settings"),
        fetch("/api/financials")
      ]);
      if ([membersRes, attRes, settRes, finRes].some(response => response.status === 401)) {
        window.location.replace("/bagsh");
        return;
      }
      if ([attRes, settRes, finRes].some(response => !response.ok)) {
        throw new Error("Мэдээлэл шинэчлэхэд алдаа гарлаа.");
      }

      if (membersRes.ok) {
        const memData = await membersRes.json();
        setMembers(memData);
        setSelectedMember(current => current ? memData.find((item: Member) => item.id === current.id) || null : null);
      } else {
        const errorData = await membersRes.json().catch(() => null);
        setMemberLoadError(errorData?.error || "Сурагчдын бүртгэлтэй холбогдож чадсангүй. Дахин шинэчилнэ үү.");
      }
      if (attRes.ok) {
        const attData = await attRes.json();
        setSessions(attData.sessions || []);
        setAttendances(attData.allAttendances || attData.attendances || []);
      }
      if (settRes.ok) {
        const settData = await settRes.json();
        setNotifications(settData.notifications || []);
        if (settData.settings) setSettings(settData.settings);
      }
      if (finRes.ok) {
        const finData = await finRes.json();
        setFinancials(finData);
      }
    } catch (e) {
      console.error(e);
      setMemberLoadError("Сурагчдын бүртгэл татахад алдаа гарлаа. Дахин шинэчилнэ үү.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The initial data request also updates loading and error feedback.
    fetchAllData();
  }, []);

  // Excel тайлан татах функц
  const exportToExcel = () => {
    const dataToExport = members.map((m, idx) => ({
      "№": idx + 1,
      "Овог": m.lastName || "",
      "Нэр": m.name,
      "Утас": m.phone,
      "Регистр": m.registerNumber || "",
      "Хүйс": m.gender,
      "Түвшин": m.level,
      "Жин /кг/": m.weight || "",
      "Өндөр /см/": m.height || "",
      "Цусны бүлэг": m.bloodType || "",
      "Дүүрэг": m.district || "",
      "Төлбөрийн төлөв": m.status === "PAID" ? "Төлсөн" : "Төлөөгүй",
      "Эхэлсэн огноо": m.paymentDate,
      "Дуусах огноо": m.expireDate,
      "Ирцийн тоо": m.attendancesCount || 0,
      "Тулааны рекорд": `${m.fights?.filter(f => f.result === 'WIN').length || 0}W - ${m.fights?.filter(f => f.result === 'LOSS').length || 0}L`,
      "Асран хамгаалагч": m.guardians?.map(g => `${g.name} (${g.relation} - ${g.phone})`).join("; ") || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Гишүүдийн бүртгэл");
    XLSX.writeFile(workbook, `Boxing_Club_Members_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Сурагч устгах
  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`"${name}" сурагчийн бүртгэлийг системээс бүрэн устгах уу?`)) return;
    try {
      const res = await fetch(`/api/members?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Устгах боломжгүй байна.");
      if (res.ok) {
        setMembers(members.filter((m) => m.id !== id));
        if (selectedMember?.id === id) setSelectedMember(null);
      }
    } catch (err) {
      alert("Устгахад алдаа гарлаа");
    }
  };

  const filteredMembers = members.filter((m) => {
    const fullName = `${m.lastName || ""} ${m.name}`.toLowerCase();
    const matchesQuery = fullName.includes(searchQuery.toLowerCase()) || m.phone.includes(searchQuery);
    const matchesLevel = filterLevel === "all" || m.level === filterLevel;
    const matchesPayment = 
      filterPayment === "all" 
        ? true 
        : filterPayment === "paid" 
        ? m.status === "PAID" 
        : m.status === "UNPAID";
    return matchesQuery && matchesLevel && matchesPayment;
  });

  const paidCount = members.filter((m) => m.status === "PAID").length;
  const unpaidCount = members.filter((m) => m.status === "UNPAID").length;
  const today = billingToday();
  const [, month, day] = today.split("-");
  const weekday = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"][new Date(`${today}T00:00:00Z`).getUTCDay()];

  return (
    <div className="min-h-screen bg-[#101210] text-zinc-100 flex flex-col font-sans selection:bg-red-600 selection:text-white pb-24">
      
      {/* --- TOP HEADER --- */}
      <header className="sticky top-0 z-40 bg-[#101210]/90 backdrop-blur-md border-b border-zinc-800/80 px-5 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="w-9 h-9 shrink-0 rounded-lg border border-red-500/40 bg-red-600/10 flex items-center justify-center">
              <span className="text-lg font-bold tracking-tighter text-red-400">A</span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm sm:text-base font-bold tracking-tight text-white">
                {settings.clubName}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0 sm:gap-2">
            <TeacherControls />
            <button
              onClick={fetchAllData}
              title="Шинэчлэх"
              className="p-2.5 rounded-xl bg-[#181b18] border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
            >
              <RefreshCw size={17} className={loading ? "animate-spin text-red-500" : ""} />
            </button>
            <NotificationsModal 
              notifications={notifications} 
              onRefresh={fetchAllData} 
            />
            <SettingsModal 
              settings={settings} 
              onRefresh={fetchAllData} 
              disabled={loading || !!memberLoadError}
            />
          </div>

        </div>
      </header>

      {/* --- MAIN BODY --- */}
      <main className="max-w-5xl mx-auto w-full px-5 sm:px-8 pt-4 flex-1 space-y-6">
        {memberLoadError && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{memberLoadError}</p>}
        
        <section className="border-b border-zinc-800 pb-6 pt-3 sm:pt-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">
                {{members: "Сурагчид", schedule: "Хуваарь, ирц", timer: "Раунд таймер", finance: "Санхүү"}[activeTab]}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {Number(month)} сарын {Number(day)} · {weekday}
              </p>
            </div>
            {activeTab === "members" && <AddMemberModal onMemberAdded={fetchAllData} />}
          </div>
          <dl className="mt-7 grid grid-cols-3 gap-4 divide-x divide-zinc-800">
            <div><dt className="text-xs text-zinc-400">Нийт сурагч</dt><dd className="mt-2 text-3xl font-medium tabular-nums tracking-tight">{loading ? "—" : members.length}</dd></div>
            <div className="pl-4"><dt className="text-xs text-zinc-400">Төлсөн</dt><dd className="mt-2 text-3xl font-medium tabular-nums tracking-tight text-emerald-400">{loading ? "—" : paidCount}</dd></div>
            <div className="pl-4"><dt className="text-xs text-zinc-400">Төлөөгүй</dt><dd className="mt-2 text-3xl font-medium tabular-nums tracking-tight text-red-400">{loading ? "—" : unpaidCount}</dd></div>
          </dl>
        </section>
        {/* --- ТАБ 1: ХУВААРЬ & ИРЦИЙН ШИНЭЧЛЭГДСЭН СИСТЕМ --- */}
        {activeTab === "schedule" && (
          <AttendanceManager
            sessions={sessions}
            members={members}
            attendances={attendances}
            onRefresh={fetchAllData}
          />
        )}

        {/* --- ТАБ 2: ГИШҮҮДИЙН ЖАГСААЛТ --- */}
        {activeTab === "members" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-medium text-zinc-300">Бүртгэлийн жагсаалт</h3><RegistrationLink /></div>
            {/* Хайлт ба Экспорт */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 text-zinc-500" size={16} />
                <input
                  type="text"
                  placeholder="Овог, нэр эсвэл утсаар хайх..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#181b18] border border-zinc-800 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>
              
              <button
                onClick={exportToExcel}
                title="Excel татах"
                className="px-3 py-2.5 bg-[#17171c] hover:bg-zinc-800 border border-zinc-700/80 rounded-xl text-xs font-semibold text-zinc-300 flex items-center gap-1.5 transition shrink-0"
              >
                <FileSpreadsheet size={16} className="text-emerald-400" />
                <span className="hidden sm:inline">Excel</span>
              </button>
            </div>

            {/* Шүүлтүүр */}
            <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                onClick={() => setFilterPayment("all")}
                className={`px-3 py-1.5 rounded-xl border transition shrink-0 ${
                  filterPayment === "all" ? "bg-zinc-800 border-zinc-600 text-white font-bold" : "bg-[#181b18] border-zinc-800 text-zinc-400"
                }`}
              >
                Бүгд ({members.length})
              </button>
              <button
                onClick={() => setFilterPayment("paid")}
                className={`px-3 py-1.5 rounded-xl border transition shrink-0 ${
                  filterPayment === "paid" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold" : "bg-[#181b18] border-zinc-800 text-zinc-400"
                }`}
              >
                Төлсөн ({paidCount})
              </button>
              <button
                onClick={() => setFilterPayment("unpaid")}
                className={`px-3 py-1.5 rounded-xl border transition shrink-0 ${
                  filterPayment === "unpaid" ? "bg-red-500/20 border-red-500 text-red-400 font-bold" : "bg-[#181b18] border-zinc-800 text-zinc-400"
                }`}
              >
                Төлөөгүй ({unpaidCount})
              </button>

              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="bg-[#181b18] border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-red-500 shrink-0"
              >
                <option value="all">Бүх түвшин</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Fighter">Fighter</option>
              </select>
            </div>

            {/* Гишүүдийн жагсаалт */}
            <div className="divide-y divide-zinc-800 border-y border-zinc-800">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-12 bg-[#181b18] rounded-2xl border border-zinc-800/80 text-zinc-500 text-xs">
                  {loading ? "Бүртгэл ачаалж байна…" : "Сурагч олдсонгүй. Хайлтаа өөрчлөх эсвэл сурагч нэмнэ үү."}
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const isPaid = m.status === "PAID";
                  const isExpired = new Date(m.expireDate) < new Date();
                  const fights = m.fights || [];
                  const wins = fights.filter(f => f.result === "WIN").length;
                  const losses = fights.filter(f => f.result === "LOSS").length;

                  return (
                    <div
                      key={m.id}
                      className="hover:bg-zinc-900/60 transition py-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-3 group"
                    >
                      <div 
                        onClick={() => setSelectedMember(m)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1 basis-[55%]"
                      >
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            alt={m.name}
                            className="w-11 h-11 rounded-xl object-cover border border-zinc-700/80 shrink-0 group-hover:border-red-500/60 transition"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-zinc-800/90 border border-zinc-700/60 flex items-center justify-center font-bold text-white text-sm shrink-0 group-hover:border-red-500/60 transition">
                            {m.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white truncate">
                              {m.lastName ? `${m.lastName} ` : ""}{m.name}
                            </span>
                            <span className="hidden sm:inline-flex text-[10px] text-zinc-400 font-medium">
                              {m.level}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                            <span className="tabular-nums">{m.phone}</span>
                            <span>•</span>
                            <span className="text-zinc-500">Ирц {m.attendancesCount || 0}</span>
                            {fights.length > 0 && (
                              <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                                 {wins}W - {losses}L
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="ml-auto flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => { setMemberTab("card"); setSelectedMember(m); }}
                          className="p-1.5 bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700/50 transition"
                          title="QR Үнэмлэх & Тулааны түүх"
                        >
                          <QrCode size={15} />
                        </button>

                        <button
                          onClick={() => { setMemberTab("payments"); setSelectedMember(m); }}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition flex items-center gap-1 ${
                            isPaid && !isExpired
                              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                              : "bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25"
                          }`}
                        >
                          {isPaid && !isExpired ? (
                            <>
                              <CheckCircle2 size={13} /> Төлсөн
                            </>
                          ) : (
                            <>
                              <AlertCircle size={13} /> {isExpired ? "Дууссан" : "Төлөөгүй"}
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteMember(m.id, m.name)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 transition rounded-lg hover:bg-zinc-800"
                          title="Устгах"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* --- ТАБ 3: БОКСЫН РАУНД ТАЙМЕР --- */}
        {activeTab === "timer" && (
          <BoxingTimer />
        )}

        {/* --- ТАБ 4: САНХҮҮ & ТӨЛБӨРИЙН КАСС --- */}
        {activeTab === "finance" && (
          <FinanceManager 
            financials={financials} 
            monthlyFee={settings.monthlyFee}
            onRefresh={fetchAllData}
          />
        )}

      </main>

      {/* --- МОБАЙЛ BOTTOM NAVIGATION BAR --- */}
      <nav className="dashboard-nav fixed bottom-0 left-0 right-0 z-40 bg-[#101210]/95 backdrop-blur-lg border-t border-zinc-800/80 py-2.5 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex justify-around items-center">
          <button
            onClick={() => setActiveTab("schedule")}
            aria-current={activeTab === "schedule" ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1.5 transition ${
              activeTab === "schedule" ? "text-red-500 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Calendar size={20} />
            <span className="text-[10px]">Хуваарь</span>
          </button>

          <button
            onClick={() => setActiveTab("members")}
            aria-current={activeTab === "members" ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1.5 transition ${
              activeTab === "members" ? "text-red-500 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Users size={20} />
            <span className="text-[10px]">Сурагчид</span>
          </button>

          <button
            onClick={() => setActiveTab("timer")}
            aria-current={activeTab === "timer" ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1.5 transition ${
              activeTab === "timer" ? "text-red-500 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Timer size={20} />
            <span className="text-[10px]">Таймер</span>
          </button>

          <button
            onClick={() => setActiveTab("finance")}
            aria-current={activeTab === "finance" ? "page" : undefined}
            className={`relative flex flex-col items-center gap-1.5 transition ${
              activeTab === "finance" ? "text-red-500 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <DollarSign size={20} />
            <span className="text-[10px]">Санхүү</span>
          </button>
        </div>
      </nav>

      {/* Сурагчийн дэлгэрэнгүй & QR Pass & Тулааны түүх модаль цонх */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          initialTab={memberTab}
          members={members}
          onClose={() => { setSelectedMember(null); setMemberTab("profile"); }}

          onRefresh={fetchAllData}
        />
      )}
    </div>
  );
}
