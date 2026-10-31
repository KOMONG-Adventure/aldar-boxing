import { NextResponse } from 'next/server';
import { getDbData, saveDbData, FinancialLog } from '@/lib/db';

export async function GET() {
  const data = getDbData();
  return NextResponse.json(data.financials || []);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, title, amount, category, date } = body;

    if (!title || !amount) {
      return NextResponse.json({ error: "Гарчиг, мөнгөн дүн шаардлагатай" }, { status: 400 });
    }

    const data = getDbData();
    const newEntry: FinancialLog = {
      id: "fin_" + Date.now(),
      type: type || "INCOME",
      title,
      amount: Number(amount),
      category: category || "Бусад",
      date: date || new Date().toISOString().split('T')[0]
    };

    if (!data.financials) data.financials = [];
    data.financials.unshift(newEntry);
    saveDbData(data);

    return NextResponse.json(newEntry, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Алдаа гарлаа" }, { status: 500 });
  }
}
