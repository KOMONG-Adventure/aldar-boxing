"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Settings, X, Save, Clock, DollarSign, BellRing, Shield } from "lucide-react";
import { AppSettings } from "@/lib/db";

interface SettingsModalProps {
  settings: AppSettings;
  onRefresh: () => void;
}

export default function SettingsModal({ settings, onRefresh }: SettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<AppSettings>(settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_settings', settings: form })
      });
      if (!response.ok) throw new Error("Тохиргоо хадгалах боломжгүй.");
      onRefresh();
      setIsOpen(false);
    } catch (e) {
      alert("Тохиргоо хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Тохиргооны товч */}
      <button
        onClick={() => {
          setForm(settings);
          setIsOpen(true);
        }}
        aria-label="Тохиргоо"
        className="p-2.5 rounded-2xl bg-[#141416] border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition"
      >
        <Settings size={18} />
      </button>

      {/* Попап */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div role="dialog" aria-modal="true" aria-label="Клубын тохиргоо" className="bg-[#141416] border border-zinc-800 rounded-3xl w-full max-w-md max-h-[90dvh] overflow-y-auto text-white shadow-2xl p-6 relative">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-600/20 text-red-500 rounded-xl">
                  <Settings size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Клубын тохиргоо</h3>
                  <p className="text-xs text-zinc-400">Системийн ерөнхий үзүүлэлтүүд</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                aria-label="Тохиргоо хаах"
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="text-zinc-300 font-medium mb-1.5 block">Клубын нэр</label>
                <input
                  type="text"
                  value={form.clubName}
                  onChange={(e) => setForm({ ...form, clubName: e.target.value })}
                  className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-medium mb-1.5 block">Ахлах дасгалжуулагч</label>
                <input
                  type="text"
                  value={form.coachName}
                  onChange={(e) => setForm({ ...form, coachName: e.target.value })}
                  className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-medium mb-1.5 block">Сарын төлбөр (₮)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 text-zinc-500" size={16} />
                  <input
                    type="number"
                    value={form.monthlyFee}
                  readOnly
                    className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2.5 pl-9 pr-3 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-300 font-medium mb-1.5 block">Нээх цаг</label>
                  <input
                    type="time"
                    value={form.gymOpenTime}
                    onChange={(e) => setForm({ ...form, gymOpenTime: e.target.value })}
                    className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-medium mb-1.5 block">Хаах цаг</label>
                  <input
                    type="time"
                    value={form.gymCloseTime}
                    onChange={(e) => setForm({ ...form, gymCloseTime: e.target.value })}
                    className="w-full bg-[#1b1b1e] border border-zinc-700/80 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#18181c] rounded-2xl border border-zinc-800">
                <div className="flex items-center gap-2">
                  <BellRing size={16} className="text-red-500" />
                  <div>
                    <span className="font-semibold text-white block">Төлбөрийн сануулга</span>
                    <span className="text-[10px] text-zinc-400">Хугацаа дуусахад аппын мэдэгдэлд харуулах</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={form.smsNotification}
                  onChange={(e) => setForm({ ...form, smsNotification: e.target.checked })}
                  className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-2xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition"
                >
                  <Save size={16} />
                  {saving ? "Хадгалж байна..." : "Тохиргоог хадгалах"}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </>
  );
}
