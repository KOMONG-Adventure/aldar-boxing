"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Link as LinkIcon } from "lucide-react";

export default function RegistrationLink() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const openLink = () => {
    setUrl(new URL("/burtgel", window.location.origin).href);
    setCopied(false);
    setError("");
    setIsOpen(value => !value);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setError("");
    } catch {
      setError("Доорх холбоосыг сонгож хуулна уу.");
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#121215] p-3">
      <button type="button" onClick={openLink} aria-expanded={isOpen} aria-controls="registration-link-panel" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/20">
        <LinkIcon size={17} /> Супер линк
      </button>
      {isOpen && (
        <div id="registration-link-panel" className="mt-3 space-y-3">
          <label className="block text-xs text-zinc-400" htmlFor="public-registration-url">Сурагч өөрөө бүртгүүлэх холбоос</label>
          <input id="public-registration-url" readOnly value={url} onFocus={event => event.target.select()} className="w-full min-w-0 rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-white" />
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={copyLink} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Хуулсан" : "Линк хуулах"}</button>
            <a href="/burtgel" target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white hover:bg-zinc-700"><ExternalLink size={16} /> Нээх</a>
          </div>
          <p role="status" className="text-xs text-zinc-400">{error || (copied ? "Бүртгэлийн холбоос хуулагдлаа." : "Эцэг эх, асран хамгаалагч, сурагчдад хуваалцаарай.")}</p>
        </div>
      )}
    </div>
  );
}
