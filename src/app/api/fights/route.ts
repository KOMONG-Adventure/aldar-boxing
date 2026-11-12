import { getStudentAppData as getDbData, saveStudentAppData as saveDbData } from '@/lib/student-data';
import { NextResponse } from 'next/server';
import { FightRecord } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { memberId, date, opponent, result, tournament, method, weightCategory } = body;

    if (!memberId || !opponent) {
      return NextResponse.json({ error: "Сурагчийн ID болон өрсөлдөгч шаардлагатай" }, { status: 400 });
    }

    const data = await getDbData();
    const member = data.members.find(m => m.id === memberId);
    if (!member) {
      return NextResponse.json({ error: "Сурагч олдсонгүй" }, { status: 404 });
    }

    const newFight: FightRecord = {
      id: "f_" + Date.now(),
      date: date || new Date().toISOString().split('T')[0],
      opponent,
      result: result || "WIN",
      tournament: tournament || "Клубын спарринг",
      method: method || "Шүүгчийн шийдвэр",
      weightCategory: weightCategory || member.weight ? `${member.weight} кг` : "Жин заагаагүй"
    };

    if (!member.fights) member.fights = [];
    member.fights.unshift(newFight);

    await saveDbData(data);
    return NextResponse.json(newFight, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Алдаа гарлаа" }, { status: 500 });
  }
}
