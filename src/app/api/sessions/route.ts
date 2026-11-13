import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getSessions } from "@/lib/session-data";
import {
  validateSessionDraft,
  slotsOnDate,
  isScheduleDate,
} from "@/lib/schedules";

function failure(error: unknown) {
  console.error("Class request failed", error);
  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "Ангийн мэдээлэл боловсруулахад алдаа гарлаа.",
    },
    { status: 400 },
  );
}

export async function GET(request: Request) {
  try {
    const date = new URL(request.url).searchParams.get("date");
    if (date && !isScheduleDate(date))
      throw new Error("Огноог зөв оруулна уу.");
    const sessions = await getSessions();
    return NextResponse.json(
      date
        ? sessions.filter((session) => slotsOnDate(session, date).length > 0)
        : sessions,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error("Ангийн мэдээллийг шалгана уу.");
    const draft = validateSessionDraft(body);
    const requestId = body.requestId || randomUUID();
    if (
      typeof requestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        requestId,
      )
    )
      throw new Error("Хүсэлтийн мэдээллийг шалгана уу.");
    const id = `s_${requestId}`;
    const { error } = await getSupabaseAdmin().rpc("save_training_session", {
      p_id: id,
      p_payload: draft,
      p_create: true,
    });
    if (error) {
      console.error(
        "Class create transaction failed",
        error.code,
        error.message,
      );
      throw new Error(
        error.code === "P0001"
          ? error.message
          : "Анги үүсгэхэд алдаа гарлаа. Сонгосон сурагчдын мэдээллийг шалгана уу.",
      );
    }
    return NextResponse.json((await getSessions(id))[0], { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body.sessionId !== "string" || !body.sessionId)
      throw new Error("sessionId шаардлагатай.");
    const client = getSupabaseAdmin();
    if (body.title !== undefined || body.timeSlots !== undefined) {
      const current = (await getSessions(body.sessionId))[0];
      if (!current) throw new Error("Анги олдсонгүй.");
      const draft = validateSessionDraft({ ...current, ...body });
      const { error } = await client.rpc("save_training_session", {
        p_id: body.sessionId,
        p_payload: draft,
        p_create: false,
      });
      if (error) {
        console.error(
          "Class update transaction failed",
          error.code,
          error.message,
        );
        throw new Error(
          error.code === "P0001"
            ? error.message
            : "Ангийн мэдээллийг хадгалахад алдаа гарлаа.",
        );
      }
    } else {
      if (
        body.enrolledMemberIds !== undefined &&
        (!Array.isArray(body.enrolledMemberIds) ||
          body.enrolledMemberIds.some(
            (id: unknown) => typeof id !== "string" || !id,
          ))
      )
        throw new Error("Сурагчийн сонголтыг шалгана уу.");
      if (
        body.enrolledMemberIds === undefined &&
        (typeof body.memberId !== "string" ||
          !["ENROLL", "UNENROLL"].includes(body.action))
      )
        throw new Error("Сурагчийн сонголтыг шалгана уу.");
      const { error } = await client.rpc("set_session_enrollment", {
        p_id: body.sessionId,
        p_student_id: body.memberId || null,
        p_action: body.action || null,
        p_member_ids: body.enrolledMemberIds ?? null,
      });
      if (error)
        throw new Error(
          error.code === "P0001"
            ? error.message
            : "Сурагчийн хуваарилалтыг хадгалахад алдаа гарлаа.",
        );
    }
    return NextResponse.json((await getSessions(body.sessionId))[0]);
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new Error("ID шаардлагатай.");
    const { error } = await getSupabaseAdmin().rpc("delete_training_session", {
      p_id: id,
    });
    if (error) throw new Error("Анги устгахад алдаа гарлаа.");
    return NextResponse.json({ success: true });
  } catch (error) {
    return failure(error);
  }
}
