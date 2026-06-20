import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event_id");

  let query = supabaseServer.from("participants").select("*").order("registered_at", { ascending: true });

  if (eventId) {
    query = query.eq("event_id", eventId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { event_id, name, email, phone, faculty, major } = body;

  if (!event_id || !name) {
    return NextResponse.json({ error: "event_id and name are required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("participants")
    .insert({
      event_id,
      name,
      email: email || null,
      phone: phone || null,
      faculty: faculty || null,
      major: major || null,
      attended: false,
      certificate_sent: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
