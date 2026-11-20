"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import AddMemberModal from "@/components/AddMemberModal";
import RegistrationLink from "@/components/RegistrationLink";
import TeacherControls from "@/components/TeacherControls";
import AppearanceControl from "@/components/AppearanceControl";
import NotificationsModal from "@/components/NotificationsModal";
import SettingsModal from "@/components/SettingsModal";
import MemberDetailModal from "@/components/MemberDetailModal";
import AttendanceManager from "@/components/AttendanceManager";
import PaymentOverview from "@/components/PaymentOverview";
import FinanceManager from "@/components/FinanceManager";
import * as XLSX from "xlsx";
import { studentPaymentState } from "@/lib/billing";
import { 
  Users, Calendar, CreditCard, Search,
  Trash2, CheckCircle2, AlertCircle, Clock,
  RefreshCw, ChevronRight, UserCheck,
  FileSpreadsheet, QrCode, DollarSign, Trophy
} from "lucide-react";
import { Member, SessionItem, AttendanceRecord, AppNotification, AppSettings, FinancialLog } from "@/lib/db";

export default function Home({ canManageFinance }: { canManageFinance: boolean }) {
  const [activeTab, setActiveTab] = useState<"members" | "schedule" | "billing" | "finance">("members");
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
        canManageFinance ? fetch("/api/settings") : null,
        canManageFinance ? fetch("/api/financials") : null
      ]);
      if ([membersRes, attRes, settRes, finRes].some(response => response?.status === 401)) {
        window.location.replace("/bagsh");
        return;
      }
      if ([attRes, settRes, finRes].some(response => response && !response.ok)) {
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
      if (settRes?.ok) {
        const settData = await settRes.json();
        setNotifications(settData.notifications || []);
        if (settData.settings) setSettings(settData.settings);
      }
      if (finRes?.ok) {
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
      "Төлбөрийн төлөв": (canManageFinance ? ["active", "expiring"].includes(studentPaymentState(m).kind) : m.status === "PAID") ? "Төлсөн" : "Төлөөгүй",
      ...(canManageFinance ? { "Эхэлсэн огноо": m.paymentDate, "Дуусах огноо": m.expireDate } : {}),
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
    const paid = (canManageFinance ? ["active", "expiring"].includes(studentPaymentState(m).kind) : m.status === "PAID");
    const fullName = `${m.lastName || ""} ${m.name}`.toLowerCase();
    const matchesQuery = fullName.includes(searchQuery.toLowerCase()) || m.phone.includes(searchQuery);
    const matchesLevel = filterLevel === "all" || m.level === filterLevel;
    const matchesPayment = 
      filterPayment === "all" 
        ? true 
        : filterPayment === "paid" 
        ? paid
        : !paid;
    return matchesQuery && matchesLevel && matchesPayment;
  });

  const paidCount = members.filter(m => (canManageFinance ? ["active", "expiring"].includes(studentPaymentState(m).kind) : m.status === "PAID")).length;
  const unpaidCount = members.length - paidCount;

  return (
    <div className="min-h-screen bg-[var(--club-background)] text-zinc-100 font-sans selection:bg-red-600 selection:text-white pb-24 lg:pb-8">
      
      {/* --- TOP HEADER --- */}
      <header className="sticky top-0 z-40 bg-[var(--club-background)]/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3">
        <div className="max-w-screen-xl mx-auto flex flex-wrap items-center justify-between gap-y-2">
          
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Image src="/aldar-club-logo.webp" width={44} height={44} alt="" unoptimized
              className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain" />
            <div className="min-w-0">
              <h1 className="truncate text-sm sm:text-base font-extrabold tracking-tight text-white">
                {settings.clubName}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0 sm:gap-2">
            <AppearanceControl />
            {canManageFinance && <TeacherControls action="invite" compact />}
            <TeacherControls action="logout" />
            <button
              onClick={fetchAllData}
              title="Шинэчлэх"
              className="p-2.5 rounded-2xl bg-[var(--club-panel)] border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
            >
              <RefreshCw size={17} className={loading ? "animate-spin text-red-500" : ""} />
            </button>
            {canManageFinance && <NotificationsModal
              notifications={notifications} 
              onRefresh={fetchAllData} 
            />}
            {canManageFinance && <SettingsModal
              settings={settings} 
              onRefresh={fetchAllData} 
              disabled={loading || !!memberLoadError}
            />}
          </div>

        </div>
      </header>

      {/* --- MAIN BODY --- */}
      <main className="club-content mx-auto w-full max-w-3xl space-y-5 px-4 pt-5 sm:px-6 lg:max-w-none lg:px-10 lg:pt-8">
        {memberLoadError && <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{memberLoadError}</p>}
        
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-5">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {{ members: "Сурагчид", schedule: "Хуваарь ба ирц", billing: "Төлбөрийн хяналт", finance: "Санхүү" }[activeTab]}
          </h2>
          {activeTab === "members" && <AddMemberModal canManageFinance={canManageFinance} onMemberAdded={fetchAllData} />}
        </div>
        {activeTab === "members" && (
          <dl className="grid grid-cols-3 overflow-hidden rounded-2xl border border-zinc-800 bg-[var(--club-panel)] divide-x divide-zinc-800">
            {[
              ["Нийт сурагч", members.length, "text-white"],
              ["Төлсөн", paidCount, "text-emerald-400"],
              ["Төлөөгүй", unpaidCount, "text-amber-300"],
            ].map(([label, count, color]) => (
              <div key={label} className="p-3 sm:p-5">
                <dt className="text-xs text-zinc-400">{label}</dt>
                <dd className={`mt-2 text-2xl font-semibold tabular-nums sm:text-3xl ${color}`}>{loading ? "—" : count}</dd>
              </div>
            ))}
          </dl>
        )}
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
            <RegistrationLink />
            {/* Хайлт ба Экспорт */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 text-zinc-500" size={16} />
                <input
                  type="text"
                  placeholder="Овог, нэр эсвэл утсаар хайх..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--club-panel)] border border-zinc-800 rounded-2xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                />
              </div>
              
              <button
                onClick={exportToExcel}
                title="Excel татах"
                className="px-3 py-2.5 bg-[var(--club-raised)] hover:bg-zinc-800 border border-zinc-700/80 rounded-2xl text-xs font-semibold text-zinc-300 flex items-center gap-1.5 transition shrink-0"
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
                  filterPayment === "all" ? "bg-zinc-800 border-zinc-600 text-white font-bold" : "bg-[var(--club-panel)] border-zinc-800 text-zinc-400"
                }`}
              >
                Бүгд ({members.length})
              </button>
              <button
                onClick={() => setFilterPayment("paid")}
                className={`px-3 py-1.5 rounded-xl border transition shrink-0 ${
                  filterPayment === "paid" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold" : "bg-[var(--club-panel)] border-zinc-800 text-zinc-400"
                }`}
              >
                Төлсөн ({paidCount})
              </button>
              <button
                onClick={() => setFilterPayment("unpaid")}
                className={`px-3 py-1.5 rounded-xl border transition shrink-0 ${
                  filterPayment === "unpaid" ? "bg-red-500/20 border-red-500 text-red-400 font-bold" : "bg-[var(--club-panel)] border-zinc-800 text-zinc-400"
                }`}
              >
                Төлөөгүй ({unpaidCount})
              </button>

              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="bg-[var(--club-panel)] border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-red-500 shrink-0"
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
                <div className="text-center py-12 bg-[var(--club-panel)] rounded-3xl border border-zinc-800/80 text-zinc-500 text-xs">
                  Сурагч олдсонгүй. Дээрх <b className="text-red-500">+ Шинэ гишүүн</b> товчоор шинээр нэмнэ үү.
                </div>
              ) : (
                filteredMembers.map((m) => {
                  const paymentState = studentPaymentState(m);
                  const isPaid = canManageFinance ? paymentState.kind === "active" || paymentState.kind === "expiring" : m.status === "PAID";
                  const isExpired = canManageFinance && paymentState.kind === "expired";
                  const fights = m.fights || [];
                  const wins = fights.filter(f => f.result === "WIN").length;
                  const losses = fights.filter(f => f.result === "LOSS").length;

                  return (
                    <div
                      key={m.id}
                      className="member-list-card bg-[var(--club-panel)] hover:bg-[var(--club-raised)] transition border border-zinc-800/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 group"
                    >
                      <div 
                        onClick={() => setSelectedMember(m)}
                        className="member-list-identity flex items-center gap-3 min-w-0 cursor-pointer flex-1 basis-36"
                      >
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            alt={m.name}
                            className="member-list-avatar w-11 h-11 rounded-2xl object-cover border border-zinc-700/80 shrink-0 group-hover:border-red-500/60 transition"
                          />
                        ) : (
                          <div className="member-list-avatar w-11 h-11 rounded-2xl bg-zinc-800/90 border border-zinc-700/60 flex items-center justify-center font-bold text-white text-sm shrink-0 group-hover:border-red-500/60 transition">
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

                      <div className="member-list-actions ml-auto flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => { setMemberTab("card"); setSelectedMember(m); }}
                          className="p-1.5 bg-zinc-800/70 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-zinc-700/50 transition"
                          title="QR Үнэмлэх & Тулааны түүх"
                        >
                          <QrCode size={15} />
                        </button>

                        <button
                          disabled={!canManageFinance}
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
                        
                        {canManageFinance && <button
                          onClick={() => handleDeleteMember(m.id, m.name)}
                          className="p-1.5 text-zinc-500 hover:text-red-400 transition rounded-lg hover:bg-zinc-800"
                          title="Устгах"
                        >
                          <Trash2 size={16} />
                        </button>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Төлбөрийн хугацааны хяналт */}
        {canManageFinance && activeTab === "billing" && (
          <PaymentOverview members={members} loading={loading} onPayment={member => { setMemberTab("payments"); setSelectedMember(member); }} />
        )}

        {/* --- ТАБ 4: САНХҮҮ & ТӨЛБӨРИЙН КАСС --- */}
        {canManageFinance && activeTab === "finance" && (
          <FinanceManager 
            financials={financials} 
            monthlyFee={settings.monthlyFee}
            onRefresh={fetchAllData}
          />
        )}

      </main>

      <nav aria-label="Үндсэн цэс" className="club-navigation">
        {([
          { id: "members", label: "Сурагчид", icon: Users, admin: false },
          { id: "schedule", label: "Хуваарь ба ирц", icon: Calendar, admin: false },
          { id: "billing", label: "Төлбөр", icon: CreditCard, admin: true },
          { id: "finance", label: "Санхүү", icon: DollarSign, admin: true },
        ] as const).filter(item => !item.admin || canManageFinance).map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-current={activeTab === id ? "page" : undefined} onClick={() => setActiveTab(id)}>
            <Icon size={20} /><span>{label}</span>
          </button>
        ))}
      </nav>
      {/* Сурагчийн дэлгэрэнгүй & QR Pass & Тулааны түүх модаль цонх */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          canManageFinance={canManageFinance}
          initialTab={memberTab}
          members={members}
          onClose={() => { setSelectedMember(null); setMemberTab("profile"); }}

          onRefresh={fetchAllData}
        />
      )}
    </div>
  );
}
