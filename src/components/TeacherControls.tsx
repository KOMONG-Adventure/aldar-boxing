"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { LogOut, UserPlus, X, Copy } from "lucide-react";

export default function TeacherControls() {
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const run = async (action: "invite" | "logout") => {
    setBusy(true);
    try {
      const response = await fetch("/api/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Үйлдэл амжилтгүй.");
      if (action === "logout") window.location.replace("/bagsh");
      else {
        setLink(window.location.origin + data.path);
        setCopied(false);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Холболтын алдаа.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => run("invite")}
        aria-label="Багш урих"
        title="Багш урих"
        className="p-2 text-zinc-400 hover:text-white disabled:opacity-50"
      >
        <UserPlus size={18} />
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => run("logout")}
        aria-label="Гарах"
        title="Гарах"
        className="p-2 text-zinc-400 hover:text-white disabled:opacity-50"
      >
        <LogOut size={18} />
      </button>
      {link && createPortal(
        <div className="fixed inset-0 z-50 bg-black/80 p-4 grid place-items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Багш урих"
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Багш урих</h2>
              <button aria-label="Хаах" onClick={() => setLink("")}>
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-zinc-400">
              Багш энэ холбоосоор өөрийн нэвтрэх нэр, нууц үгийг үүсгэнэ. Урилга
              48 цагийн дотор нэг удаа ашиглагдана.
            </p>
            <input
              aria-label="Урилгын холбоос"
              readOnly
              value={link}
              onFocus={(e) => e.target.select()}
              className="w-full min-w-0 rounded-xl bg-zinc-950 p-3 text-sm"
            />
            <button
              className="w-full flex justify-center items-center gap-2 rounded-xl bg-red-600 p-3"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                } catch {
                  alert("Холбоосыг сонгон хуулна уу.");
                }
              }}
            >
              <Copy size={16} />
              {copied ? "Хууллаа" : "Холбоос хуулах"}
            </button>
          </div>
        </div>
      , document.body)}
    </>
  );
}
