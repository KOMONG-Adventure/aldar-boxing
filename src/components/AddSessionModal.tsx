"use client";

import { useRef, useState } from "react";
import {
  Plus,
  X,
  Calendar,
  Clock,
  ShieldCheck,
  Edit3,
  Trash2,
} from "lucide-react";
import type { Member, SessionItem } from "@/lib/db";
import { billingToday, paymentEndDate } from "@/lib/billing";
import {
  WEEKDAYS,
  scheduleGroups,
  sessionSlots,
  scheduleWeekday,
  validateSessionDraft,
} from "@/lib/schedules";

interface Props {
  onSessionAdded: () => void;
  members?: Member[];
  session?: SessionItem;
}
interface TimeGroup {
  id: string;
  days: number[];
  startTime: string;
  endTime: string;
}
const inputClass =
  "min-h-11 min-w-0 w-full rounded-xl border border-zinc-700/80 bg-[#131316] px-3 py-2 text-white focus:outline-none focus:border-red-500";
const presets = [
  { title: "Да, Лх, Ба", days: [1, 3, 5] },
  { title: "Мя, Пү, Бя", days: [2, 4, 6] },
  { title: "Ажлын өдрүүд", days: [1, 2, 3, 4, 5] },
  { title: "Амралтын өдрүүд", days: [6, 7] },
];

