"use client";

import React, { useState } from "react";
import { Plus, X, DollarSign, TrendingUp, TrendingDown, Calendar, Tag, ShieldCheck } from "lucide-react";
import { FinancialLog } from "@/lib/db";

interface FinanceManagerProps {
  financials: FinancialLog[];
  monthlyFee: number;
  onRefresh: () => void;
}

export default function FinanceManager({ financials, monthlyFee, onRefresh }: FinanceManagerProps) {
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [type, setType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Гишүүнчлэл");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  const totalIncome = financials
    .filter((f) => f.type === "INCOME")
    .reduce((sum, f) => sum + f.amount, 0);

  const totalExpense = financials
    .filter((f) => f.type === "EXPENSE")
    .reduce((sum, f) => sum + f.amount, 0);

  const netBalance = totalIncome - totalExpense;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) {
      alert("Мэдээллийг бүрэн бөглөнө үү");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          amount: Number(amount),
          category,
          date,
        }),
      });

      if (!res.ok) throw new Error("Алдаа гарлаа");

      setIsOpenModal(false);
      setTitle("");
      setAmount("");
      onRefresh();
    } catch (err) {
      alert("Гүйлгээ хадгалахад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Нийт санхүүгийн картууд */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-3.5">
          <span className="text-[11px] text-zinc-400 block mb-1">Нийт орлого</span>
          <span className="text-base sm:text-lg font-black text-emerald-400">
            +{totalIncome.toLocaleString()}₮
          </span>
        </div>

        <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-3.5">
          <span className="text-[11px] text-zinc-400 block mb-1">Нийт зардал</span>
          <span className="text-base sm:text-lg font-black text-red-400">
            -{totalExpense.toLocaleString()}₮
          </span>
        </div>

        <div className="bg-[#121215] border border-zinc-800 rounded-2xl p-3.5">
          <span className="text-[11px] text-zinc-400 block mb-1">Цэвэр ашиг</span>
          <span className={`text-base sm:text-lg font-black ${netBalance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {netBalance.toLocaleString()}₮
          </span>
        </div>
      </div>

      {/* Үйлдлийн толгой */}
      <div className="flex justify-between items-center bg-[#121215] border border-zinc-800 rounded-2xl p-4">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-400" /> Клубын касс & Санхүүгийн бүртгэл
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">Орлого зарлага, хураамжийн түүх</p>
        </div>
        <button
          onClick={() => setIsOpenModal(true)}
          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-emerald-600/20"
        >
          <Plus size={15} /> Гүйлгээ нэмэх
        </button>
      </div>

      {/* Санхүүгийн түүх жагсаалт */}
      <div className="space-y-2">
        {financials.length === 0 ? (
          <p className="text-center py-6 text-zinc-500 text-xs">Гүйлгээний түүх байхгүй байна</p>
        ) : (
          financials.map((f) => (
            <div
              key={f.id}
              className="bg-[#121215] border border-zinc-800 rounded-2xl p-3.5 flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  f.type === "INCOME" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {f.type === "INCOME" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </div>
                <div>
                  <span className="font-semibold text-xs text-white block">{f.title}</span>
                  <span className="text-[10px] text-zinc-400">
                    {f.category} • {f.date}
                  </span>
                </div>
              </div>
              <span className={`text-xs font-bold ${
                f.type === "INCOME" ? "text-emerald-400" : "text-red-400"
              }`}>
                {f.type === "INCOME" ? "+" : "-"}{f.amount.toLocaleString()}₮
              </span>
            </div>
          ))
        )}
      </div>

      {/* Шинэ гүйлгээний Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#141416] border border-zinc-800 rounded-3xl w-full max-w-md p-6 text-white shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
              <h3 className="text-base font-bold">Гүйлгээ бүртгэх</h3>
              <button onClick={() => setIsOpenModal(false)} className="text-zinc-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 font-medium mb-1.5 block">Гүйлгээний төрөл</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setType("INCOME"); setCategory("Гишүүнчлэл"); }}
                    className={`py-2 rounded-xl font-bold border transition ${
                      type === "INCOME"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400"
                    }`}
                  >
                    + Орлого
                  </button>
                  <button
                    type="button"
                    onClick={() => { setType("EXPENSE"); setCategory("Тоног төхөөрөмж"); }}
                    className={`py-2 rounded-xl font-bold border transition ${
                      type === "EXPENSE"
                        ? "bg-red-500/20 border-red-500 text-red-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400"
                    }`}
                  >
                    - Зардал
                  </button>
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-medium mb-1.5 block">Утга / Тайлбар *</label>
                <input
                  type="text"
                  required
                  placeholder="Жишээ: Сарын төлбөр, Түрээс, Бээлий"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-medium mb-1.5 block">Мөнгөн дүн (₮) *</label>
                <input
                  type="number"
                  required
                  placeholder="150000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-medium mb-1.5 block">Ангилал</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-medium mb-1.5 block">Огноо</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={16} />
                  {loading ? "Хадгалж байна..." : "Гүйлгээ баталгаажуулах"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
