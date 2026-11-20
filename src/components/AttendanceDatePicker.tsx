"use client";

import { useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { SessionItem } from "@/lib/db";
import { slotsOnDate } from "@/lib/schedules";

const weekdays = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];
const dateKey = (date: Date) => date.toISOString().slice(0, 10);

export default function AttendanceDatePicker({ value, today, sessions, colors, onChange }: {
  value: string;
  today: string;
  sessions: SessionItem[];
  colors: Map<string, string>;
  onChange: (date: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [month, setMonth] = useState(() => (value || today).slice(0, 7));
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const move = (delta: number) => setMonth(dateKey(new Date(Date.UTC(year, monthNumber - 1 + delta, 1))).slice(0, 7));
  const choose = (date: string) => {
    onChange(date);
    dialog.current?.close();
  };

  return <>
    <button type="button" aria-haspopup="dialog" aria-label={`Огноо сонгох, ${value}`} className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-white hover:bg-zinc-800"
      onClick={() => { setMonth((value || today).slice(0, 7)); dialog.current?.showModal(); }}>
      <CalendarDays size={18} className="text-red-500" /> {value}
    </button>
    <dialog ref={dialog} aria-labelledby="attendance-calendar-title" className="m-auto w-[calc(100%-1.5rem)] max-w-sm rounded-2xl border border-zinc-700 bg-[var(--club-panel)] p-3 text-white shadow-xl backdrop:bg-black/60 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-1">
        <button type="button" aria-label="Өмнөх сар" onClick={() => move(-1)} className="rounded-lg p-2 hover:bg-zinc-800"><ChevronLeft size={19} /></button>
        <h3 id="attendance-calendar-title" aria-live="polite" className="text-sm font-semibold">{year} оны {monthNumber}-р сар</h3>
        <button type="button" aria-label="Дараах сар" onClick={() => move(1)} className="rounded-lg p-2 hover:bg-zinc-800"><ChevronRight size={19} /></button>
        <button type="button" aria-label="Календарь хаах" onClick={() => dialog.current?.close()} className="rounded-lg p-2 hover:bg-zinc-800"><X size={17} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map(day => <span key={day} className="py-2 text-xs text-zinc-400">{day}</span>)}
        {Array.from({ length: 42 }, (_, index) => {
          const date = new Date(Date.UTC(year, monthNumber - 1, index - offset + 1));
          const key = dateKey(date);
          const classes = sessions.filter(session => slotsOnDate(session, key).length > 0);
          const selected = key === value;
          return <button key={key} type="button" aria-pressed={selected} aria-current={key === today ? "date" : undefined}
            aria-label={classes.length ? `${key}, ${classes.map(item => item.title).join(", ")}` : key}
            title={classes.map(item => item.title).join(", ") || undefined}
            onClick={() => choose(key)}
            className={`min-h-11 rounded-lg border px-0.5 py-1 text-sm ${selected ? "border-red-500 bg-red-500/15 font-bold" : "border-transparent hover:bg-zinc-800"} ${date.getUTCMonth() === monthNumber - 1 ? "text-zinc-100" : "text-zinc-500"}`}>
            {date.getUTCDate()}
            <span aria-hidden="true" className="mt-0.5 flex min-h-2 flex-wrap items-center justify-center gap-0.5">
              {classes.map(item => <span key={item.id} className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: colors.get(item.id) }} />)}
            </span>
          </button>;
        })}
      </div>
      <button type="button" onClick={() => choose(today)} className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-red-400 hover:bg-zinc-800">Өнөөдөр</button>
    </dialog>
  </>;
}
