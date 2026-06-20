import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("event_id");

  let query = supabaseServer.from("tasks").select("*").order("created_at", { ascending: true });

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
  const { event_id, title, category, pic, deadline, status, notes, link } = body;

  if (!event_id || !title) {
    return NextResponse.json({ error: "event_id and title are required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("tasks")
    .insert({
      event_id,
      title,
      category: category || "acara",
      pic: pic || null,
      deadline: deadline || null,
      status: status || "todo",
      notes: notes || null,
      link: link || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
