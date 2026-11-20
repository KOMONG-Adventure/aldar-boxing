"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle } from "lucide-react";

export default function PaymentReceipt({ paymentId, hasReceipt }: { paymentId: string; hasReceipt?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endpoint = `/api/payments/receipt?paymentId=${encodeURIComponent(paymentId)}`;
  const attached = hasReceipt || saved;

  async function upload(file: File) {
    setError("");
    if (file.size === 0 || file.size > 4 * 1024 * 1024) {
      setError("4 МБ хүртэлх зураг сонгоно уу.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append("receipt", file);
      const response = await fetch(endpoint, { method: "POST", body });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "Баримт хадгалах боломжгүй байна.");
      }
      setSaved(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Баримт хадгалахад алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 space-y-1.5">
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
        onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void upload(file);
        }}
      />
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {attached && <a href={endpoint} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-zinc-700 px-2 py-2 text-xs text-zinc-300 hover:bg-zinc-800">Зураг харах</a>}
        <button type="button" disabled={busy} onClick={() => input.current?.click()}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2 py-2 text-xs text-zinc-300 hover:bg-zinc-800">
          {busy ? <LoaderCircle size={14} className="motion-safe:animate-spin" /> : <ImagePlus size={14} />}
          {busy ? "Хадгалж байна…" : attached ? "Зураг солих" : "Баримтын зураг нэмэх"}
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
