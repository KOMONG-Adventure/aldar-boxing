export const STANDARD_MONTHLY_FEE = 100000;
export const SIBLING_MONTHLY_FEE = 50000;
export const PAYMENT_PERIODS = [1, 2, 3, 6] as const;

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
