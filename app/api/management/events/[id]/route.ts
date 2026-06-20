import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const [eventRes, teamRes] = await Promise.all([
    supabaseServer.from("events").select("*").eq("id", id).single(),
    supabaseServer.from("event_team").select("*").eq("event_id", id),
  ]);

  if (eventRes.error || !eventRes.data) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...eventRes.data,
    team: teamRes.data || [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await req.json();

  const { data, error } = await supabaseServer
    .from("events")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const { error } = await supabaseServer.from("events").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
