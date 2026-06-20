import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event_id");

  let query = supabaseServer.from("contacts").select("*").order("created_at", { ascending: false });

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
  const { name, organization, unit, contact_info, instagram, gender, major, status, notes, event_id } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("contacts")
    .insert({
      name,
      organization: organization || null,
      unit: unit || null,
      contact_info: contact_info || null,
      instagram: instagram || null,
      gender: gender || null,
      major: major || null,
      status: status || "belum_dihubungi",
      notes: notes || null,
      event_id: event_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
