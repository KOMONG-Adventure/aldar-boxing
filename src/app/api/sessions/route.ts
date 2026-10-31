import { NextResponse } from 'next/server';
import { getDbData, saveDbData, SessionItem } from '@/lib/db';

export async function GET() {
  const data = getDbData();
  return NextResponse.json(data.sessions);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      title, 
      time, 
      startTime, 
      endTime, 
      coach, 
      capacity, 
      dayOfWeek, 
      scheduleType, 
      selectedDays, 
      specificDate, 
      startDate, 
      endDate, 
      enrolledMemberIds 
    } = body;

    const sessionTime = time || (startTime && endTime ? `${startTime} - ${endTime}` : "");

    if (!title || !sessionTime) {
      return NextResponse.json({ error: "Гарчиг болон цаг заавал шаардлагатай" }, { status: 400 });
    }

    const data = getDbData();
    const newSession: SessionItem = {
      id: "s_" + Date.now(),
      title,
      time: sessionTime,
      startTime: startTime || "",
      endTime: endTime || "",
      coach: coach || "Ахлах дасгалжуулагч",
      capacity: Number(capacity) || 20,
      dayOfWeek: dayOfWeek || "Даваа - Баасан",
      scheduleType: scheduleType || "recurring",
      selectedDays: selectedDays || [],
      specificDate: specificDate || "",
      startDate: startDate || "",
      endDate: endDate || "",
      enrolledMemberIds: enrolledMemberIds || []
    };

    data.sessions.push(newSession);

    // Сонгогдсон сурагчдын assignedSessionIds-д энэ хичээлийг нэмэх
    if (newSession.enrolledMemberIds.length > 0) {
      data.members.forEach(m => {
        if (newSession.enrolledMemberIds.includes(m.id)) {
          if (!m.assignedSessionIds) m.assignedSessionIds = [];
          if (!m.assignedSessionIds.includes(newSession.id)) {
            m.assignedSessionIds.push(newSession.id);
          }
        }
      });
    }

    saveDbData(data);
    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Алдаа гарлаа" }, { status: 500 });
  }
}

// Хичээлд сурагч нэмэх / хасах / засах
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, memberId, action, enrolledMemberIds } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId шаардлагатай" }, { status: 400 });
    }

    const data = getDbData();
    const session = data.sessions.find(s => s.id === sessionId);
    if (!session) {
      return NextResponse.json({ error: "Хичээл олдсонгүй" }, { status: 404 });
    }

    if (enrolledMemberIds !== undefined) {
      session.enrolledMemberIds = enrolledMemberIds;
    } else if (memberId && action === "ENROLL") {
      if (!session.enrolledMemberIds.includes(memberId)) {
        session.enrolledMemberIds.push(memberId);
      }
    } else if (memberId && action === "UNENROLL") {
      session.enrolledMemberIds = session.enrolledMemberIds.filter(id => id !== memberId);
    }

    saveDbData(data);
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json({ error: "Алдаа гарлаа" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: "ID шаардлагатай" }, { status: 400 });

    const data = getDbData();
    data.sessions = data.sessions.filter(s => s.id !== id);
    // Сурагчдын бүртгэлээс хасах
    data.members.forEach(m => {
      if (m.assignedSessionIds) {
        m.assignedSessionIds = m.assignedSessionIds.filter(sid => sid !== id);
      }
    });

    saveDbData(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Устгахад алдаа гарлаа" }, { status: 500 });
  }
}
