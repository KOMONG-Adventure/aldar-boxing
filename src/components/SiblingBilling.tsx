"use client";

import { useState } from "react";
import type { Member } from "@/lib/db";

interface Props {
  member: Member;
  members: Member[];
  onRefresh: () => void | Promise<void>;
  onPendingChange: (pending: boolean) => void;
  disabled?: boolean;
}

export default function SiblingBilling({ member, members, onRefresh, onPendingChange, disabled = false }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [removing, setRemoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const sibling = members.find(item => item.id === member.siblingId);
  const selected = members.find(item => item.id === selectedId);
  const candidates = members.filter(item => item.id !== member.id && !item.siblingId);
  const fullName = (item: Member) => `${item.lastName} ${item.name}`.trim();

  const saveLink = async (siblingId: string | null) => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/siblings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id, siblingId, confirmed: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Холбоос хадгалахад алдаа гарлаа.");
      await onRefresh();
      setEnabled(false);
      setSelectedId("");
      setRemoving(false);
      onPendingChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Холбоос хадгалахад алдаа гарлаа.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-[#19191d] p-4 text-xs">
      <div className="flex items-center justify-between gap-3">
        <label className="flex min-h-10 items-center gap-2 font-semibold text-white">
          <input type="checkbox" checked={!!member.siblingId || enabled} disabled={saving || disabled} onChange={event => {
            setError("");
            if (member.siblingId) setRemoving(true);
            else setEnabled(event.target.checked);
            onPendingChange(!!member.siblingId || event.target.checked);
          }} className="h-4 w-4 accent-red-600" />
          Айлийн 2 хүүхэд
        </label>
        <span className="shrink-0 font-bold text-white">{(member.monthlyFee || 100000).toLocaleString()}₮ / сар</span>
      </div>
      {member.siblingId && <p className="text-zinc-300">{sibling ? fullName(sibling) : "Холбогдсон хүүхэд"} · тус бүр 50,000₮</p>}
      {!member.siblingId && enabled && (
        <div className="space-y-3">
          <label htmlFor="sibling-student" className="block text-zinc-300">Нөгөө хүүхдийг сонгох</label>
          <select id="sibling-student" value={selectedId} disabled={saving || disabled} onChange={event => setSelectedId(event.target.value)} className="min-h-11 w-full rounded-xl border border-zinc-700 bg-[#131316] px-3 text-white">
            <option value="">Хүүхэд сонгох</option>
            {candidates.map(item => <option key={item.id} value={item.id}>{fullName(item)} · {item.phone}</option>)}
          </select>
          {candidates.length === 0 && <p className="text-zinc-400">Холбох боломжтой өөр сурагч бүртгэгдээгүй байна.</p>}
          {selected && <p className="text-zinc-300">{fullName(member)} болон {fullName(selected)} — тус бүр 50,000₮ / сар.</p>}
          <button type="button" disabled={!selectedId || saving || disabled} onClick={() => saveLink(selectedId)} className="min-h-11 w-full rounded-xl bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-40">{saving ? "Хадгалж байна..." : "Сонгосон хүүхэдтэй холбож баталгаажуулах"}</button>
        </div>
      )}
      {removing && (
        <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-amber-200">Холбоос салгавал хоёр хүүхдийн дараагийн сарын тариф тус бүр 100,000₮ болно.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={saving} onClick={() => { setRemoving(false); onPendingChange(false); }} className="min-h-10 rounded-xl bg-zinc-800 text-white">Болих</button>
            <button type="button" disabled={saving} onClick={() => saveLink(null)} className="min-h-10 rounded-xl bg-red-600 text-white disabled:opacity-40">{saving ? "Салгаж байна..." : "Салгахыг батлах"}</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-red-400">{error}</p>}
    </div>
  );
}
