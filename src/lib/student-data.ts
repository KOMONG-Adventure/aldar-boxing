import "server-only";
import { randomUUID } from "node:crypto";
import { getDbData, type AppData, type Member } from "./db";
import { fromStudentRow, toStudentRow, type StudentRow } from "./student-fields";
import { getSupabaseAdmin, STUDENT_PHOTOS_BUCKET } from "./supabase/server";
import { getPayments, toPaymentHistory } from "./payment-data";
import { getSessions } from "./session-data";

type Snapshot = { rows: Map<string, StudentRow>; avatars: Map<string, string> };
const snapshots = new WeakMap<AppData, Snapshot>();

export async function getStudentAppData(): Promise<AppData> {
  const local = getDbData();
  const client = getSupabaseAdmin();
  const rows: StudentRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("students").select("*")
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(offset, offset + 499);
    if (error) throw new Error(`Сурагчдын бүртгэл татахад алдаа: ${error.message}`);
    rows.push(...(data as StudentRow[]));
    if (data.length < 500) break;
  }
  const avatars = new Map<string, string>();
  const paths = rows.map(row => row.avatar_path).filter((path): path is string => !!path);
  for (let i = 0; i < paths.length; i += 100) {
    const { data, error } = await client.storage.from(STUDENT_PHOTOS_BUCKET)
      .createSignedUrls(paths.slice(i, i + 100), 3600);
    if (error) throw new Error(`Сурагчийн зураг дуудах боломжгүй: ${error.message}`);
    for (const image of data) {
      if (image.error || !image.path || !image.signedUrl) throw new Error("Сурагчийн зураг олдсонгүй.");
      avatars.set(image.path, image.signedUrl);
    }
  }
  local.members = rows.map(row => fromStudentRow(row, avatars.get(row.avatar_path || "")));
  const [payments, sessions] = await Promise.all([getPayments(), getSessions()]);
  local.sessions = sessions;
  const historyByStudent = new Map<string, NonNullable<Member["paymentHistory"]>>();
  for (const payment of payments) {
    if (!payment.student_id) continue;
    const history = historyByStudent.get(payment.student_id) || [];
    history.push(toPaymentHistory(payment));
    historyByStudent.set(payment.student_id, history);
  }
  for (const member of local.members) {
    member.paymentHistory = historyByStudent.get(member.id) || [];
    member.assignedSessionIds = sessions.filter(session => session.enrolledMemberIds.includes(member.id)).map(session => session.id);
  }
  snapshots.set(local, {
    rows: new Map(rows.map(row => [row.id, row])),
    avatars: new Map(local.members.map(member => [member.id, member.avatarUrl || ""])),
  });
  return local;
}

export async function saveStudentAppData(data: AppData, registrationOnly = false): Promise<void> {
  if (!registrationOnly) {
    throw new Error("Энэ хэсгийн хадгалалт дараагийн үе шатанд холбогдоно.");
  }
  const snapshot = snapshots.get(data);
  if (!snapshot) throw new Error("Сурагчдын өгөгдлийг хадгалахын өмнө дахин татна уу.");
  const client = getSupabaseAdmin();
  const bucket = client.storage.from(STUDENT_PHOTOS_BUCKET);
  for (const member of data.members) {
    const before = snapshot.rows.get(member.id);
    let avatarPath = before?.avatar_path || null;
    let uploadedPath: string | null = null;
    if (member.avatarUrl !== snapshot.avatars.get(member.id)) {
      if (member.avatarUrl?.startsWith("data:")) {
        const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(member.avatarUrl);
        if (!match || match[2].length > 7_000_000) throw new Error("Зургийн формат эсвэл хэмжээ буруу байна.");
        const image = Buffer.from(match[2], "base64");
        const valid = match[1] === "jpeg" ? image.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
          : match[1] === "png" ? image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : image.toString("ascii", 0, 4) === "RIFF" && image.toString("ascii", 8, 12) === "WEBP";
        if (!valid || image.length > 5 * 1024 * 1024) throw new Error("5 МБ хүртэлх JPG, PNG эсвэл WebP зураг сонгоно уу.");
        uploadedPath = `${encodeURIComponent(member.id)}/${randomUUID()}.${match[1] === "jpeg" ? "jpg" : match[1]}`;
        const { error } = await bucket.upload(uploadedPath, image, { contentType: `image/${match[1]}`, upsert: false });
        if (error) throw new Error(`Зураг хадгалах боломжгүй: ${error.message}`);
        avatarPath = uploadedPath;
      } else if (!member.avatarUrl) {
        avatarPath = null;
      } else if (before) {
        throw new Error("Зураг файл сонгон оруулна уу.");
      }
      // Legacy generated cartoon URLs are replaced by the UI's initials placeholder.
    }
    const row = toStudentRow(member, avatarPath);
    const changes = Object.fromEntries(Object.entries(row).filter(([key, value]) =>
      key !== "id" && key !== "created_at" && JSON.stringify(value) !== JSON.stringify(before?.[key])));
    if (before && Object.keys(changes).length === 0) continue;
    const result = before
      ? await client.from("students").update({ ...changes, updated_at: new Date().toISOString() }).eq("id", member.id).select("id").single()
      : await client.from("students").insert(row).select("id").single();
    if (result.error) {
      if (uploadedPath) await bucket.remove([uploadedPath]);
      throw new Error(`Сурагчийн бүртгэл хадгалах боломжгүй: ${result.error.message}`);
    }
    if (before?.avatar_path && before.avatar_path !== avatarPath) {
      const { error } = await bucket.remove([before.avatar_path]);
      if (error) console.error("Old student photo cleanup failed", error.message);
    }
    if (avatarPath) {
      const { data: signed, error } = await bucket.createSignedUrl(avatarPath, 3600);
      if (error) throw new Error("Зураг хадгалагдсан ч холбоос үүсгэхэд алдаа гарлаа.");
      member.avatarUrl = signed.signedUrl;
    } else member.avatarUrl = "";
  }
  const ids = new Set(data.members.map(member => member.id));
  for (const [id, row] of snapshot.rows) {
    if (ids.has(id)) continue;
    const { error } = await client.rpc("delete_student_registration", { p_student_id: id });
    if (error) throw new Error(`Сурагч устгах боломжгүй: ${error.message}`);
    if (row.avatar_path) {
      const { error: photoError } = await bucket.remove([row.avatar_path]);
      if (photoError) console.error("Deleted student photo cleanup failed", photoError.message);
    }
  }
}

export function saveMemberRegistration(data: AppData) {
  return saveStudentAppData(data, true);
}

export async function createPublicRegistration(member: Member) {
  const data = getDbData();
  data.members = [member];
  snapshots.set(data, { rows: new Map(), avatars: new Map() });
  await saveMemberRegistration(data);
}
