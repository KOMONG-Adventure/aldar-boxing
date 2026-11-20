"use client";

import { useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";

const accents = [
  { id: "red", label: "Улаан", color: "#dc2626" },
  { id: "blue", label: "Хөх", color: "#2563eb" },
  { id: "green", label: "Ногоон", color: "#047857" },
  { id: "purple", label: "Нил ягаан", color: "#7c3aed" },
  { id: "cyan", label: "Цэнхэр", color: "#0e7490" },
  { id: "teal", label: "Оюу", color: "#0f766e" },
  { id: "amber", label: "Хув шар", color: "#a16207" },
  { id: "orange", label: "Улбар шар", color: "#c2410c" },
  { id: "pink", label: "Ягаан", color: "#be185d" },
  { id: "indigo", label: "Индиго", color: "#4338ca" },
];
const backgrounds = [
  { id: "white", label: "Цагаан", color: "#ffffff" },
  { id: "black", label: "Хар", color: "#09090b" },
  { id: "slate", label: "Хөх саарал", color: "#0d1422" },
  { id: "warm", label: "Дулаан саарал", color: "#171310" },
  { id: "forest", label: "Ойн ногоон", color: "#101914" },
  { id: "plum", label: "Чавга", color: "#181220" },
  { id: "graphite", label: "Графит", color: "#161719" },
];

const cards = [
  { id: "classic", label: "Сонгодог" },
  { id: "stripe", label: "Спорт" },
  { id: "split", label: "Хажуугийн QR" },
  { id: "paper", label: "Цаасан үнэмлэх" },
  { id: "ticket", label: "Тасалбар" },
];
const registrations = [
  { id: "classic", label: "Сонгодог" },
  { id: "compact", label: "Нягт" },
  { id: "wide", label: "Өргөн" },
];
const memberCards = [
  { id: "classic", label: "Сонгодог" },
  { id: "compact", label: "Нягт" },
  { id: "accent", label: "Өнгөт хүрээ" },
  { id: "profile", label: "Том зураг" },
  { id: "stacked", label: "Давхар мөр" },
];
const memberFields = [
  { id: "class", label: "Анги", example: "Өсвөрийн анги" },
  { id: "joined", label: "Элссэн огноо", example: "2026-11-21" },
  { id: "weight", label: "Жин", example: "58 кг" },
  { id: "height", label: "Өндөр", example: "168 см" },
];

function applyMemberFields(fields: string[]) {
  document.documentElement.dataset.memberFields = fields.join(" ");
  try {
    localStorage.setItem("aldar-member-card-fields", JSON.stringify(fields));
  } catch {
    // The current page still reflects the selection.
  }
}

function applyAppearance(accent: string, background: string, card: string, registration: string, memberCard = document.documentElement.dataset.memberCard || "classic") {
  document.documentElement.dataset.accent = accent;
  document.documentElement.dataset.surface = background;
  document.documentElement.dataset.card = card;
  document.documentElement.dataset.registration = registration;
  document.documentElement.dataset.memberCard = memberCard;
  try {
    localStorage.setItem("aldar-appearance", JSON.stringify({ accent, background, card, registration, memberCard }));
  } catch {
    // The current page still reflects the selection when storage is unavailable.
  }
}

export function RestoreAppearance() {
  useEffect(() => {
    try {
      const savedFields = JSON.parse(localStorage.getItem("aldar-member-card-fields") || "[]");
      if (Array.isArray(savedFields)) {
        applyMemberFields(memberFields.filter(item => savedFields.includes(item.id)).map(item => item.id));
      }
    } catch {
      applyMemberFields([]);
    }
    try {
      const saved = JSON.parse(localStorage.getItem("aldar-appearance") || "{}");
      applyAppearance(
        accents.some(item => item.id === saved.accent) ? saved.accent : "red",
        backgrounds.some(item => item.id === saved.background) ? saved.background : "black",
        cards.some(item => item.id === saved.card) ? saved.card : "classic",
        registrations.some(item => item.id === saved.registration) ? saved.registration : "classic",
        memberCards.some(item => item.id === saved.memberCard) ? saved.memberCard : "classic",
      );
    } catch {
      applyAppearance("red", "black", "classic", "classic");
    }
  }, []);
  return null;
}

export default function AppearanceControl() {
  const panel = useRef<HTMLDialogElement>(null);
  const [accent, setAccent] = useState("red");
  const [background, setBackground] = useState("black");
  const [card, setCard] = useState("classic");
  const [registration, setRegistration] = useState("classic");
  const [memberCard, setMemberCard] = useState("classic");
  const [fields, setFields] = useState<string[]>([]);

  return <>
    <button type="button" aria-label="Харагдац тохируулах" title="Харагдац тохируулах"
      className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
      onClick={() => {
        setAccent(document.documentElement.dataset.accent || "red");
        setBackground(document.documentElement.dataset.surface || "black");
        setCard(document.documentElement.dataset.card || "classic");
        setRegistration(document.documentElement.dataset.registration || "classic");
        setMemberCard(document.documentElement.dataset.memberCard || "classic");
        setFields((document.documentElement.dataset.memberFields || "").split(" ").filter(Boolean));
        panel.current?.showModal();
      }}>
      <Palette size={18} />
    </button>
    <dialog ref={panel} aria-labelledby="appearance-title"
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-zinc-700 bg-[var(--club-panel)] p-5 text-white backdrop:bg-black/75">
      <h2 id="appearance-title" className="mb-5 text-lg font-bold">Харагдац</h2>
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm text-zinc-300">Сурагчийн жагсаалтын карт</legend>
        <div className="grid grid-cols-2 gap-2">{memberCards.map(item =>
          <button key={item.id} type="button" aria-pressed={memberCard === item.id}
            className="appearance-option flex-col items-start"
            onClick={() => { setMemberCard(item.id); applyAppearance(accent, background, card, registration, item.id); }}>
            <i aria-hidden="true" data-preview={item.id} className="member-card-preview"><b /><em /></i>
            {item.label}
          </button>
        )}</div>
      </fieldset>
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm text-zinc-300">Жагсаалтын карт дээр харуулах мэдээлэл</legend>
        <div className="grid grid-cols-2 gap-2">{memberFields.map(item =>
          <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded-xl border border-zinc-700 p-2.5 text-xs">
            <input type="checkbox" className="mt-0.5 accent-red-600" checked={fields.includes(item.id)}
              onChange={event => {
                const next = event.target.checked ? [...fields, item.id] : fields.filter(id => id !== item.id);
                setFields(next);
                applyMemberFields(next);
              }} />
            <span><strong className="block">{item.label}</strong><small className="text-zinc-400">Жишээ: {item.example}</small></span>
          </label>
        )}</div>
      </fieldset>
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm text-zinc-300">QR үнэмлэхийн загвар</legend>
        <div className="grid grid-cols-2 gap-2">{cards.map(item =>
          <button key={item.id} type="button" aria-pressed={card === item.id}
            className="appearance-option flex-col items-start"
            onClick={() => { setCard(item.id); applyAppearance(accent, background, item.id, registration); }}>
            <i aria-hidden="true" data-preview={item.id} className="card-preview"><b /><em /></i>
            {item.label}
          </button>
        )}</div>
      </fieldset>
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm text-zinc-300">Сурагч бүртгэх маягт</legend>
        <div className="grid grid-cols-2 gap-2">{registrations.map(item =>
          <button key={item.id} type="button" aria-pressed={registration === item.id}
            className="appearance-option"
            onClick={() => { setRegistration(item.id); applyAppearance(accent, background, card, item.id); }}>
            {item.label}
          </button>
        )}</div>
      </fieldset>
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm text-zinc-300">Үндсэн өнгө</legend>
        <div className="grid grid-cols-2 gap-2">{accents.map(item =>
          <button key={item.id} type="button" aria-pressed={accent === item.id}
            className="appearance-option"
            onClick={() => { setAccent(item.id); applyAppearance(item.id, background, card, registration); }}>
            <span style={{ backgroundColor: item.color }} />{item.label}
          </button>
        )}</div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm text-zinc-300">Дэвсгэр</legend>
        <div className="grid grid-cols-2 gap-2">{backgrounds.map(item =>
          <button key={item.id} type="button" aria-pressed={background === item.id}
            className="appearance-option"
            onClick={() => { setBackground(item.id); applyAppearance(accent, item.id, card, registration); }}>
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
