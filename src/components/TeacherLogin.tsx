"use client";
import { useEffect, useState } from "react";

export default function TeacherLogin({ invite }: { invite: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/teacher")
      .then((r) => r.json())
      .then((data) => {
        if (data.teacher) window.location.replace("/");
      })
      .catch(() => setError("Сервертэй холбогдож чадсангүй."));
  }, []);
  return (
    <main className="min-h-screen bg-[#09090b] text-white grid place-items-center p-4">
      <form
        className="w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-900 p-6 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          const fields = Object.fromEntries(new FormData(event.currentTarget));
          try {
            const response = await fetch("/api/teacher", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...fields,
                invite,
                action: invite ? "setup" : "login",
              }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            window.location.replace("/");
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Нэвтрэхэд алдаа гарлаа.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1 className="font-bold text-xl">
          {invite ? "Багшийн эрх үүсгэх" : "Багш нэвтрэх"}
        </h1>
        {invite && (
          <label className="block text-sm">
            Багшийн нэр
            <input
              name="name"
              required
              maxLength={100}
              autoComplete="name"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3"
            />
          </label>
        )}
        <label className="block text-sm">
          Нэвтрэх нэр
          <input
            name="username"
            required
            pattern="[a-zA-Z0-9._\-]{3,40}"
            autoComplete="username"
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3"
          />
        </label>
        {invite && (
          <p className="text-xs text-zinc-400">
            3–40 латин үсэг, тоо ашиглана.
          </p>
        )}
        <label className="block text-sm">
          Нууц үг
          <input
            name="password"
            type="password"
            required
            minLength={10}
            maxLength={128}
            autoComplete={invite ? "new-password" : "current-password"}
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3"
          />
        </label>
        {invite && (
          <p className="text-xs text-zinc-400">
            Нууц үг хамгийн багадаа 10 тэмдэгт байна.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-red-600 p-3 font-bold disabled:opacity-50"
        >
          {busy ? "Түр хүлээнэ үү…" : invite ? "Эрх үүсгэж нэвтрэх" : "Нэвтрэх"}
        </button>
        <a className="block text-center text-sm text-zinc-400" href="/burtgel">
          Сурагч бүртгүүлэх
        </a>
        {invite && (
          <a className="block text-center text-sm text-zinc-400" href="/bagsh">
            Багшийн эрхээр нэвтрэх
          </a>
        )}
      </form>
    </main>
  );
}
