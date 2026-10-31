"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { 
  X, User, Phone, MapPin, HeartHandshake, Dumbbell, 
  Shield, Award, Calendar, CheckCircle2, QrCode, 
  Download, Printer, AlertCircle, Plus, Trophy, Flame,
  Edit3, Save, RotateCcw, Clock, CreditCard, Receipt, 
  Banknote, ArrowUpRight, History
} from "lucide-react";
import { Member, FightRecord, PaymentHistoryItem } from "@/lib/db";

interface MemberDetailModalProps {
  member: Member;
  onClose: () => void;
  onTogglePayment: (member: Member) => void;
  onRefresh: () => void;
}

export default function MemberDetailModal({ member, onClose, onTogglePayment, onRefresh }: MemberDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "payments" | "card" | "fights">("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showAddFight, setShowAddFight] = useState(false);

  // Шинэ төлбөр бүртгэх модал/хэсэг
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: 150000,
    periodMonths: 1,
    startDate: "",
    expireDate: "",
    method: "Дансаар (Хаан банк)",
    note: "",
  });

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setPaymentFormData((prev) => ({
      ...prev,
      startDate: prev.startDate || today,
      expireDate: prev.expireDate || nextMonth,
    }));
  }, []);

  // Засах өгөгдлийн төлөв
  const [editForm, setEditForm] = useState({
    lastName: member.lastName || "",
    name: member.name || "",
    phone: member.phone || "",
    level: member.level || "Beginner",
    gender: member.gender || "Эрэгтэй",
    birthDate: member.birthDate || "",
    registerNumber: member.registerNumber || "",
    joinedDate: member.joinedDate || "",
    weight: member.weight || "",
    height: member.height || "",
    bloodType: member.bloodType || "",
    district: member.district || "",
    addressDetail: member.addressDetail || "",
    avatarUrl: member.avatarUrl || "",
    status: member.status || "PAID",
    paymentDate: member.paymentDate || "",
    expireDate: member.expireDate || "",
  });

  // Сунгалт, огнооны зөрүү тооцоолол
  const isPaid = editForm.status === "PAID";
  const expireDateObj = editForm.expireDate ? new Date(editForm.expireDate) : null;
  const now = new Date();
  const isExpired = expireDateObj ? expireDateObj < now : false;

  const getDaysDiffText = () => {
    if (!editForm.expireDate) return null;
    const exp = new Date(editForm.expireDate).getTime();
    const current = new Date().getTime();
    const diffDays = Math.ceil((exp - current) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} өдрийн өмнө дууссан`;
    } else if (diffDays === 0) {
      return "Өнөөдөр дуусна";
    } else {
      return `${diffDays} хоног үлдсэн`;
    }
  };

  const [fightForm, setFightForm] = useState({
    opponent: "",
    result: "WIN" as "WIN" | "LOSS" | "DRAW",
    tournament: "Клубын спарринг",
    method: "Шүүгчийн шийдвэр",
    date: new Date().toISOString().split("T")[0],
    weightCategory: member.weight ? `${member.weight} кг` : "54 кг"
  });

  // QR код үүсгэх
  useEffect(() => {
    const payload = JSON.stringify({
      id: member.id,
      name: `${member.lastName || ""} ${member.name}`.trim(),
      phone: member.phone,
      level: member.level,
      status: member.status,
      expireDate: member.expireDate
    });
    QRCode.toDataURL(payload, { width: 220, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error(err));
  }, [member]);

  const handlePrint = () => {
    window.print();
  };

  // Сар сонгох үед дуусах огноог автоматаар тооцох
  const handlePeriodChange = (months: number) => {
    const start = paymentFormData.startDate ? new Date(paymentFormData.startDate) : new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    
    setPaymentFormData({
      ...paymentFormData,
      periodMonths: months,
      amount: 150000 * months,
      expireDate: end.toISOString().split("T")[0],
    });
  };

  // Шинэ төлбөр түүхэнд нэмж хадгалах
  const handleCreatePaymentRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPaymentSubmitting(true);
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          ...paymentFormData
        }),
      });

      if (!res.ok) throw new Error("Алдаа гарлаа");

      const data = await res.json();
      setShowAddPayment(false);
      setEditForm((prev) => ({
        ...prev,
        status: "PAID",
        paymentDate: paymentFormData.startDate,
        expireDate: paymentFormData.expireDate,
      }));
      onRefresh();
    } catch (err) {
      alert("Төлбөр бүртгэхэд алдаа гарлаа");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Мэдээлэл хадгалах
  const handleSaveMember = async () => {
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      alert("Сурагчийн нэр болон утсыг оруулна уу!");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: member.id,
          ...editForm
        })
      });

      if (!res.ok) throw new Error("Алдаа гарлаа");

      setIsEditing(false);
      onRefresh();
    } catch (e) {
      alert("Мэдээлэл шинэчлэхэд алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const handleAddFight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fightForm.opponent) return;

    try {
      const res = await fetch("/api/fights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          ...fightForm
        })
      });
      if (res.ok) {
        setShowAddFight(false);
        setFightForm({
          opponent: "",
          result: "WIN",
          tournament: "Клубын спарринг",
          method: "Шүүгчийн шийдвэр",
          date: new Date().toISOString().split("T")[0],
          weightCategory: member.weight ? `${member.weight} кг` : "54 кг"
        });
        onRefresh();
      }
    } catch (err) {
      alert("Тулаан нэмэхэд алдаа гарлаа");
    }
  };

  const fights = member.fights || [];
  const wins = fights.filter(f => f.result === "WIN").length;
  const losses = fights.filter(f => f.result === "LOSS").length;
  const draws = fights.filter(f => f.result === "DRAW").length;

  const paymentHistory: PaymentHistoryItem[] = member.paymentHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-[#141416] border border-zinc-800 rounded-3xl w-full max-w-lg text-white shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Толгой хэсэг */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 shrink-0 bg-[#17171a]">
          <div className="flex items-center gap-3">
            {editForm.avatarUrl ? (
              <img
                src={editForm.avatarUrl}
                alt={editForm.name}
                className="w-12 h-12 rounded-2xl object-cover border border-zinc-700 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-red-600/30">
                {editForm.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {editForm.lastName ? `${editForm.lastName} ` : ""}{editForm.name}
              </h3>
              <p className="text-xs text-zinc-400">📞 {editForm.phone} • Элссэн: {editForm.joinedDate || "Тодорхойгүй"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {activeTab === "profile" && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                  isEditing 
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40" 
                    : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                }`}
                title="Мэдээлэл засах"
              >
                <Edit3 size={15} />
                <span className="hidden sm:inline">{isEditing ? "Хаах" : "Засах"}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Табууд: Хувийн бүртгэл | Төлбөрийн түүх | Рекорд | QR Үнэмлэх */}
        <div className="relative bg-[#121215] shrink-0">
          <div className="flex overflow-x-auto no-scrollbar scroll-smooth">
            {[
              { key: "profile", label: "Хувийн бүртгэл", icon: null },
              { key: "payments", label: `Төлбөр (${paymentHistory.length})`, icon: <History size={13} /> },
              { key: "fights", label: `${wins}W-${losses}L`, icon: <Trophy size={13} /> },
              { key: "card", label: "QR Үнэмлэх", icon: <QrCode size={13} /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key as typeof activeTab); setIsEditing(false); }}
                className={`relative flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.key
                    ? "text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                )}
              </button>
            ))}
          </div>
          {/* Right fade gradient */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#121215] to-transparent" />
          {/* Bottom border */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-zinc-800/80" />
        </div>

        {/* Дэлгэрэнгүй агуулга */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* ================= 1. ТӨЛБӨРИЙН ТҮҮХ ТАБ ================= */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              
              {/* Одоогийн төлөв ба Шинэ төлбөр авах товч */}
              <div className="bg-[#19191d] border border-zinc-800 rounded-3xl p-4 flex justify-between items-center shadow-lg">
                <div>
                  <span className="text-[11px] text-zinc-400 block mb-0.5">Одоогийн статус:</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-xl border ${
                      isPaid && !isExpired
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-red-500/20 text-red-400 border-red-500/40"
                    }`}>
                      {isPaid && !isExpired ? "✓ Идэвхтэй" : "✕ Дууссан / Төлөөгүй"}
                    </span>
                    <span className="text-zinc-400 text-[11px] font-medium">
                      Дуусах: <b className="text-white">{editForm.expireDate || "-"}</b>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddPayment(!showAddPayment)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition"
                >
                  <Plus size={15} /> Төлбөр авах
                </button>
              </div>

              {/* ШИНЭ ТӨЛБӨР БҮРТГЭХ ФОРМ */}
              {showAddPayment && (
                <form onSubmit={handleCreatePaymentRecord} className="bg-[#19191d] border border-red-500/30 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-xl animate-in fade-in">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Receipt size={15} className="text-red-400" /> Шинэ төлбөр бүртгэх
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddPayment(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Хугацаа сонгох түргэн товчнууд */}
                  <div>
                    <label className="text-[11px] text-zinc-300 block mb-1.5 font-medium">Төлбөрийн хугацаа (Сар)</label>
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      {[1, 2, 3, 6].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handlePeriodChange(m)}
                          className={`py-1.5 rounded-xl border text-xs font-bold transition ${
                            paymentFormData.periodMonths === m
                              ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/30"
                              : "bg-[#131316] border-zinc-800 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {m} сар
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Төлсөн дүн & Төлбөрийн хэлбэр */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-300 block mb-1 font-medium">Төлөх дүн (₮) *</label>
                      <input
                        type="number"
                        required
                        value={paymentFormData.amount}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: Number(e.target.value) })}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-300 block mb-1 font-medium">Төлбөрийн хэлбэр</label>
                      <select
                        value={paymentFormData.method}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, method: e.target.value })}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-2 text-white focus:outline-none focus:border-red-500 text-xs"
                      >
                        <option value="Дансаар (Хаан банк)">Дансаар (Хаан банк)</option>
                        <option value="Дансаар (Голомт банк)">Дансаар (Голомт банк)</option>
                        <option value="QPay">QPay / SocialPay</option>
                        <option value="Бэлнээр">Бэлнээр</option>
                        <option value="ПОС карт">ПОС картын машин</option>
                      </select>
                    </div>
                  </div>

                  {/* Огноо: Эхлэх огноо & Дуусах огноо */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-300 block mb-1 font-medium">Эхлэх огноо (Төлсөн өдөр)</label>
                      <input
                        type="date"
                        required
                        value={paymentFormData.startDate}
                        onChange={(e) => {
                          const start = new Date(e.target.value);
                          const end = new Date(start);
                          end.setMonth(end.getMonth() + paymentFormData.periodMonths);
                          setPaymentFormData({
                            ...paymentFormData,
                            startDate: e.target.value,
                            expireDate: end.toISOString().split("T")[0],
                          });
                        }}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-300 block mb-1 font-medium">Хүчинтэй дуусах огноо</label>
                      <input
                        type="date"
                        required
                        value={paymentFormData.expireDate}
                        onChange={(e) => setPaymentFormData({ ...paymentFormData, expireDate: e.target.value })}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  {/* Тэмдэглэл */}
                  <div>
                    <label className="text-[11px] text-zinc-300 block mb-1 font-medium">Тэмдэглэл / Гүйлгээний утга</label>
                    <input
                      type="text"
                      placeholder="Жишээ: 11-р сарын төлбөр, Болд дасгалжуулагчид бэлнээр өгсөн"
                      value={paymentFormData.note}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, note: e.target.value })}
                      className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={paymentSubmitting}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 transition text-xs flex items-center justify-center gap-1.5"
                  >
                    <Banknote size={15} />
                    {paymentSubmitting ? "Бүртгэж байна..." : "Төлбөрийн баримт үүсгэх"}
                  </button>
                </form>
              )}

              {/* ТӨЛБӨРИЙН ТҮҮХИЙН ЖАГСААЛТ (TIMELINE) */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <History size={14} className="text-red-500" /> Төлбөр хийгдсэн бүх түүх
                </h4>

                {paymentHistory.length === 0 ? (
                  <div className="text-center py-8 bg-[#19191d] rounded-2xl border border-zinc-800 text-zinc-500 text-xs">
                    Одоогоор төлбөрийн түүх бүртгэгдээгүй байна. Дээрх "Төлбөр авах" товчоор нэмнэ үү.
                  </div>
                ) : (
                  paymentHistory.map((p, idx) => {
                    const isCurrent = idx === 0 && isPaid;
                    return (
                      <div
                        key={p.id || idx}
                        className={`bg-[#19191d] border rounded-2xl p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isCurrent 
                            ? "border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 via-[#19191d] to-[#19191d]" 
                            : "border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                            isCurrent ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-800 text-zinc-400"
                          }`}>
                            <CreditCard size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-white">
                                {p.amount.toLocaleString()} ₮
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold">
                                {p.periodMonths || 1} сар
                              </span>
                              <span className="text-[10px] text-zinc-400">
                                ({p.method || "Дансаар"})
                              </span>
                            </div>

                            <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
                              <span>📅 Төлсөн: <b className="text-zinc-200">{p.date || p.startDate}</b></span>
                              <span>•</span>
                              <span>Хүчинтэй: <b className="text-zinc-200">{p.expireDate}</b></span>
                            </p>

                            {p.note && (
                              <p className="text-[10px] text-zinc-500 mt-0.5 italic">
                                "{p.note}"
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0">
                          {isCurrent ? (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold inline-block">
                              Одоогийн идэвхтэй эрх
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-500">
                              Дууссан
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}

          {/* ================= 2. ТУЛААНЫ РЕКОРД ТАБ ================= */}
          {activeTab === "fights" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-[#18181c] border border-emerald-900/30 p-3 rounded-2xl">
                  <span className="text-[10px] text-zinc-400 block">Ялалт (Win)</span>
                  <span className="text-xl font-black text-emerald-400">{wins}</span>
                </div>
                <div className="bg-[#18181c] border border-red-900/30 p-3 rounded-2xl">
                  <span className="text-[10px] text-zinc-400 block">Ялагдал (Loss)</span>
                  <span className="text-xl font-black text-red-400">{losses}</span>
                </div>
                <div className="bg-[#18181c] border border-zinc-800 p-3 rounded-2xl">
                  <span className="text-[10px] text-zinc-400 block">Тэнцээ (Draw)</span>
                  <span className="text-xl font-black text-zinc-300">{draws}</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Flame size={14} className="text-red-500" /> Бүх спарринг & тэмцээний түүх
                </h4>
                <button
                  onClick={() => setShowAddFight(!showAddFight)}
                  className="px-2.5 py-1.5 bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl font-semibold flex items-center gap-1 hover:bg-red-600/30 transition text-[11px]"
                >
                  <Plus size={13} /> Спарринг бүртгэх
                </button>
              </div>

              {showAddFight && (
                <form onSubmit={handleAddFight} className="bg-[#18181c] border border-zinc-800 p-3.5 rounded-2xl space-y-3">
                  <div>
                    <label className="text-[11px] text-zinc-300 block mb-1">Өрсөлдөгчийн нэр *</label>
                    <input
                      type="text"
                      required
                      placeholder="Жишээ: Д. Төмөр (Шонхор клуб)"
                      value={fightForm.opponent}
                      onChange={(e) => setFightForm({ ...fightForm, opponent: e.target.value })}
                      className="w-full bg-[#121215] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-zinc-300 block mb-1">Үр дүн</label>
                      <select
                        value={fightForm.result}
                        onChange={(e) => setFightForm({ ...fightForm, result: e.target.value as any })}
                        className="w-full bg-[#121215] border border-zinc-700/80 rounded-xl py-2 px-2 text-white focus:outline-none focus:border-red-500"
                      >
                        <option value="WIN">🏆 Ялалт (WIN)</option>
                        <option value="LOSS">❌ Ялагдал (LOSS)</option>
                        <option value="DRAW">🤝 Тэнцээ (DRAW)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-300 block mb-1">Ялсан арга</label>
                      <input
                        type="text"
                        placeholder="KO, TKO, Оноогоор"
                        value={fightForm.method}
                        onChange={(e) => setFightForm({ ...fightForm, method: e.target.value })}
                        className="w-full bg-[#121215] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-zinc-300 block mb-1">Тэмцээн / Спарринг</label>
                      <input
                        type="text"
                        value={fightForm.tournament}
                        onChange={(e) => setFightForm({ ...fightForm, tournament: e.target.value })}
                        className="w-full bg-[#121215] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-300 block mb-1">Огноо</label>
                      <input
                        type="date"
                        value={fightForm.date}
                        onChange={(e) => setFightForm({ ...fightForm, date: e.target.value })}
                        className="w-full bg-[#121215] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition text-xs"
                  >
                    Хадгалах
                  </button>
                </form>
              )}

              <div className="space-y-2">
                {fights.length === 0 ? (
                  <p className="text-zinc-500 text-center py-6">Одоогоор тулааны рекорд бүртгэгдээгүй байна</p>
                ) : (
                  fights.map((f) => (
                    <div key={f.id} className="bg-[#18181c] border border-zinc-800 p-3 rounded-2xl flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            f.result === "WIN" 
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" 
                              : f.result === "LOSS" 
                              ? "bg-red-500/20 text-red-400 border border-red-500/40" 
                              : "bg-zinc-800 text-zinc-300"
                          }`}>
                            {f.result}
                          </span>
                          <span className="font-bold text-white text-xs">{f.opponent}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {f.tournament} • {f.method} ({f.weightCategory})
                        </p>
                      </div>
                      <span className="text-[10px] text-zinc-500">{f.date}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ================= 3. QR КАРТ ТАБ ================= */}
          {activeTab === "card" && (
            <div className="space-y-4">
              <div 
                id="member-club-card" 
                className="bg-gradient-to-br from-[#1c1c22] via-[#121215] to-[#09090b] border-2 border-red-600/40 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden"
              >
                <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                  <div className="text-left">
                    <span className="text-[10px] uppercase tracking-widest text-red-500 font-extrabold block">ALDAR BOXING CLUB</span>
                    <h4 className="text-sm font-black text-white">ГИШҮҮНИЙ ҮНЭМЛЭХ</h4>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                    isPaid && !isExpired
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}>
                    {isPaid && !isExpired ? "ИДЭВХТЭЙ" : "ДУУССАН"}
                  </span>
                </div>

                <div className="py-4 flex justify-center">
                  {qrDataUrl && (
                    <div className="p-3 bg-white rounded-2xl shadow-xl inline-block">
                      <img src={qrDataUrl} alt="Member QR" className="w-36 h-36" />
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <h3 className="text-base font-black text-white">
                    {editForm.lastName ? `${editForm.lastName} ` : ""}{editForm.name}
                  </h3>
                  <p className="text-xs text-red-400 font-semibold">{editForm.level} • {editForm.phone}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex justify-between items-center text-[11px]">
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase">Хүчинтэй хугацаа</span>
                    <span className="text-[11px] font-bold text-white">{editForm.expireDate || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 block uppercase">Төлөв</span>
                    <span className="text-[11px] font-bold text-emerald-400">{getDaysDiffText() || "Төлөгдсөн"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePrint}
                  className="py-2.5 px-3 bg-[#1e1e24] hover:bg-zinc-800 border border-zinc-700/80 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <Printer size={15} /> Карт хэвлэх
                </button>
                <a
                  href={qrDataUrl}
                  download={`boxing-card-${editForm.name}.png`}
                  className="py-2.5 px-3 bg-red-600 hover:bg-red-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition text-white shadow-md shadow-red-600/20"
                >
                  <Download size={15} /> QR татах
                </a>
              </div>
            </div>
          )}

          {/* ================= 4. ХУВИЙН МЭДЭЭЛЭЛ ТАБ ================= */}
          {activeTab === "profile" && (
            <>
              {/* Төлбөрийн хяналт товч карт */}
              <div className="bg-[#19191d] border border-zinc-800 rounded-2xl p-4 flex justify-between items-center shadow-lg">
                <div>
                  <span className="text-[11px] text-zinc-400 block mb-0.5">Одоогийн төлбөрийн статус:</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-xl border ${
                      isPaid && !isExpired
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-red-500/20 text-red-400 border-red-500/40"
                    }`}>
                      {isPaid && !isExpired ? "✓ Төлбөр төлөгдсөн" : "✕ Төлбөр дууссан / Төлөөгүй"}
                    </span>
                    <span className="text-xs text-zinc-400">
                      Хүчинтэй: <b className="text-white">{editForm.expireDate || "-"}</b>
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => { setActiveTab("payments"); setShowAddPayment(true); }}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 rounded-xl transition text-xs shadow-md shadow-red-600/30 flex items-center gap-1.5"
                >
                  <Plus size={14} /> Сунгах / Төлөх
                </button>
              </div>

              {/* МЭДЭЭЛЭЛ ЗАСАХ РЕЖИМ (EDIT FORM) */}
              {isEditing ? (
                <div className="bg-[#19191d] border border-amber-500/30 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-lg animate-in fade-in">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Edit3 size={14} /> Сурагчийн мэдээллийг засах
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="text-zinc-400 hover:text-white text-[11px]"
                    >
                      Цуцлах
                    </button>
                  </div>

                  {/* Овог Нэр */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Овог</label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Нэр *</label>
                      <input
                        type="text"
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* Утас & Түвшин */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Утас *</label>
                      <input
                        type="tel"
                        required
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Түвшин</label>
                      <select
                        value={editForm.level}
                        onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-2 text-white focus:outline-none focus:border-red-500 text-xs"
                      >
                        <option value="Beginner">Анхан шат</option>
                        <option value="Intermediate">Дунд шат</option>
                        <option value="Advanced">Ахисан шат</option>
                        <option value="Fighter">Тамирчин</option>
                      </select>
                    </div>
                  </div>

                  {/* Аватар зургийн холбоос (URL) */}
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Аватар зургийн URL</label>
                    <input
                      type="url"
                      placeholder="https://... зурагны линк"
                      value={editForm.avatarUrl}
                      onChange={(e) => setEditForm({ ...editForm, avatarUrl: e.target.value })}
                      className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 text-xs"
                    />
                  </div>

                  {/* Жин, Өндөр, Цусны бүлэг */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Жин (кг)</label>
                      <input
                        type="text"
                        placeholder="65"
                        value={editForm.weight}
                        onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-2 text-white focus:outline-none focus:border-red-500 text-xs text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Өндөр (см)</label>
                      <input
                        type="text"
                        placeholder="175"
                        value={editForm.height}
                        onChange={(e) => setEditForm({ ...editForm, height: e.target.value })}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-2 text-white focus:outline-none focus:border-red-500 text-xs text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Цусны бүлэг</label>
                      <input
                        type="text"
                        placeholder="I, II, III, IV"
                        value={editForm.bloodType}
                        onChange={(e) => setEditForm({ ...editForm, bloodType: e.target.value })}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-2 text-white focus:outline-none focus:border-red-500 text-xs text-center"
                      />
                    </div>
                  </div>

                  {/* Регистр ба Хаяг */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Регистрийн дугаар</label>
                      <input
                        type="text"
                        placeholder="УУ99010101"
                        value={editForm.registerNumber}
                        onChange={(e) => setEditForm({ ...editForm, registerNumber: e.target.value })}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Дүүрэг</label>
                      <input
                        type="text"
                        placeholder="Баянзүрх"
                        value={editForm.district}
                        onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Дэлгэрэнгүй хаяг</label>
                    <input
                      type="text"
                      placeholder="13-р хороолол, 25-р байр..."
                      value={editForm.addressDetail}
                      onChange={(e) => setEditForm({ ...editForm, addressDetail: e.target.value })}
                      className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 text-xs"
                    />
                  </div>
                </div>
              ) : (
                /* ХУВИЙН ҮЗҮҮЛЭЛТҮҮДИЙГ ХАРАХ РЕЖИМ */
                <>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Dumbbell size={14} className="text-red-500" /> Биеийн болон хувийн үзүүлэлт
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="text-red-400 hover:text-red-300 normal-case text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Edit3 size={12} /> Засах
                      </button>
                    </h4>
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-[#19191d] border border-zinc-800/80 p-2.5 rounded-2xl text-center">
                        <span className="text-[10px] text-zinc-400 block">Жин</span>
                        <span className="text-sm font-bold text-white">{editForm.weight ? `${editForm.weight} кг` : "-"}</span>
                      </div>
                      <div className="bg-[#19191d] border border-zinc-800/80 p-2.5 rounded-2xl text-center">
                        <span className="text-[10px] text-zinc-400 block">Өндөр</span>
                        <span className="text-sm font-bold text-white">{editForm.height ? `${editForm.height} см` : "-"}</span>
                      </div>
                      <div className="bg-[#19191d] border border-zinc-800/80 p-2.5 rounded-2xl text-center">
                        <span className="text-[10px] text-zinc-400 block">Цусны бүлэг</span>
                        <span className="text-sm font-bold text-white">{editForm.bloodType || "-"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                      <div className="bg-[#19191d] border border-zinc-800/80 p-2.5 rounded-2xl">
                        <span className="text-[10px] text-zinc-400 block">Регистрийн дугаар</span>
                        <span className="text-xs font-semibold text-white">{editForm.registerNumber || "Бүртгэлгүй"}</span>
                      </div>
                      <div className="bg-[#19191d] border border-zinc-800/80 p-2.5 rounded-2xl">
                        <span className="text-[10px] text-zinc-400 block">Хүйс / Төрсөн өдөр</span>
                        <span className="text-xs font-semibold text-white">
                          {editForm.gender} {editForm.birthDate ? `• ${editForm.birthDate}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Хаягийн мэдээлэл */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <MapPin size={14} className="text-red-500" /> Оршин суугаа хаяг
                    </h4>
                    <div className="bg-[#19191d] border border-zinc-800/80 p-3 rounded-2xl">
                      <p className="font-semibold text-white">{editForm.district || "Дүүрэг сонгоогүй"}</p>
                      <p className="text-zinc-400 text-[11px] mt-0.5">{editForm.addressDetail || "Дэлгэрэнгүй хаяг оруулаагүй"}</p>
                    </div>
                  </div>

                  {/* Асран хамгаалагчийн мэдээлэл */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <HeartHandshake size={14} className="text-red-500" /> Асран хамгаалагч нар
                    </h4>
                    {(!member.guardians || member.guardians.length === 0) ? (
                      <p className="text-zinc-500 text-xs italic">Асран хамгаалагч бүртгэгдээгүй байна</p>
                    ) : (
                      <div className="space-y-2">
                        {member.guardians.map((g, idx) => (
                          <div key={idx} className="bg-[#19191d] border border-zinc-800/80 p-3 rounded-2xl flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">{g.name}</span>
                                <span className="text-[10px] px-2 py-0.5 bg-red-600/20 text-red-400 rounded-lg font-medium">
                                  {g.relation}
                                </span>
                              </div>
                              <p className="text-zinc-400 text-[11px] mt-0.5">
                                {g.profession ? `${g.profession} • ` : ""}📞 {g.phone}
                              </p>
                            </div>
                            <a
                              href={`tel:${g.phone}`}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-medium transition"
                            >
                              Залгах
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Өөрчлөлтийг хадгалах товч */}
              <div className="pt-2 sticky bottom-0 bg-[#141416]/95 pb-1 backdrop-blur-md">
                <button
                  type="button"
                  onClick={handleSaveMember}
                  disabled={saving}
                  className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold py-3 rounded-2xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition text-xs"
                >
                  <Save size={16} />
                  {saving ? "Шинэчилж байна..." : "Өөрчлөлтийг хадгалах"}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