export default function AddSessionModal({
  onSessionAdded,
  members = [],
  session,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const [scheduleType, setScheduleType] = useState<"recurring" | "single">(
    "recurring",
  );
  const [formData, setFormData] = useState({
    title: "",
    coach: "",
    capacity: 20,
    startDate: "",
    endDate: "",
    specificDate: "",
  });
  const [groups, setGroups] = useState<TimeGroup[]>([]);
  const [enrolledMemberIds, setEnrolledMemberIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const openForm = () => {
    const today = billingToday();
    setFormData({
      title: session?.title || "",
      coach: session?.coach || "",
      capacity: session?.capacity || 20,
      startDate: session?.startDate || today,
      endDate: session?.endDate || "",
      specificDate: session?.specificDate || today,
    });
    setScheduleType(session?.scheduleType || "recurring");
    const initial = session
      ? scheduleGroups(sessionSlots(session))
      : [{ days: [1, 3, 5], startTime: "18:00", endTime: "19:30" }];
    setGroups(initial.map((group) => ({ ...group, id: crypto.randomUUID() })));
    setEnrolledMemberIds(session?.enrolledMemberIds || []);
    setSearch("");
    setError("");
    requestId.current = crypto.randomUUID();
    setIsOpen(true);
  };

  const updateGroup = (id: string, changes: Partial<TimeGroup>) => {
    setGroups((current) =>
      current.map((group) =>
        group.id === id ? { ...group, ...changes } : group,
      ),
    );
  };
  const toggleDay = (group: TimeGroup, day: number) => {
    updateGroup(group.id, {
      days: group.days.includes(day)
        ? group.days.filter((value) => value !== day)
        : [...group.days, day].sort((a, b) => a - b),
    });
  };
  const toggleMember = (id: string) => {
    setEnrolledMemberIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setError("");
    try {
      if (
        scheduleType === "recurring" &&
        groups.some((group) => group.days.length === 0)
      )
        throw new Error("Цагийн бүлэг бүрд ядаж нэг өдөр сонгоно уу.");
      const activeGroups =
        scheduleType === "single" ? groups.slice(0, 1) : groups;
      const slots = activeGroups.flatMap((group) =>
        (scheduleType === "single"
          ? [scheduleWeekday(formData.specificDate)]
          : group.days
        ).map((dayOfWeek) => ({
          dayOfWeek,
          startTime: group.startTime,
          endTime: group.endTime,
        })),
      );
      const payload = validateSessionDraft({
        ...formData,
        scheduleType,
        timeSlots: slots,
        enrolledMemberIds,
      });
      setLoading(true);
      const response = await fetch("/api/sessions", {
        method: session ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          ...(session
            ? { sessionId: session.id }
            : { requestId: requestId.current }),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Анги хадгалахад алдаа гарлаа.");
      setIsOpen(false);
      onSessionAdded();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Анги хадгалахад алдаа гарлаа.",
      );
    } finally {
      setLoading(false);
    }
  };

  const visibleMembers = members.filter((member) =>
    `${member.lastName} ${member.name} ${member.phone}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          openForm();
        }}
        title={session ? "Анги засах" : undefined}
        aria-label={session ? `${session.title} ангийг засах` : "Анги үүсгэх"}
        className={
          session
            ? "rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            : "flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-600/20 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-600/30"
        }
      >
        {session ? (
          <Edit3 size={15} />
        ) : (
          <>
            <Plus size={15} /> Анги үүсгэх
          </>
        )}
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md sm:p-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={session ? "Анги засах" : "Анги үүсгэх"}
            className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-800 bg-[#141416] p-4 text-white shadow-2xl sm:p-6"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-zinc-800 bg-[#141416] pb-4">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <Calendar size={20} className="shrink-0 text-red-500" />
                {session ? "Бэлтгэлийн анги засах" : "Бэлтгэлийн анги үүсгэх"}
              </h3>
              <button
                type="button"
                disabled={loading}
                onClick={() => setIsOpen(false)}
                aria-label="Хаах"
                className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-4 text-xs">
              <fieldset disabled={loading} className="space-y-4">
                <label className="block space-y-1.5 font-semibold text-zinc-300">
                  Ангийн нэр *
                  <input
                    required
                    maxLength={150}
                    value={formData.title}
                    onChange={(event) =>
                      setFormData({ ...formData, title: event.target.value })
                    }
                    placeholder="Жишээ: Өсвөрийн бокс"
                    className={inputClass}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800 bg-[#18181c] p-1">
                  {(
                    [
                      { value: "recurring", title: "7 хоног бүр" },
                      { value: "single", title: "Нэг өдөр" },
                    ] as const
                  ).map((type) => (
                    <button
                      type="button"
                      key={type.value}
                      aria-pressed={scheduleType === type.value}
                      onClick={() => setScheduleType(type.value)}
                      className={`min-h-10 rounded-xl px-2 font-semibold ${scheduleType === type.value ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"}`}
                    >
                      {type.title}
                    </button>
                  ))}
                </div>
                {(scheduleType === "single" ? groups.slice(0, 1) : groups).map(
                  (group, index) => (
                    <div
                      key={group.id}
                      className="space-y-3 rounded-2xl border border-zinc-800 bg-[#18181c] p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                          <Clock size={16} className="text-red-400" />
                          {scheduleType === "recurring"
                            ? "Өдөр ба цаг"
                            : "Бэлтгэлийн цаг"}
                        </h4>
                        {scheduleType === "recurring" && groups.length > 1 && (
                          <button
                            type="button"
                            aria-label={`${index + 1} дэх цагийн бүлгийг хасах`}
                            onClick={() =>
                              setGroups((current) =>
                                current.filter((item) => item.id !== group.id),
                              )
                            }
                            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                      {scheduleType === "recurring" && (
                        <>
                          <div className="grid grid-cols-7 gap-1">
                            {WEEKDAYS.map((day) => (
                              <button
                                type="button"
                                key={day.id}
                                aria-pressed={group.days.includes(day.id)}
                                aria-label={day.name}
                                onClick={() => toggleDay(group, day.id)}
                                className={`min-h-11 rounded-xl border text-center font-semibold ${group.days.includes(day.id) ? "border-red-500 bg-red-600 text-white" : "border-zinc-700 bg-[#131316] text-zinc-400"}`}
                              >
                                {day.short}
                              </button>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {presets.map((preset) => (
                              <button
                                type="button"
                                key={preset.title}
                                onClick={() =>
                                  updateGroup(group.id, {
                                    days: [...preset.days],
                                  })
                                }
                                className="rounded-lg bg-zinc-800 px-2 py-1.5 text-zinc-300 hover:bg-zinc-700"
                              >
                                {preset.title}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block min-w-0 space-y-1 text-zinc-400">
                          Эхлэх цаг *
                          <input
                            type="time"
                            required
                            value={group.startTime}
                            onChange={(event) =>
                              updateGroup(group.id, {
                                startTime: event.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        </label>
                        <label className="block min-w-0 space-y-1 text-zinc-400">
                          Дуусах цаг *
                          <input
                            type="time"
                            required
                            value={group.endTime}
                            onChange={(event) =>
                              updateGroup(group.id, {
                                endTime: event.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          ["07:30", "09:00"],
                          ["11:00", "13:00"],
                          ["16:00", "18:00"],
                          ["18:00", "19:30"],
                        ].map(([startTime, endTime]) => (
                          <button
                            type="button"
                            key={startTime}
                            onClick={() =>
                              updateGroup(group.id, { startTime, endTime })
                            }
                            className="rounded-lg bg-zinc-800 px-2 py-1.5 text-zinc-300 hover:bg-zinc-700"
                          >
                            {startTime}–{endTime}
                          </button>
                        ))}
                      </div>
                    </div>
                  ),
                )}
                {scheduleType === "recurring" ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setGroups((current) => [
                          ...current,
                          {
                            id: crypto.randomUUID(),
                            days: [],
                            startTime: "11:00",
                            endTime: "13:00",
                          },
                        ])
                      }
                      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 text-red-300 hover:bg-red-500/20"
                    >
                      <Plus size={16} /> Өөр өдөр, цаг нэмэх
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block min-w-0 space-y-1 text-zinc-300">
                        Эхлэх огноо
                        <input
                          type="date"
                          required
                          value={formData.startDate}
                          onChange={(event) =>
                            setFormData({
                              ...formData,
                              startDate: event.target.value,
                            })
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="block min-w-0 space-y-1 text-zinc-300">
                        Дуусах огноо
                        <input
                          type="date"
                          value={formData.endDate}
                          min={formData.startDate || undefined}
                          onChange={(event) =>
                            setFormData({
                              ...formData,
                              endDate: event.target.value,
                            })
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[1, 3, 6, 12].map((months) => (
                        <button
                          key={months}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              endDate: paymentEndDate(
                                formData.startDate || billingToday(),
                                months,
                              ),
                            })
                          }
                          className="rounded-lg bg-zinc-800 px-2 py-1.5 text-zinc-300"
                        >
                          +{months === 12 ? "1 жил" : `${months} сар`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, endDate: "" })
                        }
                        className="rounded-lg bg-zinc-800 px-2 py-1.5 text-zinc-300"
                      >
                        Хугацаагүй
                      </button>
                    </div>
                  </>
                ) : (
                  <label className="block space-y-1 text-zinc-300">
                    Бэлтгэл болох огноо *
                    <input
                      type="date"
                      required
                      value={formData.specificDate}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          specificDate: event.target.value,
                        })
                      }
                      className={inputClass}
                    />
                  </label>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block min-w-0 space-y-1 text-zinc-300">
                    Дасгалжуулагч
                    <input
                      maxLength={150}
                      value={formData.coach}
                      onChange={(event) =>
                        setFormData({ ...formData, coach: event.target.value })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="block min-w-0 space-y-1 text-zinc-300">
                    Багтаамж *
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={formData.capacity}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          capacity: Number(event.target.value),
                        })
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="block text-zinc-300">
                    Сурагч хуваарилах · {enrolledMemberIds.length}/
                    {formData.capacity}
                  </label>
                  <input
                    aria-label="Сурагч хайх"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Нэр, утсаар хайх"
                    className={inputClass}
                  />
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-zinc-800 bg-[#18181c] p-2">
                    {visibleMembers.length === 0 ? (
                      <p className="py-4 text-center text-zinc-500">
                        Сурагч олдсонгүй
                      </p>
                    ) : (
                      visibleMembers.map((member) => (
                        <label
                          key={member.id}
                          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-zinc-800 bg-[#141416] p-2.5"
                        >
                          <input
                            type="checkbox"
                            checked={enrolledMemberIds.includes(member.id)}
                            onChange={() => toggleMember(member.id)}
                            className="h-4 w-4 shrink-0 accent-red-600"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block break-words font-semibold text-white">
                              {member.lastName} {member.name}
                            </span>
                            <span className="text-zinc-500">
                              {member.phone}
                            </span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300"
                  >
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-3 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <ShieldCheck size={18} />
                  {loading
                    ? "Хадгалж байна..."
                    : session
                      ? "Өөрчлөлтийг хадгалах"
                      : "Анги үүсгэх"}
                </button>
              </fieldset>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
