import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const event_id = req.nextUrl.searchParams.get("event_id");
  if (!event_id) return NextResponse.json({ error: "event_id required" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("evaluations")
    .select("*")
    .eq("event_id", event_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.event_id) return NextResponse.json({ error: "event_id required" }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("evaluations")
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
