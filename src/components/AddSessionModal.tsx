"use client";

import React, { useState } from "react";
import { Plus, X, Calendar, Clock, User, ShieldCheck, CheckCircle2, Repeat, CalendarDays } from "lucide-react";
import { Member } from "@/lib/db";

interface AddSessionModalProps {
  onSessionAdded: () => void;
  members?: Member[];
}

const DAYS_OF_WEEK = [
  { id: 1, short: "Да", name: "Даваа" },
  { id: 2, short: "Мя", name: "Мягмар" },
  { id: 3, short: "Лх", name: "Лхагва" },
  { id: 4, short: "Пү", name: "Пүрэв" },
  { id: 5, short: "Ба", name: "Баасан" },
  { id: 6, short: "Бя", name: "Бямба" },
  { id: 7, short: "Ня", name: "Ням" },
];

export default function AddSessionModal({ onSessionAdded, members = [] }: AddSessionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Сонгох төрөл: "recurring" (7 хоног бүрийн тодорхой өдрүүдэд) эсвэл "single" (тодорхой нэг өдөр)
  const [scheduleType, setScheduleType] = useState<"recurring" | "single">("recurring");
  
  const [formData, setFormData] = useState({
    title: "",
    startTime: "18:00",
    endTime: "19:30",
    coach: "",
    capacity: 20,
    specificDate: "",
    startDate: "",
    endDate: "",
  });

  React.useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setFormData((prev) => ({
      ...prev,
      specificDate: prev.specificDate || today,
      startDate: prev.startDate || today,
    }));
  }, []);

  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Default: Даваа, Лхагва, Баасан
  const [enrolledMemberIds, setEnrolledMemberIds] = useState<string[]>([]);

  const toggleDay = (dayId: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId].sort((a, b) => a - b)
    );
  };

  const selectPresetDays = (preset: "mwf" | "tts" | "all" | "weekend") => {
    if (preset === "mwf") setSelectedDays([1, 3, 5]);
    if (preset === "tts") setSelectedDays([2, 4, 6]);
    if (preset === "all") setSelectedDays([1, 2, 3, 4, 5]);
    if (preset === "weekend") setSelectedDays([6, 7]);
  };

  const toggleMemberEnroll = (id: string) => {
    setEnrolledMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Ангийн нэрийг заавал оруулна уу!");
      return;
    }
    if (!formData.startTime || !formData.endTime) {
      alert("Эхлэх болон дуусах цагийг заавал сонгоно уу!");
      return;
    }

    if (scheduleType === "recurring" && selectedDays.length === 0) {
      alert("7 хоногийн ядаж нэг өдрийг сонгоно уу!");
      return;
    }

    const dayOfWeekString = scheduleType === "single"
      ? `${formData.specificDate} (1 удаа)`
      : DAYS_OF_WEEK.filter((d) => selectedDays.includes(d.id))
          .map((d) => d.name)
          .join(", ");

    const formattedTime = `${formData.startTime} - ${formData.endTime}`;

    try {
      setLoading(true);
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          time: formattedTime,
          startTime: formData.startTime,
          endTime: formData.endTime,
          coach: formData.coach,
          capacity: formData.capacity,
          dayOfWeek: dayOfWeekString,
          scheduleType,
          selectedDays: scheduleType === "recurring" ? selectedDays : [],
          specificDate: scheduleType === "single" ? formData.specificDate : "",
          startDate: formData.startDate,
          endDate: formData.endDate,
          enrolledMemberIds,
        }),
      });

      if (!res.ok) throw new Error("Алдаа гарлаа");

      setIsOpen(false);
      setFormData({
        title: "",
        startTime: "18:00",
        endTime: "19:30",
        coach: "",
        capacity: 20,
        specificDate: new Date().toISOString().split("T")[0],
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
      });
      setSelectedDays([1, 3, 5]);
      setEnrolledMemberIds([]);
      onSessionAdded();
    } catch (err) {
      alert("Анги нэмэхэд алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
      >
        <Plus size={15} /> Анги үүсгэх
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#141416] border border-zinc-800 rounded-3xl w-full max-w-lg p-6 text-white shadow-2xl relative max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800 sticky top-0 bg-[#141416]/90 backdrop-blur-md z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-red-600/20 text-red-500 rounded-2xl border border-red-500/20">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Шинэ бэлтгэлийн анги үүсгэх</h3>
                  <p className="text-xs text-zinc-400">Цаг, хуваарь, өдрүүд тохируулах</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-zinc-800/80 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
              
              {/* Ангийн нэр */}
              <div>
                <label className="text-zinc-300 font-semibold mb-1.5 block">Ангийн нэр / Чиглэл *</label>
                <input
                  type="text"
                  required
                  placeholder="Жишээ: Өсвөрийн бокс, Оройн спарринг, Анхан шат"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3.5 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 transition"
                />
              </div>

              {/* Хуваарийн төрөл сонгох (Тогтмол 7 хоног бүр vs Тухайн нэг өдөр) */}
              <div>
                <label className="text-zinc-300 font-semibold mb-1.5 block">Хуваарийн төрөл</label>
                <div className="grid grid-cols-2 gap-2 bg-[#18181c] p-1 rounded-2xl border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setScheduleType("recurring")}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition ${
                      scheduleType === "recurring"
                        ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Repeat size={14} /> Тогтмол 7 хоног бүр
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleType("single")}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition ${
                      scheduleType === "single"
                        ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <CalendarDays size={14} /> Нэг өдрийн бэлтгэл
                  </button>
                </div>
              </div>

              {/* ЦАГ СОНГОХ (Эхлэх цаг - Дуусах цаг Time Picker) */}
              <div className="bg-[#18181c] border border-zinc-800/80 rounded-2xl p-3.5 space-y-2.5">
                <label className="text-zinc-300 font-semibold flex items-center gap-1.5">
                  <Clock size={15} className="text-red-400" />
                  Бэлтгэл орох цаг *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-zinc-400 mb-1 block">Эхлэх цаг</span>
                    <input
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 font-medium"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400 mb-1 block">Дуусах цаг</span>
                    <input
                      type="time"
                      required
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 font-medium"
                    />
                  </div>
                </div>
                <div className="flex gap-1.5 pt-1 overflow-x-auto pb-1 text-[11px]">
                  <span className="text-zinc-500 text-[10px] self-center mr-1">Түргэн:</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, startTime: "07:30", endTime: "09:00" })}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px]"
                  >
                    07:30 - 09:00
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, startTime: "15:00", endTime: "16:30" })}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px]"
                  >
                    15:00 - 16:30
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, startTime: "18:00", endTime: "19:30" })}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px]"
                  >
                    18:00 - 19:30
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, startTime: "19:30", endTime: "21:00" })}
                    className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px]"
                  >
                    19:30 - 21:00
                  </button>
                </div>
              </div>

              {/* ӨДӨР СОНГОЛТ */}
              {scheduleType === "recurring" ? (
                <div className="bg-[#18181c] border border-zinc-800/80 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-zinc-300 font-semibold flex items-center gap-1.5">
                      <CalendarDays size={15} className="text-red-400" />
                      7 хоногийн хэд дэх өдрүүдэд орох вэ?
                    </label>
                    <span className="text-[11px] text-red-400 font-bold">{selectedDays.length} өдөр</span>
                  </div>

                  {/* 7 хоногийн өдрүүд */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = selectedDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => toggleDay(day.id)}
                          className={`py-2 px-1 rounded-xl text-center flex flex-col items-center justify-center transition border ${
                            isSelected
                              ? "bg-red-600 border-red-500 text-white font-bold shadow-md shadow-red-600/30"
                              : "bg-[#131316] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                          }`}
                        >
                          <span className="text-xs">{day.short}</span>
                          <span className="text-[9px] opacity-75">{day.id <= 5 ? "Ажлын" : "Амралтын"}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Бэлэн товчнууд (Presets) */}
                  <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                    <span className="text-zinc-500 text-[10px] self-center mr-1">Хувилбар:</span>
                    <button
                      type="button"
                      onClick={() => selectPresetDays("mwf")}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg"
                    >
                      Да, Лх, Ба (1, 3, 5)
                    </button>
                    <button
                      type="button"
                      onClick={() => selectPresetDays("tts")}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg"
                    >
                      Мя, Пү, Бя (2, 4, 6)
                    </button>
                    <button
                      type="button"
                      onClick={() => selectPresetDays("all")}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg"
                    >
                      Ажлын өдрүүд (1-5)
                    </button>
                    <button
                      type="button"
                      onClick={() => selectPresetDays("weekend")}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg"
                    >
                      Амралтын өдрүүд (6-7)
                    </button>
                  </div>

                  {/* Эхлэх ба Дуусах огноо (Date Pickers & Quick Durations) */}
                  <div className="pt-3 border-t border-zinc-800/80 space-y-2.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-zinc-300 font-medium mb-1 block">Эхлэх огноо</span>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-zinc-300 font-medium mb-1 block">Дуусах огноо</span>
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500 text-xs"
                        />
                      </div>
                    </div>

                    {/* Хугацаа сонгох түргэн товчнууд (Quick period) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                      <span className="text-zinc-500 text-[10px] self-center">Хугацаа:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const start = formData.startDate ? new Date(formData.startDate) : new Date();
                          const end = new Date(start);
                          end.setMonth(end.getMonth() + 1);
                          setFormData({ ...formData, endDate: end.toISOString().split("T")[0] });
                        }}
                        className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px]"
                      >
                        +1 сар
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const start = formData.startDate ? new Date(formData.startDate) : new Date();
                          const end = new Date(start);
                          end.setMonth(end.getMonth() + 3);
                          setFormData({ ...formData, endDate: end.toISOString().split("T")[0] });
                        }}
                        className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px]"
                      >
                        +3 сар (Улирал)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const start = formData.startDate ? new Date(formData.startDate) : new Date();
                          const end = new Date(start);
                          end.setMonth(end.getMonth() + 6);
                          setFormData({ ...formData, endDate: end.toISOString().split("T")[0] });
                        }}
                        className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px]"
                      >
                        +6 сар
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const start = formData.startDate ? new Date(formData.startDate) : new Date();
                          const end = new Date(start);
                          end.setFullYear(end.getFullYear() + 1);
                          setFormData({ ...formData, endDate: end.toISOString().split("T")[0] });
                        }}
                        className="px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px]"
                      >
                        +1 жил
                      </button>
                      {formData.endDate && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, endDate: "" })}
                          className="px-2 py-0.5 bg-red-950/40 text-red-400 hover:bg-red-900/60 rounded-lg text-[10px]"
                        >
                          Хугацаагүй
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Тухайн тодорхой өдөр (Single Date Picker) */
                <div className="bg-[#18181c] border border-zinc-800/80 rounded-2xl p-3.5 space-y-2">
                  <label className="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <Calendar size={15} className="text-red-400" />
                    Бэлтгэл болох огноо (Date Picker) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.specificDate}
                    onChange={(e) => setFormData({ ...formData, specificDate: e.target.value })}
                    className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-red-500"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Энэ бэлтгэл зөвхөн сонгосон огноондоо 1 удаа зохион байгуулагдана.
                  </p>
                </div>
              )}

              {/* Багш ба Багтаамж */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-semibold mb-1.5 block">Дасгалжуулагч багш</label>
                  <input
                    type="text"
                    placeholder="Жишээ: Багш Болд"
                    value={formData.coach}
                    onChange={(e) => setFormData({ ...formData, coach: e.target.value })}
                    className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold mb-1.5 block">Дүүргэлт (Хүн)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Энэ ангид сурах сурагчдыг сонгох */}
              <div>
                <label className="text-zinc-300 font-semibold mb-1.5 block flex justify-between">
                  <span>Ангид урьдчилан бүртгэх сурагчид</span>
                  <span className="text-red-400 font-bold">{enrolledMemberIds.length} сурагч</span>
                </label>
                <div className="max-h-48 overflow-y-auto bg-[#18181c] border border-zinc-800 rounded-2xl p-2 space-y-1.5">
                  {members.length === 0 ? (
                    <div className="text-zinc-500 text-center py-4 text-xs">Сурагч бүртгэгдээгүй байна</div>
                  ) : (
                    members.map((m, idx) => {
                      const isSelected = enrolledMemberIds.includes(m.id);
                      // Нэрний эхний үсгүүд эсвэл аватар
                      const initials = m.name ? m.name.substring(0, 2).toUpperCase() : "БХ";
                      // Өнгө өөр байлгах (gradient avatar)
                      const avatarColors = [
                        "from-red-600 to-rose-700",
                        "from-amber-600 to-orange-700",
                        "from-emerald-600 to-teal-700",
                        "from-blue-600 to-indigo-700",
                        "from-purple-600 to-pink-700"
                      ];
                      const colorClass = avatarColors[idx % avatarColors.length];

                      return (
                        <div
                          key={m.id}
                          onClick={() => toggleMemberEnroll(m.id)}
                          className={`p-2 sm:p-2.5 rounded-2xl flex items-center justify-between cursor-pointer transition select-none border ${
                            isSelected 
                              ? "bg-gradient-to-r from-red-950/40 to-[#1e1b20] border-red-500/60 shadow-md" 
                              : "bg-[#141416] hover:bg-zinc-800/60 border-zinc-800/80 hover:border-zinc-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* СУРАГЧИЙН АВАТАР ЗУРАГ / ТАНИХ ТЭМДЭГ */}
                            {m.avatarUrl ? (
                              <img
                                src={m.avatarUrl}
                                alt={m.name}
                                className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0"
                              />
                            ) : (
                              <div
                                className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center font-bold text-[11px] text-white shadow-sm shrink-0 border border-white/10`}
                              >
                                {initials}
                              </div>
                            )}

                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-semibold truncate ${isSelected ? "text-white" : "text-zinc-200"}`}>
                                  {m.lastName ? `${m.lastName} ` : ""}{m.name}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-medium">
                                  {m.level}
                                </span>
                              </div>
                              <span className="text-[10px] text-zinc-500 block truncate">
                                📞 {m.phone}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 pl-2">
                            {isSelected ? (
                              <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white shadow-sm shadow-red-600/40">
                                <CheckCircle2 size={13} />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-zinc-700 hover:border-zinc-500 transition" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold py-3 rounded-2xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition"
                >
                  <ShieldCheck size={16} />
                  {loading ? "Үүсгэж байна..." : "Анги амжилттай үүсгэх"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
