import { NextResponse } from 'next/server';
import { getDbData, saveDbData, AppNotification } from '@/lib/db';

export async function GET() {
  const data = getDbData();
  return NextResponse.json({
    notifications: data.notifications,
    settings: data.settings
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, settings } = body;
    const data = getDbData();

    if (action === 'mark_all_read') {
      data.notifications.forEach(n => n.read = true);
    } else if (action === 'read' && id) {
      const target = data.notifications.find(n => n.id === id);
      if (target) target.read = true;
    } else if (action === 'update_settings' && settings) {
      data.settings = { ...data.settings, ...settings };
    }

    saveDbData(data);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: "Алдаа гарлаа" }, { status: 500 });
  }
}
