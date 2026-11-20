export const STANDARD_MONTHLY_FEE = 100000;
export const SIBLING_MONTHLY_FEE = 50000;
export const PAYMENT_PERIODS = [1, 2, 3, 6] as const;
export const PAYMENT_WARNING_DAYS = 5;
export const DEFAULT_PAYMENT_DUE_DAY = 20;

export function monthlyDueDate(date: string, dueDay: number, months = 0): string {
  if (!date || paymentEndDate(date, 0) !== date) return "";
  const [year, month] = date.split("-").map(Number);
  const targetMonth = month - 1 + months;
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, targetMonth, Math.min(dueDay, lastDay))).toISOString().slice(0, 10);
}

export function billingToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(new Date());
}

export function paymentEndDate(start: string, months: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return "";
  const [year, month, day] = start.split("-").map(Number);
  const source = new Date(Date.UTC(year, month - 1, day));
  if (source.toISOString().slice(0, 10) !== start) return "";
  const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + months, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

export function studentPaymentState(student: { status: string; expireDate: string }, today = billingToday()) {
  if (student.status !== "PAID" || !student.expireDate || paymentEndDate(student.expireDate, 0) !== student.expireDate) {
    return { kind: "unpaid" as const, daysLeft: null };
  }
  const daysLeft = Math.round((Date.parse(`${student.expireDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  if (daysLeft < 0) return { kind: "expired" as const, daysLeft };
  if (daysLeft <= PAYMENT_WARNING_DAYS) return { kind: "expiring" as const, daysLeft };
  return { kind: "active" as const, daysLeft };
}
