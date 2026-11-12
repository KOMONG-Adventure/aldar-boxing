import { getStudentAppData as getDbData, saveStudentAppData as saveDbData } from '@/lib/student-data';
import { NextResponse } from 'next/server';
import { AttendanceRecord } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const sessionId = searchParams.get('sessionId');

  const data = await getDbData();
  let list = data.attendances || [];

  if (date) {
    list = list.filter(a => a.date === date);
  }
  if (sessionId) {
    list = list.filter(a => a.sessionId === sessionId);
  }

  return NextResponse.json({
    sessions: data.sessions,
    attendances: list,
    allAttendances: data.attendances
  });
}

// Ирц тэмдэглэх эсвэл цуцлах (Toggle Attendance)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, memberId, date, action } = body;

    if (!sessionId || !memberId) {
      return NextResponse.json({ error: "sessionId, memberId шаардлагатай" }, { status: 400 });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const data = await getDbData();
    const session = data.sessions.find(s => s.id === sessionId);
    const member = data.members.find(m => m.id === memberId);

    if (!session || !member) {
      return NextResponse.json({ error: "Хичээл эсвэл сурагч олдсонгүй" }, { status: 404 });
    }

    // Ирц бүртгэлтэй эсэхийг олох
    const existingIndex = data.attendances.findIndex(
      a => a.sessionId === sessionId && a.memberId === memberId && a.date === targetDate
    );

    if (action === "REMOVE" || (action === "TOGGLE" && existingIndex >= 0)) {
      // Ирц цуцлах
      if (existingIndex >= 0) {
        data.attendances.splice(existingIndex, 1);
        member.attendancesCount = Math.max(0, (member.attendancesCount || 1) - 1);
        await saveDbData(data);
      }
      return NextResponse.json({ success: true, attended: false });
    } else {
      // Ирц бүртгэх
      if (existingIndex === -1) {
        const record: AttendanceRecord = {
          id: "att_" + Date.now(),
          sessionId,
          sessionTitle: session.title,
          memberId,
          memberName: `${member.name} (${member.lastName || ''})`.trim(),
          date: targetDate,
          checkInTime: new Date().toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })
        };
        data.attendances.unshift(record);
        member.attendancesCount = (member.attendancesCount || 0) + 1;
        await saveDbData(data);
      }
      return NextResponse.json({ success: true, attended: true });
    }
  } catch (error) {
    return NextResponse.json({ error: "Ирц боловсруулахад алдаа гарлаа" }, { status: 500 });
  }
}
