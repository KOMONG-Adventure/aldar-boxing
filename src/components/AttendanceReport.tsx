"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import type { AttendanceRecord } from "@/lib/db";

export default function AttendanceReport({ date, attendances }: {
  date: string;
  attendances: AttendanceRecord[];
}) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const anchor = new Date(date + "T00:00:00Z");
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();
  const monday = anchor.getUTCDate() - (anchor.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, period === "week" ? monday : 1)).toISOString().slice(0, 10);
  const end = new Date(period === "week" ? Date.UTC(year, month, monday + 6) : Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
  const counts = new Map<string, { name: string; present: number; sick: number; absent: number }>();
  let total = 0;
  for (const row of attendances) {
    if (row.date < start || row.date > end) continue;
    const entry = counts.get(row.memberId) ?? { name: row.memberName, present: 0, sick: 0, absent: 0 };
    entry[row.status]++;
    counts.set(row.memberId, entry);
    total++;
  }
  const students = [...counts.entries()].sort(([, a], [, b]) => b.present - a.present || a.name.localeCompare(b.name));

  return (
    <details className="rounded-2xl border border-zinc-800 bg-[var(--club-panel)]">
      <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-white">
        <ClipboardList size={17} className="mr-2 inline text-red-500" />
        Ирцийн тайлан
      </summary>
      <div className="space-y-3 border-t border-zinc-800 p-4">
        <div className="grid grid-cols-2 gap-2">
          {(["week", "month"] as const).map(value => (
            <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${period === value ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-300"}`}>
              {value === "week" ? "7 хоног" : "Сар"}
            </button>
          ))}
        </div>
        <div aria-live="polite" className="flex flex-wrap justify-between gap-2 text-xs text-zinc-400">
          <span>{start} – {end}</span>
          <span>{students.length} сурагч · {total} удаагийн ирц</span>
        </div>
        {students.length === 0 ? (
          <p className="py-3 text-sm text-zinc-400">Энэ хугацаанд ирц бүртгэгдээгүй байна.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-400">
              <tr>
                <th scope="col" className="py-2 text-left">Сурагч</th>
                <th scope="col" className="py-2 text-right">Ирсэн</th>
                <th scope="col" className="py-2 text-right">Өвчтэй</th>
                <th scope="col" className="py-2 text-right">Тасалсан</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {students.map(([id, student]) => (
                <tr key={id}>
                  <th scope="row" className="py-2 text-left font-medium">{student.name}</th>
                  <td className="py-2 text-right tabular-nums">{student.present}</td>
                  <td className="py-2 text-right tabular-nums">{student.sick}</td>
                  <td className="py-2 text-right tabular-nums">{student.absent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
}
