import { getStudentAppData as getDbData, saveStudentAppData as saveDbData } from '@/lib/student-data';
import { NextResponse } from 'next/server';
import { PaymentHistoryItem, FinancialLog } from '@/lib/db';

// Сурагчийн төлбөрийн түүх авах
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: "memberId шаардлагатай" }, { status: 400 });
    }

    const data = await getDbData();
    const member = data.members.find(m => m.id === memberId);
    if (!member) {
      return NextResponse.json({ error: "Гишүүн олдсонгүй" }, { status: 404 });
    }

    return NextResponse.json(member.paymentHistory || []);
  } catch (err) {
    return NextResponse.json({ error: "Алдаа гарлаа" }, { status: 500 });
  }
}

// Шинэ төлбөр бүртгэх ба түүхэнд нэмэх
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { memberId, amount, periodMonths, startDate, expireDate, method, note } = body;

    if (!memberId || !expireDate) {
      return NextResponse.json({ error: "memberId болон expireDate шаардлагатай" }, { status: 400 });
    }

    const data = await getDbData();
    const member = data.members.find(m => m.id === memberId);
    if (!member) {
      return NextResponse.json({ error: "Гишүүн олдсонгүй" }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];
    const payAmount = Number(amount) || data.settings?.monthlyFee || 150000;
    const months = Number(periodMonths) || 1;

    const newPaymentRecord: PaymentHistoryItem = {
      id: "pay_" + Date.now(),
      date: startDate || today,
      amount: payAmount,
      periodMonths: months,
      startDate: startDate || today,
      expireDate: expireDate,
      method: method || "Дансаар",
      note: note || "",
      createdAt: new Date().toISOString()
    };

    if (!member.paymentHistory) member.paymentHistory = [];
    member.paymentHistory.unshift(newPaymentRecord);

    // Гишүүний одоогийн статусыг шинэчлэх
    member.status = "PAID";
    member.paymentDate = newPaymentRecord.date;
    member.expireDate = expireDate;

    // Санхүүгийн бүртгэлд орлого болгон автоматаар бүртгэх
    if (!data.financials) data.financials = [];
    const finEntry: FinancialLog = {
      id: "fin_" + Date.now(),
      type: "INCOME",
      title: `${member.lastName ? member.lastName + " " : ""}${member.name} - Сургалтын төлбөр (${months} сар)`,
      amount: payAmount,
      category: "Гишүүнчлэл",
      date: newPaymentRecord.date,
      memberId: member.id
    };
    data.financials.unshift(finEntry);

    // Мэдэгдэл үүсгэх
    if (!data.notifications) data.notifications = [];
    data.notifications.unshift({
      id: "notif_" + Date.now(),
      title: "Төлбөр төлөгдлөө",
      message: `${member.name} сурагчийн ${payAmount.toLocaleString()}₮ төлбөр амжилттай бүртгэгдлээ.`,
      time: "Дөнгөж сая",
      type: "success",
      read: false
    });

    await saveDbData(data);

    return NextResponse.json({ 
      success: true, 
      payment: newPaymentRecord, 
      member 
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Төлбөр бүртгэхэд алдаа гарлаа" }, { status: 500 });
  }
}
