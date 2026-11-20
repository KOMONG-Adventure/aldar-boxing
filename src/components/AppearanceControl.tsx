"use client";

import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";

const accents = [
  { id: "red", label: "Улаан", color: "#dc2626" },
  { id: "blue", label: "Хөх", color: "#2563eb" },
  { id: "green", label: "Ногоон", color: "#047857" },
  { id: "purple", label: "Нил ягаан", color: "#7c3aed" },
];
const backgrounds = [
  { id: "black", label: "Хар", color: "#09090b" },
  { id: "slate", label: "Хөх саарал", color: "#0d1422" },
  { id: "warm", label: "Дулаан саарал", color: "#171310" },
];

function applyAppearance(accent: string, background: string) {
  document.documentElement.dataset.accent = accent;
  document.documentElement.dataset.surface = background;
  try {
    localStorage.setItem("aldar-appearance", JSON.stringify({ accent, background }));
  } catch {
    // The current page still reflects the selection when storage is unavailable.
  }
}

export default function AppearanceControl() {
  const panel = useRef<HTMLDialogElement>(null);
  const [accent, setAccent] = useState("red");
  const [background, setBackground] = useState("black");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("aldar-appearance") || "{}");
      applyAppearance(
        accents.some(item => item.id === saved.accent) ? saved.accent : "red",
        backgrounds.some(item => item.id === saved.background) ? saved.background : "black",
      );
    } catch {
      applyAppearance("red", "black");
    }
  }, []);

  return <>
    <button type="button" aria-label="Өнгө, дэвсгэр тохируулах" title="Өнгө, дэвсгэр тохируулах"
      className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
      onClick={() => {
        setAccent(document.documentElement.dataset.accent || "red");
        setBackground(document.documentElement.dataset.surface || "black");
        panel.current?.showModal();
      }}>
      <Palette size={18} />
    </button>
    <dialog ref={panel} aria-labelledby="appearance-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 text-white backdrop:bg-black/75">
      <h2 id="appearance-title" className="mb-5 text-lg font-bold">Өнгө ба дэвсгэр</h2>
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm text-zinc-300">Үндсэн өнгө</legend>
        <div className="grid grid-cols-2 gap-2">{accents.map(item =>
          <button key={item.id} type="button" aria-pressed={accent === item.id}
            className="appearance-option"
            onClick={() => { setAccent(item.id); applyAppearance(item.id, background); }}>
            <span style={{ backgroundColor: item.color }} />{item.label}
          </button>
        )}</div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm text-zinc-300">Дэвсгэр</legend>
        <div className="grid gap-2">{backgrounds.map(item =>
          <button key={item.id} type="button" aria-pressed={background === item.id}
            className="appearance-option"
            onClick={() => { setBackground(item.id); applyAppearance(accent, item.id); }}>
            <span style={{ backgroundColor: item.color }} />{item.label}
          </button>
        )}</div>
      </fieldset>
      <form method="dialog" className="mt-5">
        <button className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">Дуусгах</button>
      </form>
    </dialog>
  </>;
}
