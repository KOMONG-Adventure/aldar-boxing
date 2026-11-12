"use client";

import React, { useEffect, useState } from "react";
import AddMemberModal from "@/components/AddMemberModal";
import NotificationsModal from "@/components/NotificationsModal";
import SettingsModal from "@/components/SettingsModal";
import MemberDetailModal from "@/components/MemberDetailModal";
import AttendanceManager from "@/components/AttendanceManager";
import BoxingTimer from "@/components/BoxingTimer";
import FinanceManager from "@/components/FinanceManager";
import * as XLSX from "xlsx";
import { 
  Users, Calendar, CreditCard, Dumbbell, Search, 
  Trash2, CheckCircle2, AlertCircle, Clock, 
  Sparkles, RefreshCw, ChevronRight, UserCheck,
  FileSpreadsheet, QrCode, Timer, DollarSign, Trophy
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
    clubName: "CHAMPION BOXING",
    coachName: "Мастер Болд",
    monthlyFee: 150000,
    gymOpenTime: "07:00",
    gymCloseTime: "22:00",
    smsNotification: true,
    currency: "₮"
  });

  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
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

      if (membersRes.ok) {
        const memData = await membersRes.json();
        setMembers(memData);
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
      if (res.ok) {
        setMembers(members.filter((m) => m.id !== id));
        if (selectedMember?.id === id) setSelectedMember(null);
      }
    } catch (err) {
      alert("Устгахад алдаа гарлаа");
    }
  };

  // Төлбөрийн статус өөрчлөх
  const handleTogglePayment = async (member: Member) => {
    const nextStatus: "PAID" | "UNPAID" = member.status === "PAID" ? "UNPAID" : "PAID";
    const nextExpire = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    try {
      const res = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: member.id,
          status: nextStatus,
          paymentDate: nextStatus === "PAID" ? today : member.paymentDate,
          expireDate: nextStatus === "PAID" ? nextExpire : member.expireDate,
        }),
      });
      if (res.ok) {
        const updated: Member[] = members.map((m) => 
          m.id === member.id 
            ? { ...m, status: nextStatus, expireDate: nextStatus === "PAID" ? nextExpire : m.expireDate } 
            : m
        );
        setMembers(updated);
        if (selectedMember?.id === member.id) {
          setSelectedMember({ ...selectedMember, status: nextStatus, expireDate: nextStatus === "PAID" ? nextExpire : selectedMember.expireDate });
        }
        fetchAllData();
      }
    } catch (err) {
      alert("Төлөв солиход алдаа гарлаа");
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

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-red-600 selection:text-white pb-24">
      
      {/* --- TOP HEADER --- */}
      <header className="sticky top-0 z-40 bg-[#0c0c0e]/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center shadow-md shadow-red-600/30">
              <Dumbbell className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                {settings.clubName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAllData}
              title="Шинэчлэх"
              className="p-2.5 rounded-2xl bg-[#141416] border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
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
            />
          </div>

        </div>
      </header>

      {/* --- MAIN BODY --- */}
      <main className="max-w-2xl mx-auto w-full px-4 pt-4 flex-1 space-y-4">
        {memberLoadError && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{memberLoadError}</p>}
        
        {/* Картууд: Статистик */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#121215] border border-zinc-800/90 rounded-2xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-zinc-400">Нийт сурагч</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-white">{members.length}</span>
              <span className="text-[10px] text-zinc-500">хүн</span>
            </div>
          </div>
          <div className="bg-[#121215] border border-emerald-950/40 rounded-2xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-emerald-400/80">Төлсөн</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-emerald-400">{paidCount}</span>
              <span className="text-[10px] text-emerald-500/60">гишүүн</span>
            </div>
          </div>
          <div className="bg-[#121215] border border-red-950/40 rounded-2xl p-3 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-red-400/80">Төлөөгүй</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-red-400">{unpaidCount}</span>
              <span className="text-[10px] text-red-500/60">гишүүн</span>
            </div>
          </div>
        </div>

        {/* Шинэ гишүүн нэмэх үндсэн улаан товчлуурын хэсэг */}
        <div className="bg-gradient-to-r from-[#17171c] to-[#121215] border border-zinc-800 rounded-3xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={13} /> Сурагчийн бүртгэл
            </span>
            <h2 className="text-base font-bold text-white mt-0.5">Шинэ сурагч бүртгэх</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Хувийн мэдээлэл, профайл зураг</p>
          </div>
          <div className="flex-shrink-0 pl-2">
            <AddMemberModal onMemberAdded={fetchAllData} />
          </div>
        </div>

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
            {/* Хайлт ба Экспорт */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 text-zinc-500" size={16} />
                <input
                  type="text"
                  placeholder="Овог, нэр эсвэл утсаар хайх..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#121215] border border-zinc-800 rounded-2xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>
              
              <button
                onClick={exportToExcel}
                title="Excel татах"
                className="px-3 py-2.5 bg-[#17171c] hover:bg-zinc-800 border border-zinc-700/80 rounded-2xl text-xs font-semibold text-zinc-300 flex items-center gap-1.5 transition shrink-0"
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
                  filterPayment === "all" ? "bg-zinc-800 border-zinc-600 text-white font-bold" : "bg-[#121215] border-zinc-800 text-zinc-400"
                }`}
              >
                Бүгд ({members.length})
              </button>
              <button
                onClick={() => setFilterPayment("paid")}
                className={`px-3 py-1.5 rounded-xl border transition shrink-0 ${
                  filterPayment === "paid" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold" : "bg-[#121215] border-zinc-800 text-zinc-400"
                }`}
              >
                Төлсөн ({paidCount})
              </button>
              <button
                onClick={() => setFilterPayment("unpaid")}
                className={`px-3 py-1.5 rounded-xl border transition shrink-0 ${
                  filterPayment === "unpaid" ? "bg-red-500/20 border-red-500 text-red-400 font-bold" : "bg-[#121215] border-zinc-800 text-zinc-400"
                }`}
              >
                Төлөөгүй ({unpaidCount})
              </button>

              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="bg-[#121215] border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-red-500 shrink-0"
              >
                <option value="all">Бүх түвшин</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Fighter">Fighter</option>
              </select>
            </div>

            {/* Гишүүдийн жагсаалт */}
            <div className="space-y-2">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-12 bg-[#121215] rounded-3xl border border-zinc-800/80 text-zinc-500 text-xs">
                  Сурагч олдсонгүй. Дээрх <b className="text-red-500">"+" Шинэ гишүүн</b> товчоор шинээр нэмнэ үү.
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
                      className="bg-[#121215] hover:bg-[#16161a] transition border border-zinc-800/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 group"
                    >
                      <div 
                        onClick={() => setSelectedMember(m)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                      >
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            alt={m.name}
                            className="w-11 h-11 rounded-2xl object-cover border border-zinc-700/80 shrink-0 group-hover:border-red-500/60 transition"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-zinc-800/90 border border-zinc-700/60 flex items-center justify-center font-bold text-white text-sm shrink-0 group-hover:border-red-500/60 transition">
                            {m.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white truncate">
                              {m.lastName ? `${m.lastName} ` : ""}{m.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium">
                              {m.level}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                            <span>📞 {m.phone}</span>
                            <span>•</span>
                            <span className="text-zinc-500">Нийт ирц: {m.attendancesCount || 0}</span>
                            {fights.length > 0 && (
                              <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                                🏆 {wins}W - {losses}L
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setSelectedMember(m)}
                          className="p-1.5 bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700/50 transition"
                          title="QR Үнэмлэх & Тулааны түүх"
                        >
                          <QrCode size={15} />
                        </button>

                        <button
                          onClick={() => handleTogglePayment(m)}
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0c0e]/95 backdrop-blur-lg border-t border-zinc-800/80 py-2.5 px-4 sm:px-6">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === "schedule" ? "text-red-500 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Calendar size={20} />
            <span className="text-[10px]">Хуваарь & Ирц</span>
          </button>

          <button
            onClick={() => setActiveTab("members")}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === "members" ? "text-red-500 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Users size={20} />
            <span className="text-[10px]">Сурагчид</span>
          </button>

          <button
            onClick={() => setActiveTab("timer")}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === "timer" ? "text-red-500 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Timer size={20} />
            <span className="text-[10px]">Раунд Таймер</span>
          </button>

          <button
            onClick={() => setActiveTab("finance")}
            className={`flex flex-col items-center gap-1 transition ${
              activeTab === "finance" ? "text-red-500 font-bold" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <DollarSign size={20} />
            <span className="text-[10px]">Санхүү & Касс</span>
          </button>
        </div>
      </nav>

      {/* Сурагчийн дэлгэрэнгүй & QR Pass & Тулааны түүх модаль цонх */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onTogglePayment={handleTogglePayment}
          onRefresh={fetchAllData}
        />
      )}
    </div>
  );
}
