import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getPayments, toPaymentHistory, type PaymentRow } from "@/lib/payment-data";
import { PAYMENT_PERIODS, paymentEndDate } from "@/lib/billing";

export async function GET(request: Request) {
  const memberId = new URL(request.url).searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId шаардлагатай" }, { status: 400 });
  try {
    const payments = await getPayments(memberId);
    return NextResponse.json(payments.map(toPaymentHistory), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Payment history read failed", error);
    return NextResponse.json({ error: "Төлбөрийн түүх татахад алдаа гарлаа." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { memberId, paymentId, periodMonths, startDate, method, note, expectedMonthlyFee, amount } = body;
    if (typeof memberId !== "string" || typeof paymentId !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(paymentId) ||
        !PAYMENT_PERIODS.includes(periodMonths) || typeof startDate !== "string" ||
        !paymentEndDate(startDate, periodMonths) || typeof method !== "string" || !method.trim() || method.length > 100 ||
        (note !== undefined && (typeof note !== "string" || note.length > 1000)) ||
        ![50000, 100000].includes(expectedMonthlyFee) || amount !== expectedMonthlyFee * periodMonths) {
      return NextResponse.json({ error: "Төлбөрийн дүн, хугацаа, огноог шалгана уу." }, { status: 400 });
    }
    const { data, error } = await getSupabaseAdmin().rpc("record_student_payment", {
      p_id: paymentId, p_student_id: memberId, p_period_months: periodMonths,
      p_start_date: startDate, p_method: method.trim(), p_note: note || "", p_expected_fee: expectedMonthlyFee,
    });
    if (error) {
      console.error("Payment transaction failed", error.code, error.message);
      return NextResponse.json({ error: error.code === "P0001" ? error.message : "Төлбөр хадгалахад алдаа гарлаа. Дахин оролдоно уу." }, { status: error.code === "P0001" ? 409 : 503 });
    }
    return NextResponse.json({ success: true, payment: toPaymentHistory(data as PaymentRow) }, { status: 201 });
  } catch (error) {
    console.error("Payment request failed", error);
    return NextResponse.json({ error: "Төлбөрийн мэдээллийг шалгаад дахин оролдоно уу." }, { status: 400 });
  }
}
