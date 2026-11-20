"use client";

import { useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Phone,
  Search,
  CreditCard,
} from "lucide-react";
import type { Member } from "@/lib/db";
import { billingToday, studentPaymentState } from "@/lib/billing";

type Filter = "attention" | "expiring" | "active";

export default function PaymentOverview({
  members,
  loading,
  onPayment,
}: {
  members: Member[];
  loading: boolean;
  onPayment: (member: Member) => void;
}) {
  const [filter, setFilter] = useState<Filter>("attention");
  const [query, setQuery] = useState("");
  const today = billingToday();
  const rows = members.map((member) => ({
    member,
    ...studentPaymentState(member, today),
  }));
  const groups = {
    attention: rows.filter(
      (row) => row.kind === "unpaid" || row.kind === "expired",
    ),
    expiring: rows.filter((row) => row.kind === "expiring"),
    active: rows.filter((row) => row.kind === "active"),
  };
  const visible = groups[filter]
    .filter(({ member }) =>
      `${member.lastName} ${member.name} ${member.phone} ${member.guardians.map((g) => `${g.name} ${g.phone}`).join(" ")}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        (a.member.expireDate || "").localeCompare(b.member.expireDate || "") ||
        a.member.name.localeCompare(b.member.name),
    );
  const filters = [
    {
      key: "attention" as const,
      label: "Дууссан / Төлөөгүй",
      icon: AlertCircle,
      color: "text-red-400",
    },
    {
      key: "expiring" as const,
      label: "7 хоногт дуусах",
      icon: CalendarClock,
      color: "text-amber-400",
    },
    {
      key: "active" as const,
      label: "Идэвхтэй",
      icon: CheckCircle2,
      color: "text-emerald-400",
    },
  ];

  return (
    <section className="space-y-4" aria-label="Төлбөрийн хяналт">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          <CreditCard size={18} className="text-red-500" />
          Төлбөрийн хяналт
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Хугацааг шалгах, төлбөр сунгах, асран хамгаалагчтай холбогдох
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {filters.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`min-w-0 rounded-2xl border p-3 text-left transition ${filter === key ? "border-red-500/60 bg-red-500/10" : "border-zinc-800 bg-[var(--club-panel)] hover:border-zinc-700"}`}
          >
            <Icon size={17} className={color} />
            <span className="mt-3 block text-xl font-bold text-white">
              {loading ? "—" : groups[key].length}
            </span>
            <span className="mt-1 block text-[11px] leading-4 text-zinc-400">
              {label}
            </span>
          </button>
        ))}
      </div>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-zinc-500" />
        <input
          aria-label="Төлбөрийн бүртгэл хайх"
          placeholder="Сурагч, асран хамгаалагч, утсаар хайх"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-zinc-800 bg-[var(--club-panel)] py-2 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-red-500"
        />
      </div>
      {loading ? (
        <p role="status" className="p-6 text-center text-sm text-zinc-400">
          Бүртгэл ачаалж байна…
        </p>
      ) : visible.length === 0 ? (
        <p
          role="status"
          className="rounded-2xl border border-zinc-800 bg-[var(--club-panel)] p-8 text-center text-sm text-zinc-400"
        >
          {query
            ? "Хайлтад тохирох сурагч олдсонгүй."
            : "Энэ төлөвтэй сурагч байхгүй байна."}
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map(({ member, kind, daysLeft }) => {
            const guardian = member.guardians.find((g) =>
              /^\+?[\d ()-]{8,25}$/.test(g.phone.trim()),
            );
            const phone = guardian?.phone || member.phone;
            const canCall = /^\+?[\d ()-]{8,25}$/.test(phone.trim());
            const status =
              kind === "unpaid"
                ? "Төлөөгүй"
                : kind === "expired"
                  ? `${Math.abs(daysLeft!)} хоногийн өмнө дууссан`
                  : daysLeft === 0
                    ? "Өнөөдөр дуусна"
                    : `${daysLeft} хоног үлдсэн`;
            return (
              <article
                key={member.id}
                className="rounded-2xl border border-zinc-800 bg-[var(--club-panel)] p-4"
              >
                <div className="flex items-start gap-3">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-800 font-bold text-zinc-300">
                      {member.name.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-sm font-bold text-white">
                      {member.lastName} {member.name}
                    </h3>
                    <p
                      className={`mt-1 text-xs ${kind === "expiring" ? "text-amber-400" : kind === "active" ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {status}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-zinc-400">
                  <span>
                    Дуусах огноо{" "}
                    <span className="text-zinc-200">
                      {member.expireDate || "—"}
                    </span>
                  </span>
                  <span>
                    Сарын тариф{" "}
                    <span className="text-zinc-200">
                      {(member.monthlyFee || 100000).toLocaleString()}₮
                    </span>
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {canCall ? (
                    <a
                      href={`tel:${phone.replace(/[ ()-]/g, "")}`}
                      aria-label={`${guardian ? guardian.name : member.name} руу залгах`}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-zinc-800 px-2 text-xs text-zinc-200"
                    >
                      <Phone size={15} />
                      {guardian ? "Асран хамгаалагч" : "Сурагч руу залгах"}
                    </a>
                  ) : (
                    <span className="flex min-h-11 items-center justify-center text-xs text-zinc-500">
                      Утас бүртгэлгүй
                    </span>
                  )}
                  <button
                    onClick={() => onPayment(member)}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-2 text-xs font-bold text-white hover:bg-red-700"
                  >
                    <CreditCard size={15} />
                    Төлбөр / Сунгах
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
