import { NextResponse } from 'next/server';
import { getDbData, saveDbData, Member } from '@/lib/db';

export async function GET() {
  const data = getDbData();
  return NextResponse.json(data.members);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      lastName, name, phone, birthDate, registerNumber, 
      gender, level, joinedDate, weight, height, 
      familyCount, bloodType, district, addressDetail, 
      guardians, status, paymentDate, expireDate,
      assignedSessionIds, avatarUrl 
    } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Нэр, утасны дугаар заавал шаардлагатай" }, { status: 400 });
    }

    // Default cartoon avatar генератор
    const defaultCartoonAvatar = avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

    const data = getDbData();
    const newMemberId = "m_" + Date.now();
    const newMember: Member = {
      id: newMemberId,
      lastName: lastName || "",
      name,
      phone,
      birthDate: birthDate || "",
      registerNumber: registerNumber || "",
      gender: gender || "Эрэгтэй",
      level: level || "Beginner",
      joinedDate: joinedDate || new Date().toISOString().split('T')[0],
      weight: weight || "",
      height: height || "",
      familyCount: familyCount || "",
      bloodType: bloodType || "",
      district: district || "",
      addressDetail: addressDetail || "",
      guardians: guardians || [],
      status: status || "PAID",
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      expireDate: expireDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
      attendancesCount: 0,
      avatarUrl: defaultCartoonAvatar,
      assignedSessionIds: assignedSessionIds || []
    };

    data.members.unshift(newMember);

    // Сонгогдсон хичээлүүдэд энэ сурагчийг автоматаар нэмэх
    if (newMember.assignedSessionIds && newMember.assignedSessionIds.length > 0) {
      data.sessions.forEach(s => {
        if (newMember.assignedSessionIds?.includes(s.id)) {
          if (!s.enrolledMemberIds) s.enrolledMemberIds = [];
          if (!s.enrolledMemberIds.includes(newMemberId)) {
            s.enrolledMemberIds.push(newMemberId);
          }
        }
      });
    }

    // Мэдэгдэл үүсгэх
    data.notifications.unshift({
      id: "notif_" + Date.now(),
      title: "Шинэ гишүүн бүртгэгдлээ",
      message: `${lastName ? lastName + " " : ""}${name} сурагчийн бүртгэл үүслээ.`,
      time: "Дөнгөж сая",
      type: "success",
      read: false
    });

    saveDbData(data);

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Серверийн алдаа гарлаа" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: "Гишүүний ID шаардлагатай" }, { status: 400 });
    }

    const data = getDbData();
    data.members = data.members.filter(m => m.id !== id);
    // Хичээлүүдийн бүртгэлээс хасах
    data.sessions.forEach(s => {
      if (s.enrolledMemberIds) {
        s.enrolledMemberIds = s.enrolledMemberIds.filter(mid => mid !== id);
      }
    });

    saveDbData(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Устгахад алдаа гарлаа" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status, expireDate, paymentDate, assignedSessionIds, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Гишүүний ID шаардлагатай" }, { status: 400 });
    }

    const data = getDbData();
    const target = data.members.find(m => m.id === id);
    if (!target) {
      return NextResponse.json({ error: "Гишүүн олдсонгүй" }, { status: 404 });
    }

    Object.assign(target, updates);
    if (status !== undefined) target.status = status;
    if (expireDate !== undefined) target.expireDate = expireDate;
    if (paymentDate !== undefined) target.paymentDate = paymentDate;

    // Хичээлийн хуваарилалтыг шинэчлэх
    if (assignedSessionIds !== undefined) {
      target.assignedSessionIds = assignedSessionIds;
      data.sessions.forEach(s => {
        if (!s.enrolledMemberIds) s.enrolledMemberIds = [];
        if (assignedSessionIds.includes(s.id)) {
          if (!s.enrolledMemberIds.includes(id)) s.enrolledMemberIds.push(id);
        } else {
          s.enrolledMemberIds = s.enrolledMemberIds.filter(mid => mid !== id);
        }
      });
    }

    saveDbData(data);
    return NextResponse.json(target);
  } catch (error) {
    return NextResponse.json({ error: "Шинэчлэхэд алдаа гарлаа" }, { status: 500 });
  }
}
