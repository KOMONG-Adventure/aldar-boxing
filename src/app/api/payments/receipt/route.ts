import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { teacherAccess } from "@/lib/teacher-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const bucket = "payment-receipts";
const maxBytes = 4 * 1024 * 1024;

function receiptId(request: Request) {
  const id = new URL(request.url).searchParams.get("paymentId") || "";
  return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id) ? id.toLowerCase() : null;
}

function imageType(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return ["image/png", "png"] as const;
  if (bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return ["image/jpeg", "jpg"] as const;
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return ["image/webp", "webp"] as const;
  return null;
}

export async function GET(request: Request) {
  const denied = await teacherAccess(request, true);
  if (denied) return denied;
  const id = receiptId(request);
  if (!id) return NextResponse.json({ error: "Төлбөрийн дугаар буруу байна." }, { status: 400 });
  const client = getSupabaseAdmin();
  const { data, error } = await client.from("payments").select("receipt_path").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Баримт дуудахад алдаа гарлаа." }, { status: 503 });
  if (!data?.receipt_path) return NextResponse.json({ error: "Баримтын зураг олдсонгүй." }, { status: 404 });
  const image = await client.storage.from(bucket).download(data.receipt_path);
  if (image.error) return NextResponse.json({ error: "Баримтын зураг дуудахад алдаа гарлаа." }, { status: 503 });
  const bytes = Buffer.from(await image.data.arrayBuffer());
  const type = imageType(bytes);
  if (!type) return NextResponse.json({ error: "Зургийн формат буруу байна." }, { status: 415 });
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": type[0], "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function POST(request: Request) {
  const denied = await teacherAccess(request, true);
  if (denied) return denied;
  const id = receiptId(request);
  if (!id) return NextResponse.json({ error: "Төлбөрийн дугаар буруу байна." }, { status: 400 });
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("receipt");
  } catch {
    return NextResponse.json({ error: "Зургаа файл хэлбэрээр оруулна уу." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0 || file.size > maxBytes) {
    return NextResponse.json({ error: "4 МБ хүртэлх зураг сонгоно уу." }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = imageType(bytes);
  if (!type || file.type !== type[0]) return NextResponse.json({ error: "PNG, JPG эсвэл WebP зураг сонгоно уу." }, { status: 415 });
  const client = getSupabaseAdmin();
  const { data: payment, error } = await client.from("payments").select("receipt_path").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "Төлбөр дуудахад алдаа гарлаа." }, { status: 503 });
  if (!payment) return NextResponse.json({ error: "Төлбөр олдсонгүй." }, { status: 404 });

  const storage = client.storage.from(bucket);
  const path = `${id}/${randomUUID()}.${type[1]}`;
  const uploaded = await storage.upload(path, bytes, { contentType: type[0], upsert: false });
  if (uploaded.error) return NextResponse.json({ error: "Зураг хадгалахад алдаа гарлаа." }, { status: 503 });
  const update = client.from("payments").update({ receipt_path: path }).eq("id", id);
  const { data: saved, error: saveError } = await (
    payment.receipt_path ? update.eq("receipt_path", payment.receipt_path) : update.is("receipt_path", null)
  ).select("id").maybeSingle();
  if (saveError || !saved) {
    // An ambiguous database failure could have committed the reference.
    if (!saveError) await storage.remove([path]);
    return NextResponse.json({ error: "Баримт холбогдсон эсэхийг шинэчлээд шалгана уу." }, { status: saveError ? 503 : 409 });
  }
  if (payment.receipt_path) {
    const cleanup = await storage.remove([payment.receipt_path]);
    if (cleanup.error) console.warn("Previous payment receipt cleanup failed", id);
  }
  return NextResponse.json({ success: true });
}
