import { studentPaymentState } from "@/lib/billing";
import { authorizeTeacher, teacherAccess } from "@/lib/teacher-auth";
import { getStudentAppData as getDbData, saveMemberRegistration as saveDbData } from '@/lib/student-data';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { studentFields } from "@/lib/student-fields";
import type { Member } from "@/lib/db";
import { SupabaseConfigurationError } from '@/lib/supabase/server';

function memberForTeacher(member: Member, canManageFinance: boolean) {
  if (canManageFinance) return member;
  const { paymentHistory, monthlyFee, siblingId, ...profile } = member;
  const { kind } = studentPaymentState(member);
  return { ...profile, paymentDate: "", expireDate: "", status: kind === "active" || kind === "expiring" ? "PAID" : "UNPAID" };
}

function configurationErrorResponse(error: unknown) {
  if (error instanceof SupabaseConfigurationError) {
    return NextResponse.json({ error: error.message, code: 'SUPABASE_CONFIGURATION_MISSING' }, { status: 503 });
  }
}

export async function GET(request: Request) {
  const teacher = await authorizeTeacher(request); if (teacher instanceof NextResponse) return teacher;
  try {
    const data = await getDbData();
    const canManageFinance = teacher.role === "super_admin";
    return NextResponse.json(data.members.map(member => memberForTeacher(member, canManageFinance)), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Student registration read failed', error);
    const configurationError = configurationErrorResponse(error);
    if (configurationError) return configurationError;
    return NextResponse.json({ error: 'Сурагчдын бүртгэл татахад алдаа гарлаа. Дахин оролдоно уу.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const teacher = await authorizeTeacher(request); if (teacher instanceof NextResponse) return teacher;
  try {
    const canManageFinance = teacher.role === "super_admin";
    const body = await request.json();
    const { 
      lastName, name, phone, birthDate, registerNumber, 
      gender, level, joinedDate, weight, height, 
      familyCount, bloodType, district, addressDetail, 
      guardians, status, paymentDate, expireDate,
      assignedSessionIds, avatarUrl 
    } = body;

    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 ||
        typeof phone !== 'string' || !phone.trim() || phone.trim().length > 30 ||
        (guardians !== undefined && !Array.isArray(guardians)) ||
        (avatarUrl !== undefined && typeof avatarUrl !== 'string')) {
      return NextResponse.json({ error: "Нэр, утасны дугаар заавал шаардлагатай" }, { status: 400 });
    }

    // Default cartoon avatar генератор
    const defaultCartoonAvatar = avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

    const data = await getDbData();
    const newMemberId = "m_" + randomUUID();
    const newMember: Member = {
      id: newMemberId,
      lastName: lastName || "",
      name: name.trim(),
      phone: phone.trim(),
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
      status: canManageFinance ? status || "PAID" : "UNPAID",
      paymentDate: canManageFinance ? paymentDate || new Date().toISOString().split('T')[0] : "",
      expireDate: canManageFinance ? expireDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : "",
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

    await saveDbData(data);

    return NextResponse.json(memberForTeacher(newMember, canManageFinance), { status: 201 });
  } catch (error) {
    console.error('Student registration create failed', error);
    const configurationError = configurationErrorResponse(error);
    if (configurationError) return configurationError;
    return NextResponse.json({ error: "Серверийн алдаа гарлаа" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const denied = await teacherAccess(request, true); if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: "Гишүүний ID шаардлагатай" }, { status: 400 });
    }

    const data = await getDbData();
    data.members = data.members.filter(m => m.id !== id);
    // Хичээлүүдийн бүртгэлээс хасах
    data.sessions.forEach(s => {
      if (s.enrolledMemberIds) {
        s.enrolledMemberIds = s.enrolledMemberIds.filter(mid => mid !== id);
      }
    });

    await saveDbData(data);
    return NextResponse.json({ success: true });
  } catch (error) {
    const configurationError = configurationErrorResponse(error);
    if (configurationError) return configurationError;
    return NextResponse.json({ error: "Устгахад алдаа гарлаа" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const teacher = await authorizeTeacher(request); if (teacher instanceof NextResponse) return teacher;
  try {
    const canManageFinance = teacher.role === "super_admin";
    const body = await request.json();
    const { id, status, expireDate, paymentDate, assignedSessionIds, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Гишүүний ID шаардлагатай" }, { status: 400 });
    }

    const data = await getDbData();
    const target = data.members.find(m => m.id === id);
    if (!target) {
      return NextResponse.json({ error: "Гишүүн олдсонгүй" }, { status: 404 });
    }

    for (const field of [...Object.keys(studentFields), "avatarUrl"] as (keyof Member)[]) {
      if (["status", "expireDate", "paymentDate"].includes(field)) continue;
      if (Object.hasOwn(updates, field)) Object.assign(target, { [field]: updates[field] });
    }
    if (canManageFinance && status !== undefined) target.status = status;
    if (canManageFinance && expireDate !== undefined) target.expireDate = expireDate;
    if (canManageFinance && paymentDate !== undefined) target.paymentDate = paymentDate;

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

    await saveDbData(data);
    return NextResponse.json(memberForTeacher(target, canManageFinance));
  } catch (error) {
    const configurationError = configurationErrorResponse(error);
    if (configurationError) return configurationError;
    return NextResponse.json({ error: "Шинэчлэхэд алдаа гарлаа" }, { status: 500 });
  }
}
