"use client";

import React, { useState, useRef } from "react";
import { 
  Plus, X, User, ShieldCheck, Dumbbell,
  CheckCircle2, HeartHandshake, MapPin
} from "lucide-react";
import { Guardian } from "@/lib/db";

interface AddMemberModalProps {
  onMemberAdded: () => void;
}

export default function AddMemberModal({ onMemberAdded }: AddMemberModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("JPG, PNG эсвэл WebP зураг сонгоно уу.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Зургийн хэмжээ 5 МБ-аас ихгүй байна.");
      return;
    }
    setPhotoLoading(true);
    try {
      const image = await createImageBitmap(file);
      try {
        const scale = Math.min(1, 512 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Зураг боловсруулах боломжгүй");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setAvatarUrl(canvas.toDataURL("image/jpeg", 0.85));
      } finally {
        image.close();
      }
    } catch {
      setPhotoError("Зургийг уншиж чадсангүй. Өөр зураг сонгоно уу.");
    } finally {
      setPhotoLoading(false);
    }
  };

  // Үндсэн хувийн мэдээлэл
  const [formData, setFormData] = useState({
    lastName: "",        // Овог
    name: "",            // Нэр
    phone: "",           // Утас
    birthDate: "",       // Төрсөн огноо
    registerNumber: "",  // Регистрийн дугаар
    gender: "Сонгох",    // Хүйс
    level: "Beginner",   // Түвшин
    joinedDate: "",      // Элссэн огноо
    weight: "",          // Жин /кг/
    height: "",          // Өндөр /см/
    familyCount: "",     // Ам бүлийн тоо
    bloodType: "Сонгох", // Цусны бүлэг
    district: "Сонгох",  // Дүүрэг
    addressDetail: "",   // Гэрийн хаяг
    status: "PAID" as "PAID" | "UNPAID",
    paymentDate: "",
    expireDate: "",
  });

  // Асран хамгаалагчид
  const [guardians, setGuardians] = useState<Guardian[]>([
    {
      name: "",
      phone: "",
      profession: "",
      relation: "Аав",
    },
  ]);

  const openRegistration = () => {
    const today = new Date().toISOString().split("T")[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setFormData((prev) => ({
      ...prev,
      joinedDate: prev.joinedDate || today,
      paymentDate: prev.paymentDate || today,
      expireDate: prev.expireDate || nextMonth,
    }));
    setSubmitError("");
    setIsOpen(true);
  };
  const addGuardianField = () => {
    setGuardians((prev) => [
      ...prev,
      { name: "", phone: "", profession: "", relation: "Ээж" },
    ]);
  };

  const removeGuardianField = (index: number) => {
    setGuardians((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateGuardian = (index: number, field: keyof Guardian, val: string) => {
    setGuardians((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photoLoading || loading) return;
    setSubmitError("");
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert("Нэр болон утасны дугаараа заавал оруулна уу!");
      return;
    }

    try {
      setLoading(true);
      const cleanedGuardians = guardians.filter((g) => g.name.trim() !== "");
      
      const payload = {
        ...formData,
        guardians: cleanedGuardians,
        avatarUrl,
      };

      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const result = await res.json().catch(() => null);
        throw new Error(result?.error || "Бүртгэл хадгалахад алдаа гарлаа. Дахин оролдоно уу.");
      }

      setIsOpen(false);
      setAvatarUrl("");
      setPhotoError("");
      // Маягтыг цэвэрлэх
      setFormData({
        lastName: "",
        name: "",
        phone: "",
        birthDate: "",
        registerNumber: "",
        gender: "Сонгох",
        level: "Beginner",
        joinedDate: "",
        weight: "",
        height: "",
        familyCount: "",
        bloodType: "Сонгох",
        district: "Сонгох",
        addressDetail: "",
        status: "PAID",
        paymentDate: "",
        expireDate: "",
      });
      setGuardians([{ name: "", phone: "", profession: "", relation: "Аав" }]);
      onMemberAdded();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Бүртгэл хадгалахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* --- Зураг дээрх улаан "+" товчлуур --- */}
      <div 
        onClick={openRegistration}
        className="flex flex-col items-center gap-1.5 cursor-pointer group select-none"
      >
        <button
          type="button"
          aria-label="Шинэ гишүүн"
          className="w-14 h-14 sm:w-16 sm:h-16 bg-[#e11d48] hover:bg-rose-700 active:scale-95 transition-all duration-200 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-600/30 text-white"
        >
          <Plus size={34} strokeWidth={2.8} />
        </button>
        <span className="text-zinc-200 text-xs font-medium tracking-tight group-hover:text-rose-400 transition-colors">
          Шинэ гишүүн
        </span>
      </div>

      {/* --- Бүртгэлийн том Попап (Modal Dialog) --- */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#141416] border border-zinc-800 rounded-3xl w-full max-w-lg text-white shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Толгой хэсэг */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800/80 shrink-0 bg-[#161619]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-600/20 text-rose-500 rounded-2xl flex items-center justify-center border border-rose-500/30">
                  <Dumbbell size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Сурагч бүртгэх</h3>
                  <p className="text-xs text-zinc-400">Сурагчийн хувийн мэдээлэл бүртгэх</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white p-2 rounded-xl hover:bg-zinc-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Гүйлгэх үндсэн хэсэг (Scrollable Form) */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs">
              <div className="rounded-2xl border border-zinc-800 bg-[#18181c] p-4">
                <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Сурагчийн сонгосон профайл зураг" className="h-16 w-16 shrink-0 rounded-2xl border border-zinc-700 object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800 text-zinc-400">
                      <User size={32} aria-hidden="true" />
                    </div>
                  )}
                  <div className="contents">
                    <p className="min-w-0 text-sm font-semibold text-white">Профайл зураг</p>
                    <p id="member-photo-help" className="sr-only">JPG, PNG, WebP · 5 МБ хүртэл · Заавал биш</p>
                    <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} disabled={photoLoading || loading} aria-label="Сурагчийн профайл зураг сонгох" aria-describedby="member-photo-help member-photo-status" className="hidden" />
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="user" onChange={handlePhotoChange} disabled={photoLoading || loading} aria-label="Камераар сурагчийн зураг авах" aria-describedby="member-photo-help member-photo-status" className="hidden" />
                    <div className="col-span-2 grid min-w-0 grid-cols-2 gap-2">
                      <button type="button" onClick={() => photoInputRef.current?.click()} disabled={photoLoading || loading} className="min-h-10 min-w-0 rounded-xl bg-rose-600 px-2 py-2 font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                        Зураг оруулах
                      </button>
                      <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={photoLoading || loading} className="min-h-10 min-w-0 rounded-xl border border-zinc-700 bg-zinc-800 px-2 py-2 font-semibold text-zinc-200 hover:bg-zinc-700 disabled:opacity-50">
                        Зураг авах
                      </button>
                      {avatarUrl && (
                        <button type="button" aria-label="Профайл зураг хасах" onClick={() => { setAvatarUrl(""); setPhotoError(""); }} disabled={photoLoading || loading} className="col-span-2 flex min-h-10 items-center justify-center gap-1 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-rose-400 disabled:opacity-50"><X size={16} /> Зураг хасах</button>
                      )}
                    </div>
                    {photoLoading && <p className="col-span-2 text-zinc-400">Боловсруулж байна...</p>}
                  </div>
                </div>
                <p id="member-photo-status" aria-live="polite" className={photoError ? "mt-2 text-rose-400" : "sr-only"}>{photoError || (photoLoading ? "Зураг боловсруулж байна" : avatarUrl ? "Зураг сонгогдлоо" : "")}</p>
              </div>
              
              {/* 1. ХУВИЙН МЭДЭЭЛЭЛ */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white tracking-wide border-b border-zinc-800 pb-2 flex items-center gap-2">
                  <User size={16} className="text-rose-500" /> Хувийн мэдээлэл
                </h4>

                {/* Овог & Нэр */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-300 font-medium mb-1.5 block">Овог</label>
                    <input
                      type="text"
                      placeholder="Жишээ: Бат"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-300 font-medium mb-1.5 block">
                      Нэр <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Жишээ: Тэмүүлэн"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Утас & Төрсөн огноо */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-300 font-medium mb-1.5 block">
                      Утас <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="80000011"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-300 font-medium mb-1.5 block">Төрсөн огноо</label>
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                      className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Регистрийн дугаар & Хүйс */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-300 font-medium mb-1.5 block">Регистрийн дугаар</label>
                    <input
                      type="text"
                      placeholder="УА12345678"
                      value={formData.registerNumber}
                      onChange={(e) => setFormData({ ...formData, registerNumber: e.target.value })}
                      className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white uppercase placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-300 font-medium mb-1.5 block">Хүйс</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="Сонгох">Сонгох</option>
                      <option value="Эрэгтэй">Эрэгтэй</option>
                      <option value="Эмэгтэй">Эмэгтэй</option>
                    </select>
                  </div>
                </div>

                {/* Түвшин & Элссэн огноо */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-300 font-medium mb-1.5 block">Түвшин</label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="Beginner">Beginner (Анхан шат)</option>
                      <option value="Intermediate">Intermediate (Дунд шат)</option>
                      <option value="Advanced">Advanced (Ахисан шат)</option>
                      <option value="Fighter">Fighter (Тамирчин)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-300 font-medium mb-1.5 block">Элссэн огноо</label>
                    <input
                      type="date"
                      value={formData.joinedDate}
                      onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                      className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Жин & Өндөр */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-300 font-medium mb-1.5 block">Жин /кг/</label>
                    <input
                      type="number"
                      placeholder="52"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-300 font-medium mb-1.5 block">Өндөр /см/</label>
                    <input
                      type="number"
                      placeholder="165"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Ам бүлийн тоо & Цусны бүлэг */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-zinc-300 font-medium mb-1.5 block">Ам бүлийн тоо</label>
                    <input
                      type="number"
                      placeholder="4"
                      value={formData.familyCount}
                      onChange={(e) => setFormData({ ...formData, familyCount: e.target.value })}
                      className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-300 font-medium mb-1.5 block">Цусны бүлэг</label>
                    <select
                      value={formData.bloodType}
                      onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                      className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="Сонгох">Сонгох</option>
                      <option value="I (O+)">I (O+)</option>
                      <option value="II (A+)">II (A+)</option>
                      <option value="III (B+)">III (B+)</option>
                      <option value="IV (AB+)">IV (AB+)</option>
                      <option value="I (O-)">I (O-)</option>
                      <option value="II (A-)">II (A-)</option>
                      <option value="III (B-)">III (B-)</option>
                      <option value="IV (AB-)">IV (AB-)</option>
                    </select>
                  </div>
                </div>

                {/* Гэрийн хаяг (Дүүрэг) */}
                <div className="bg-[#18181c] p-3.5 rounded-2xl border border-zinc-800 space-y-3">
                  <label className="text-zinc-300 font-medium block flex items-center gap-1.5">
                    <MapPin size={15} className="text-rose-500" /> Гэрийн хаяг
                  </label>
                  <div>
                    <span className="text-[11px] text-zinc-400 mb-1 block">Дүүрэг</span>
                    <select
                      value={formData.district}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-rose-500"
                    >
                      <option value="Сонгох">Сонгох</option>
                      <option value="Баянзүрх дүүрэг">Баянзүрх дүүрэг</option>
                      <option value="Сүхбаатар дүүрэг">Сүхбаатар дүүрэг</option>
                      <option value="Чингэлтэй дүүрэг">Чингэлтэй дүүрэг</option>
                      <option value="Хан-Уул дүүрэг">Хан-Уул дүүрэг</option>
                      <option value="Баянгол дүүрэг">Баянгол дүүрэг</option>
                      <option value="Сонгинохайрхан дүүрэг">Сонгинохайрхан дүүрэг</option>
                      <option value="Налайх дүүрэг">Налайх дүүрэг</option>
                      <option value="Багануур дүүрэг">Багануур дүүрэг</option>
                      <option value="Багахангай дүүрэг">Багахангай дүүрэг</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-400 mb-1 block">Хороо, Байр, Тоот</span>
                    <input
                      type="text"
                      placeholder="Жишээ: 14-р хороо, 55-р байр 12 тоот"
                      value={formData.addressDetail}
                      onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
                      className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2 px-3 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* 2. АСРАН ХАМГААЛАГЧИЙН ХЭСЭГ */}
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <h4 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                    <HeartHandshake size={16} className="text-rose-500" /> Асран хамгаалагч
                  </h4>
                </div>

                {guardians.map((g, idx) => (
                  <div 
                    key={idx}
                    className="bg-[#18181c] border border-zinc-800 p-4 rounded-2xl grid grid-cols-2 gap-3 relative group"
                  >
                    {idx > 0 && (
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-zinc-400">Асран хамгаалагч {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeGuardianField(idx)}
                          aria-label={`Асран хамгаалагч ${idx + 1}-ийг хасах`}
                          className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition focus-visible:outline-2 focus-visible:outline-rose-500"
                        >
                          <X size={16} /> Хасах
                        </button>
                      </div>
                    )}
                    <div>
                      <label className="text-zinc-300 font-medium mb-1.5 block">Овог нэр</label>
                      <input
                        type="text"
                        placeholder="Бат Эрдэнэ"
                        value={g.name}
                        onChange={(e) => updateGuardian(idx, "name", e.target.value)}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-zinc-300 font-medium mb-1.5 block">Утасны дугаар</label>
                      <input
                        type="tel"
                        placeholder="81000011"
                        value={g.phone}
                        onChange={(e) => updateGuardian(idx, "phone", e.target.value)}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-zinc-300 font-medium mb-1.5 block">Мэргэжил</label>
                      <input
                        type="text"
                        placeholder="Жишээ: Эмч"
                        value={g.profession}
                        onChange={(e) => updateGuardian(idx, "profession", e.target.value)}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-zinc-300 font-medium mb-1.5 block">Холбоо хамаарал</label>
                      <select
                        value={g.relation}
                        onChange={(e) => updateGuardian(idx, "relation", e.target.value)}
                        className="w-full bg-[#131316] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-rose-500"
                      >
                        <option value="Аав">Аав</option>
                        <option value="Ээж">Ээж</option>
                        <option value="Ах / Эгч">Ах / Эгч</option>
                        <option value="Асран хамгаалагч">Асран хамгаалагч</option>
                        <option value="Бусад">Бусад</option>
                      </select>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addGuardianField}
                  className="w-full py-2.5 border border-rose-900/60 hover:border-rose-600 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 font-semibold rounded-2xl flex items-center justify-center gap-1.5 transition text-xs"
                >
                  <Plus size={16} /> Асран хамгаалагч нэмэх
                </button>
              </div>

              {/* 3. ТӨЛБӨРИЙН СУУРЬ */}
              <div className="bg-[#18181c] p-4 rounded-2xl border border-zinc-800 space-y-3">
                <label className="text-zinc-300 font-medium block">Төлбөрийн анхны төлөв</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "PAID" })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      formData.status === "PAID"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-[#131316] border-zinc-700 text-zinc-400"
                    }`}
                  >
                    <CheckCircle2 size={15} /> Төлсөн
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: "UNPAID" })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      formData.status === "UNPAID"
                        ? "bg-rose-500/20 border-rose-500 text-rose-400"
                        : "bg-[#131316] border-zinc-700 text-zinc-400"
                    }`}
                  >
                    ✕ Төлөөгүй
                  </button>
                </div>
              </div>

              {/* ТОМ УЛААН СУРАГЧ БҮРТГЭХ ТОВЧ */}
              <div className="pt-2 sticky bottom-0 bg-[#141416]/95 backdrop-blur-sm pb-1">
                {submitError && <p role="alert" className="mb-3 text-rose-400">{submitError}</p>}
                <button
                  type="submit"
                  disabled={loading || photoLoading}
                  className="w-full bg-[#d00000] hover:bg-red-700 active:scale-[0.99] text-white font-bold py-3.5 rounded-2xl transition duration-150 shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <ShieldCheck size={20} />
                  {loading ? "Бүртгэж байна..." : "💾 Сурагч бүртгэх"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
