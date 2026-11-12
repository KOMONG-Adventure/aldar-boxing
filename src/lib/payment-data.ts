import "server-only";
import type { PaymentHistoryItem } from "./db";
import { getSupabaseAdmin } from "./supabase/server";

export interface PaymentRow {
  id: string;
  student_id: string | null;
  student_name: string;
  amount: number;
  monthly_fee: number;
  period_months: number;
  start_date: string;
  expire_date: string;
  method: string;
  note: string;
  sibling_name: string | null;
  created_at: string;
}

export function toPaymentHistory(row: PaymentRow): PaymentHistoryItem {
  return {
    id: row.id, date: row.start_date, amount: row.amount, monthlyFee: row.monthly_fee,
    periodMonths: row.period_months, startDate: row.start_date, expireDate: row.expire_date,
    method: row.method, note: row.note, siblingName: row.sibling_name || undefined,
    createdAt: row.created_at,
  };
}

export async function getPayments(studentId?: string): Promise<PaymentRow[]> {
  const client = getSupabaseAdmin();
  const rows: PaymentRow[] = [];
  for (let offset = 0; ; offset += 500) {
    let query = client.from("payments").select("*");
    if (studentId) query = query.eq("student_id", studentId);
    const { data, error } = await query.order("created_at", { ascending: false })
      .order("id", { ascending: false }).range(offset, offset + 499);
    if (error) throw new Error("Төлбөрийн түүх татахад алдаа гарлаа.");
    rows.push(...(data as PaymentRow[]));
    if (data.length < 500) return rows;
  }
}
